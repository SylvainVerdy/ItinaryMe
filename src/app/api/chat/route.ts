import { NextRequest, NextResponse } from 'next/server';
import { resolvePlace } from '@/services/duffel-places';
import { webSearch, fetchPageText, searchRestaurants, searchFlightsSerpApi, searchHotelsSerpApi, getFlightBookingOptions, findBookingUrl, searchActivities, WebSource } from '@/lib/web-tools';
import { searchFlights } from '@/services/duffel-flights';
import { searchStays } from '@/services/duffel-stays';
import { ChatCard, TripContext } from '@/types/chat-message';

export const maxDuration = 180;

const OLLAMA_BASE  = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL    ?? 'qwen3.5:9b';

// ─── Logging helpers ──────────────────────────────────────────────────────────

function logToolCall(name: string, args: Record<string, unknown>) {
  console.log(`\n[TOOL CALL] ▶ ${name}`);
  console.log('[TOOL ARGS]', JSON.stringify(args, null, 2));
}

function logToolResult(name: string, text: string, hasCard: boolean) {
  const preview = text.length > 200 ? text.slice(0, 200) + '…' : text;
  console.log(`[TOOL RESULT] ◀ ${name} | card=${hasCard} | ${preview}\n`);
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for general information, events, weather, tips, etc.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_page',
      description: 'Read the content of a web page by URL.',
      parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_restaurants',
      description: 'Search for restaurants, bars, cafés or food spots in a city or neighbourhood.',
      parameters: {
        type: 'object',
        properties: {
          city:        { type: 'string', description: 'City name' },
          query:       { type: 'string', description: 'Type of restaurant or cuisine, e.g. "sushi Shinjuku", "rooftop bar"' },
          max_results: { type: 'number', description: 'Max results to return (default 5)' },
        },
        required: ['city', 'query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_booking_options',
      description: 'Get direct booking links for a specific flight using its booking_token. Call this when the user wants to book a specific flight from a previous search.',
      parameters: {
        type: 'object',
        properties: {
          booking_token:  { type: 'string', description: 'The booking_token from the flight search result' },
          departure_id:   { type: 'string', description: 'Origin airport IATA code (e.g. CDG)' },
          arrival_id:     { type: 'string', description: 'Destination airport IATA code (e.g. NCE)' },
          outbound_date:  { type: 'string', description: 'Departure date YYYY-MM-DD' },
          return_date:    { type: 'string', description: 'Return date YYYY-MM-DD (optional)' },
        },
        required: ['booking_token', 'departure_id', 'arrival_id', 'outbound_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_flights',
      description: 'Search available flights between two cities using the Duffel API. City names must be given in English or as an IATA code (e.g. "London" or "LON", not "Londres").',
      parameters: {
        type: 'object',
        properties: {
          origin_city:      { type: 'string' },
          destination_city: { type: 'string' },
          departure_date:   { type: 'string', description: 'YYYY-MM-DD' },
          return_date:      { type: 'string', description: 'YYYY-MM-DD, optional for round-trip' },
          adults:           { type: 'number' },
          cabin_class:      { type: 'string', description: 'economy | premium_economy | business | first (default economy)' },
        },
        required: ['origin_city', 'destination_city', 'departure_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_booking_url',
      description: 'Find a direct online booking / reservation URL for a specific restaurant, hotel, or activity. Use this when the user wants to book or reserve a specific place.',
      parameters: {
        type: 'object',
        properties: {
          place_name:  { type: 'string',  description: 'Exact name of the restaurant, hotel, or place to book' },
          city:        { type: 'string',  description: 'City where the place is located' },
          type:        { type: 'string',  description: '"restaurant" | "hotel" | "activity" (default: "restaurant")' },
          date:        { type: 'string',  description: 'Desired reservation date YYYY-MM-DD (optional)' },
          time:        { type: 'string',  description: 'Desired reservation time HH:MM (optional)' },
          party_size:  { type: 'number',  description: 'Number of people (optional)' },
        },
        required: ['place_name', 'city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_activities',
      description: 'Search bookable tours, excursions and activities in a city (GetYourGuide, Viator, Tiqets…). Use for "que faire", "visiter", "excursion", "billet pour un musée".',
      parameters: {
        type: 'object',
        properties: {
          city:        { type: 'string', description: 'City name' },
          query:       { type: 'string', description: 'Type of activity, e.g. "visite guidée Colisée", "excursion bateau"' },
          max_results: { type: 'number', description: 'Max results (default 6)' },
        },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_hotels',
      description: 'Search available hotels in a city using the Duffel API. City name must be given in English or as an IATA code (e.g. "London" or "LON", not "Londres").',
      parameters: {
        type: 'object',
        properties: {
          city:      { type: 'string' },
          check_in:  { type: 'string', description: 'YYYY-MM-DD' },
          check_out: { type: 'string', description: 'YYYY-MM-DD' },
          guests:    { type: 'number' },
          rooms:     { type: 'number', description: 'Number of rooms (default 1)' },
        },
        required: ['city', 'check_in', 'check_out'],
      },
    },
  },
];

/**
 * Capacités proposées à l'utilisateur dans l'interface de chat.
 * Une capacité regroupe un ou plusieurs outils : l'UI raisonne en « chercher
 * sur internet », pas en `web_search` + `fetch_page`.
 */
export const CAPABILITIES: Record<string, string[]> = {
  web:         ['web_search', 'fetch_page'],
  flights:     ['search_flights', 'get_booking_options'],
  hotels:      ['search_hotels'],
  restaurants: ['search_restaurants'],
  activities:  ['search_activities'],
  booking:     ['find_booking_url'],
};

/** Noms d'outils autorisés pour un ensemble de capacités actives. */
function toolNamesFor(capabilities: string[]): Set<string> {
  const names = new Set<string>();
  for (const cap of capabilities) {
    for (const tool of CAPABILITIES[cap] ?? []) names.add(tool);
  }
  return names;
}

// ─── Tool execution ──────────────────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, unknown>, ctx: TripContext) {
  logToolCall(name, args);

  let result: { text: string; card: ChatCard | undefined; sources?: WebSource[] };

  switch (name) {
    case 'web_search': {
      const { text, sources } = await webSearch(String(args.query ?? ''));
      result = { text, card: undefined, sources };
      break;
    }

    case 'fetch_page': {
      const text = await fetchPageText(String(args.url ?? ''));
      result = { text, card: undefined };
      break;
    }

    case 'get_booking_options': {
      const { text, sources } = await getFlightBookingOptions(
        String(args.booking_token ?? ''),
        String(args.departure_id ?? ''),
        String(args.arrival_id ?? ''),
        String(args.outbound_date ?? ''),
        args.return_date ? String(args.return_date) : '',
      );
      result = { text, card: undefined, sources };
      break;
    }

    case 'find_booking_url': {
      const { text, sources } = await findBookingUrl(
        String(args.place_name ?? ''),
        String(args.city ?? ctx.destination),
        String(args.type ?? 'restaurant'),
        args.date ? String(args.date) : undefined,
        args.party_size ? Number(args.party_size) : undefined,
      );
      result = { text, card: undefined, sources };
      break;
    }

    case 'search_restaurants': {
      const city  = String(args.city ?? ctx.destination);
      const query = String(args.query ?? 'restaurant');
      const max   = Number(args.max_results ?? 5);
      const { text, sources } = await searchRestaurants(city, query, max);
      result = { text, card: undefined, sources };
      break;
    }

    case 'search_flights': {
      const originQuery      = args.origin_city ? String(args.origin_city) : '';
      const destinationQuery = String(args.destination_city ?? ctx.destination ?? '');

      // Pas de ville de départ inventée : sans origine, on le dit plutôt que
      // de chercher depuis une ville arbitraire.
      if (!originQuery) {
        result = {
          text: "Ville de départ manquante. Demande à l'utilisateur d'où il part avant de rechercher des vols.",
          card: undefined,
        };
        break;
      }

      const [o, d] = await Promise.all([
        resolvePlace(originQuery),
        resolvePlace(destinationQuery),
      ]);
      if (!o || !d) {
        const unknown = [!o && originQuery, !d && destinationQuery].filter(Boolean).join(', ');
        result = { text: `Ville non reconnue : ${unknown}. Demande une précision à l'utilisateur.`, card: undefined };
        break;
      }

      const departureDate = String(args.departure_date ?? ctx.startDate);
      const returnDate    = args.return_date ? String(args.return_date) : undefined;
      const adults        = Number(args.adults ?? ctx.travelers ?? 1);

      // 1) Duffel en premier : ce sont les seules offres réservables (elles
      //    portent un offerId, indispensable au panier puis à /api/automate-bookings).
      try {
        const offers = await searchFlights({
          origin: o.iata,
          destination: d.iata,
          departureDate,
          returnDate,
          adults,
        });

        if (offers.length > 0) {
          const top = offers.slice(0, 5);
          const lines = top.map((f) =>
            `- ${f.airline} ${f.origin}→${f.destination}, départ ${f.departureAt}, ${f.stops === 0 ? 'direct' : `${f.stops} escale(s)`}, ${f.price} ${f.currency}`,
          );
          result = {
            text: `${top.length} vol(s) réservable(s) trouvé(s) via Duffel :\n${lines.join('\n')}\n\nIls sont affichés à l'utilisateur sous forme de cartes avec un bouton « Ajouter au panier ». Résume-les brièvement sans réinventer les prix.`,
            card: { type: 'flights', results: top },
          };
          break;
        }
        console.log('[TOOL] search_flights: Duffel sans résultat, repli SerpAPI');
      } catch (err) {
        console.error('[TOOL] search_flights: Duffel a échoué, repli SerpAPI:', err);
      }

      // 2) Repli SerpAPI : informatif uniquement (liens, non réservable).
      const { text, sources } = await searchFlightsSerpApi(
        o.iata, d.iata,
        departureDate,
        returnDate,
        adults,
      );
      result = { text, card: undefined, sources };
      break;
    }

    case 'search_activities': {
      const city  = String(args.city ?? ctx.destination ?? '');
      const query = String(args.query ?? 'activités à faire');
      const max   = Number(args.max_results ?? 6);
      const { text, sources, offers } = await searchActivities(city, query, max);
      result = {
        text,
        card: offers.length ? { type: 'activities', results: offers } : undefined,
        sources,
      };
      break;
    }

    case 'search_hotels': {
      const city    = String(args.city ?? ctx.destination ?? '');
      const info    = city ? await resolvePlace(city) : null;
      const checkIn = String(args.check_in ?? ctx.startDate);
      const checkOut = String(args.check_out ?? ctx.endDate);
      const guests  = Number(args.guests ?? ctx.travelers ?? 1);

      // 1) Duffel Stays : offres réservables (rateId → panier → réservation).
      if (info) {
        try {
          const offers = await searchStays({
            latitude: info.lat,
            longitude: info.lng,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            guests,
            // Les coordonnées renvoyées par Places correspondent à l'aéroport
            // (Rome → Fiumicino, ~30 km du centre). Le rayon par défaut de 5 km
            // ne ramènerait que des hôtels d'aéroport.
            radiusKm: 25,
          });

          if (offers.length > 0) {
            const top = offers.slice(0, 6);
            const lines = top.map((h) =>
              `- ${h.hotelName}${h.starRating ? ` ${h.starRating}★` : ''}, ${h.roomName}, ${h.nights} nuit(s), ${h.price} ${h.currency}`,
            );
            result = {
              text: `${top.length} hôtel(s) réservable(s) trouvé(s) via Duffel à ${city} :\n${lines.join('\n')}\n\nIls sont affichés à l'utilisateur sous forme de cartes avec un bouton « Ajouter au panier ». Résume-les brièvement sans réinventer les prix.`,
              card: { type: 'hotels', results: top },
            };
            break;
          }
          console.log('[TOOL] search_hotels: Duffel sans résultat, repli SerpAPI');
        } catch (err) {
          console.error('[TOOL] search_hotels: Duffel a échoué, repli SerpAPI:', err);
        }
      }

      // 2) Repli SerpAPI : informatif uniquement (liens, non réservable).
      const { text, sources } = await searchHotelsSerpApi(
        city,
        checkIn,
        checkOut,
        guests,
      );
      result = { text, card: undefined, sources };
      break;
    }

    default:
      result = { text: `Tool inconnu: ${name}`, card: undefined };
  }

  logToolResult(name, result.text, !!result.card);
  return result;
}

// ─── Ollama call (non-streaming) ──────────────────────────────────────────────

interface OMsg {
  role: string;
  content: string;
  tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> | string } }>;
}

async function ollamaChat(messages: OMsg[], withTools: boolean, timeoutMs: number, tools = TOOLS): Promise<OMsg> {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  console.log(`[OLLAMA] → ${OLLAMA_MODEL} | tools=${withTools} | msgs=${messages.length}`);
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        ...(withTools && tools.length ? { tools } : {}),
        stream: false,
        options: { temperature: 0.6, num_predict: withTools ? 512 : 1024 },
      }),
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const data = await res.json();
    const msg  = data.message as OMsg;
    // Strip thinking tags
    msg.content = (msg.content ?? '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .trim();
    const toolNames = msg.tool_calls?.map((tc) => tc.function.name).join(', ') ?? 'none';
    console.log(`[OLLAMA] ← tool_calls=[${toolNames}] | content_len=${msg.content.length}`);
    return msg;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ─── Intent detection for forced tool calls ───────────────────────────────────

interface ForcedCall {
  name: string;
  args: Record<string, unknown>;
  label: string;
}

function detectForcedToolCall(userText: string, ctx: TripContext): ForcedCall {
  const dest     = ctx.destination;
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // Resolve relative date hints in user text
  const mentionsDemain   = /demain/i.test(userText);
  const mentionsAujourdhui = /aujourd.?hui|ce soir|ce matin/i.test(userText);
  const resolvedDate = mentionsDemain ? tomorrowStr : mentionsAujourdhui ? todayStr : (ctx.startDate || tomorrowStr);

  const isBooking    = /réserver|réservation|booking|book|reserver|table pour|une table|réserve/i.test(userText);
  const isRestaurant = /restaurant|sushi|ramen|pizza|manger|dîner|déjeuner|café|bar|cuisine|food|eat|drink|boire|nourriture|plat|gastronomie/i.test(userText);
  const isFlight     = /vol|flight|avion|billet|partir|décoll|aller à|voyager vers|trajet/i.test(userText);
  const isHotel      = /hôtel|hotel|hébergement|dormir|nuit|chambre|séjour|logement|airbnb/i.test(userText);

  // Extract place name hint from booking phrases like "réserver au {name}" or "réserver {name}"
  const bookingPlaceMatch = userText.match(
    /r[ée]server(?:\s+(?:au|à|chez|le|la|l['']\s*)?)?\s+([\w\s\-''"«»]+?)(?:\s+(?:à|pour|le|\d|$))/i
  );

  if (isBooking && (isRestaurant || bookingPlaceMatch)) {
    const placeName = bookingPlaceMatch?.[1]?.trim() || dest;
    return {
      name: 'find_booking_url',
      args: {
        place_name: placeName,
        city: dest || placeName,
        type: isHotel ? 'hotel' : 'restaurant',
        date: resolvedDate,
        party_size: ctx.travelers || 2,
      },
      label: `lien de réservation pour "${placeName}"`,
    };
  }

  const isActivity = /que faire|visiter|activit|excursion|mus[ée]e|billet pour|tour guid|visite/i.test(userText);
  if (isActivity && !isRestaurant) {
    const hint = userText.replace(/que faire|[àa]|le|la|les|de|du|des|pour|quoi/gi, '').trim().slice(0, 60);
    return {
      name: 'search_activities',
      args: { city: dest || hint, query: hint || 'activités à faire', max_results: 6 },
      label: `activités "${hint || dest}"`,
    };
  }

  if (isRestaurant) {
    const queryHint = userText.replace(/meilleur[s]?|restaurant[s]?|à|le|la|les|de|du|des|pour|avec/gi, '').trim().slice(0, 60);
    return {
      name: 'search_restaurants',
      args: { city: dest || queryHint, query: queryHint || 'restaurant', max_results: 5 },
      label: `restaurants "${queryHint || dest}"`,
    };
  }
  if (isFlight) {
    // L'origine était codée en dur sur Paris : « un billet pour Rome au départ
    // de Nice » cherchait donc Paris → Rome. On la lit dans la phrase, et on ne
    // retombe sur Paris que si aucune ville de départ n'est reconnue.
    const originMatch = userText.match(
      /(?:au d[ée]part de|d[ée]part de|depuis|en partant de|from)\s+([\p{L}\s\-']{2,30}?)(?:\s+(?:pour|vers|[àa]|le|demain|aujourd|$)|[,.?!]|$)/iu,
    );
    // On transmet la ville telle qu'elle est dite : c'est resolvePlace, côté
    // outil, qui décide si elle est valide. Aucune ville par défaut.
    const originCity = originMatch?.[1]?.trim() ?? '';

    // La destination peut aussi être citée alors qu'aucun voyage n'est ouvert.
    const destMatch = userText.match(
      /(?:pour|vers|[àa] destination de)\s+([\p{L}\s\-']{2,30}?)(?:\s+(?:au d[ée]part|depuis|le|demain|aujourd|pour|$)|[,.?!]|$)/iu,
    );
    const destinationCity = destMatch?.[1]?.trim() || dest || '';

    return {
      name: 'search_flights',
      args: {
        origin_city: originCity,
        destination_city: destinationCity,
        departure_date: resolvedDate,
        adults: ctx.travelers || 1,
      },
      label: `vols ${originCity || '?'} → ${destinationCity || '?'} (${resolvedDate})`,
    };
  }
  if (isHotel) {
    return {
      name: 'search_hotels',
      args: { city: dest, check_in: resolvedDate, check_out: ctx.endDate || tomorrowStr, guests: ctx.travelers || 1 },
      label: `hôtels à ${dest}`,
    };
  }
  // Generic fallback
  return {
    name: 'web_search',
    args: { query: `${userText} ${dest}` },
    label: `"${userText.slice(0, 40)}"`,
  };
}

// ─── Agentic loop ─────────────────────────────────────────────────────────────

async function runAgent(messages: OMsg[], ctx: TripContext, allowed: Set<string>) {
  const activeTools = TOOLS.filter((t) => allowed.has(t.function.name));
  const cards: ChatCard[]   = [];
  const steps: string[]     = [];
  const sources: WebSource[] = [];
  const MAX_ITER = 4;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`[AGENT] Start | destination=${ctx.destination} | ${ctx.startDate} → ${ctx.endDate} | ${ctx.travelers} pers.`);
  console.log(`[AGENT] User: ${messages[messages.length - 1]?.content?.slice(0, 120)}`);

  for (let i = 0; i < MAX_ITER; i++) {
    steps.push(i === 0 ? '🤔 Réflexion en cours...' : '🤔 Réflexion supplémentaire...');
    console.log(`\n[AGENT] Iteration ${i + 1}/${MAX_ITER}`);

    let msg: OMsg;
    try {
      msg = await ollamaChat(messages, true, 180_000, activeTools);
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      console.error(`[AGENT] Error: ${(err as Error).message}`);
      return {
        text: isAbort
          ? "La réflexion a dépassé 3 minutes. Essayez une question plus simple."
          : `Erreur Ollama: ${(err as Error).message}`,
        cards, steps, sources,
      };
    }

    // No tool calls on first iteration → force a tool call based on intent detection
    if (!msg.tool_calls?.length && i === 0) {
      const userText = messages[messages.length - 1]?.content?.toLowerCase() ?? '';
      const forcedCall = detectForcedToolCall(userText, ctx);

      // L'utilisateur a pu désactiver cette capacité : on ne force pas un outil
      // qu'il a explicitement coupé.
      if (!allowed.has(forcedCall.name)) {
        console.log(`[AGENT] Repli ${forcedCall.name} ignoré (capacité désactivée)`);
        break;
      }

      console.log(`[AGENT] No tool called on iter 1 → forcing: ${forcedCall.name}(${JSON.stringify(forcedCall.args)})`);
      steps.push(`⚡ Recherche automatique : ${forcedCall.label}`);

      const res = await executeTool(forcedCall.name, forcedCall.args, ctx);
      if (res.card) cards.push(res.card);
      if (res.sources?.length) {
        for (const s of res.sources) {
          if (!sources.find((x) => x.url === s.url)) sources.push(s);
        }
      }
      messages.push({ role: 'assistant', content: '', tool_calls: [{ function: { name: forcedCall.name, arguments: forcedCall.args } }] });
      messages.push({ role: 'tool', content: res.text });
      continue;
    }

    // No tool calls after first iteration → final answer
    if (!msg.tool_calls?.length) {
      console.log(`[AGENT] Done (no more tool calls) | response_len=${msg.content.length}`);
      console.log(`${'═'.repeat(60)}\n`);
      return { text: msg.content || 'Voici les résultats.', cards, steps, sources };
    }

    messages.push({ role: 'assistant', content: msg.content ?? '', tool_calls: msg.tool_calls });

    for (const tc of msg.tool_calls) {
      if (!allowed.has(tc.function.name)) {
        console.log(`[AGENT] tool_call ${tc.function.name} refusé (capacité désactivée)`);
        continue;
      }
      const name = tc.function.name;
      const args = typeof tc.function.arguments === 'string'
        ? JSON.parse(tc.function.arguments)
        : tc.function.arguments;

      const labels: Record<string, string> = {
        web_search:          `🔍 Recherche web : "${args.query ?? ''}"`,
        fetch_page:          `📄 Lecture d'une page web`,
        find_booking_url:    `🔗 Recherche du lien de réservation pour "${args.place_name ?? ''}" à ${args.city ?? ''}...`,
        search_restaurants:  `🍽️ Restaurants : "${args.query ?? ''}" à ${args.city ?? ''}`,
        search_flights:      `✈️ Vols ${args.origin_city ?? ''} → ${args.destination_city ?? ''} (${args.departure_date ?? ''})`,
        search_hotels:       `🏨 Hôtels à ${args.city ?? ''} (${args.check_in ?? ''} → ${args.check_out ?? ''})`,
        get_booking_options: `🎫 Récupération des options de réservation...`,
      };
      steps.push(labels[name] ?? `⚙️ ${name}`);

      const res = await executeTool(name, args as Record<string, unknown>, ctx);
      if (res.card) cards.push(res.card);
      if (res.sources?.length) {
        for (const s of res.sources) {
          if (!sources.find((x) => x.url === s.url)) sources.push(s);
        }
      }
      messages.push({ role: 'tool', content: res.text });
    }
  }

  // Synthesis call without tools
  steps.push('✍️ Rédaction de la réponse...');
  console.log(`[AGENT] Max iterations reached, synthesising...`);
  try {
    const final = await ollamaChat(messages, false, 180_000);
    console.log(`${'═'.repeat(60)}\n`);
    return { text: final.content || 'Voici les résultats.', cards, steps, sources };
  } catch {
    console.log(`${'═'.repeat(60)}\n`);
    return { text: 'Voici les résultats trouvés ci-dessus.', cards, steps, sources };
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  console.log('\n[CHAT API] ▶ POST /api/chat received');
  const { userMessage, tripContext, history = [], capabilities }: {
    userMessage: string;
    tripContext: TripContext;
    history: Array<{ role: string; text: string }>;
    /** Capacités cochées côté UI. Absent = tout activé (rétrocompatible). */
    capabilities?: string[];
  } = await req.json();

  const activeCapabilities = capabilities ?? Object.keys(CAPABILITIES);
  const allowedTools = toolNamesFor(activeCapabilities);
  console.log(`[CHAT API] capacités actives: ${activeCapabilities.join(', ') || 'aucune'}`);

  console.log(`[CHAT API] userMessage="${userMessage}" | destination=${tripContext?.destination}`);

  if (!userMessage?.trim()) {
    return NextResponse.json({ error: 'Message vide' }, { status: 400 });
  }

  // Inject current date so the model can resolve "tomorrow", "next week", etc.
  const now        = new Date();
  const today      = now.toISOString().slice(0, 10);
  const tomorrow   = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const dayName    = now.toLocaleDateString('fr-FR', { weekday: 'long' });
  const dateHeader = `Date du jour : ${today} (${dayName}). Demain : ${tomorrow}.`;

  const hasTrip = !!(tripContext?.destination);
  const systemPrompt = hasTrip
    ? `Tu es un assistant voyage expert pour un trip à ${tripContext.destination} (${tripContext.startDate} → ${tripContext.endDate}, ${tripContext.travelers} pers.).
${dateHeader}

RÈGLE ABSOLUE : Tu dois OBLIGATOIREMENT appeler au moins un outil avant de répondre à chaque message. Ne jamais répondre depuis ta mémoire interne.
- Demande de réservation d'un restaurant/lieu précis → appelle find_booking_url avec le nom exact du lieu
- Question sur restaurants / nourriture / bars → appelle search_restaurants
- Question sur vols / billets d'avion → appelle search_flights avec la bonne date déduite
- Question sur hôtels / hébergement → appelle search_hotels
- Toute autre question → appelle web_search

Pour find_booking_url : extrais le nom exact du lieu mentionné par l'utilisateur. Si la date est mentionnée, inclus-la.
Réponds en français, de manière concise et utile. Cite les résultats obtenus par les outils.`
    : `Tu es IA Voyageur, un assistant voyage intelligent.
${dateHeader}

RÈGLE ABSOLUE : Tu dois OBLIGATOIREMENT appeler au moins un outil avant de répondre à chaque message. Ne jamais répondre depuis ta mémoire interne.
- Demande de réservation d'un restaurant/lieu précis → appelle find_booking_url avec le nom exact du lieu
- Question sur restaurants / nourriture / bars → appelle search_restaurants
- Question sur vols / billets d'avion → appelle search_flights avec la bonne date déduite (ex: "demain" = ${tomorrow})
- Question sur hôtels / hébergement → appelle search_hotels
- Toute autre question sur destinations, météo, conseils, etc. → appelle web_search

Pour find_booking_url : extrais le nom exact du lieu mentionné par l'utilisateur. Si la date est mentionnée, inclus-la.
Réponds en français, de manière concise et utile. Cite les résultats obtenus par les outils.`;

  const ctx: TripContext = tripContext ?? {
    tripId: 'general',
    destination: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    travelers: 1,
  };

  const messages: OMsg[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    })),
    { role: 'user', content: userMessage },
  ];

  try {
    const { text, cards, steps, sources } = await runAgent(messages, ctx, allowedTools);
    // Strip internal booking tokens from displayed text — they stay in agent memory but not shown to user
    const cleanText = text.replace(/\n?\s*\[booking_token:[^\]]+\]/g, '').trim();
    return NextResponse.json({ text: cleanText, cards, steps, sources });
  } catch (err) {
    console.error('[CHAT API] Unhandled error:', err);
    return NextResponse.json(
      { text: `Erreur: ${(err as Error).message}`, cards: [], steps: [] },
      { status: 200 },
    );
  }
}
