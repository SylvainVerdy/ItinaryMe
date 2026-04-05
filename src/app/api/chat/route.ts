import { NextRequest, NextResponse } from 'next/server';
import { getCityInfo } from '@/lib/city-data';
import { webSearch, fetchPageText, searchRestaurants, searchFlightsSerpApi, searchHotelsSerpApi, getFlightBookingOptions, WebSource } from '@/lib/web-tools';
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
          booking_token: { type: 'string', description: 'The booking_token from the flight search result' },
        },
        required: ['booking_token'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_flights',
      description: 'Search available flights between two cities using the Duffel API.',
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
      name: 'search_hotels',
      description: 'Search available hotels in a city using the Duffel API.',
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
      const { text, sources } = await getFlightBookingOptions(String(args.booking_token ?? ''));
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
      const o = getCityInfo(String(args.origin_city ?? 'paris'));
      const d = getCityInfo(String(args.destination_city ?? ctx.destination));
      if (!o || !d) {
        result = { text: `Ville non reconnue (${args.origin_city} → ${args.destination_city}).`, card: undefined };
        break;
      }
      const { text, sources } = await searchFlightsSerpApi(
        o.iata, d.iata,
        String(args.departure_date ?? ctx.startDate),
        args.return_date ? String(args.return_date) : ctx.endDate,
        Number(args.adults ?? ctx.travelers),
      );
      result = { text, card: undefined, sources };
      break;
    }

    case 'search_hotels': {
      const city = String(args.city ?? ctx.destination);
      const { text, sources } = await searchHotelsSerpApi(
        city,
        String(args.check_in ?? ctx.startDate),
        String(args.check_out ?? ctx.endDate),
        Number(args.guests ?? ctx.travelers),
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

async function ollamaChat(messages: OMsg[], withTools: boolean, timeoutMs: number): Promise<OMsg> {
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
        ...(withTools ? { tools: TOOLS } : {}),
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
  const dest = ctx.destination;

  const isRestaurant = /restaurant|sushi|ramen|pizza|manger|dîner|déjeuner|café|bar|cuisine|food|eat|drink|boire|nourriture|plat|gastronomie/i.test(userText);
  const isFlight     = /vol|flight|avion|billet|partir|décoll|aller à|voyager vers|trajet/i.test(userText);
  const isHotel      = /hôtel|hotel|hébergement|dormir|nuit|chambre|séjour|logement|airbnb/i.test(userText);

  if (isRestaurant) {
    // Extract a cuisine/type hint from the user message
    const queryHint = userText.replace(/meilleur[s]?|restaurant[s]?|à|le|la|les|de|du|des|pour|avec/gi, '').trim().slice(0, 60);
    return {
      name: 'search_restaurants',
      args: { city: dest, query: queryHint || 'restaurant', max_results: 5 },
      label: `restaurants "${queryHint || dest}"`,
    };
  }
  if (isFlight) {
    return {
      name: 'search_flights',
      args: { origin_city: 'paris', destination_city: dest, departure_date: ctx.startDate, return_date: ctx.endDate, adults: ctx.travelers },
      label: `vols vers ${dest}`,
    };
  }
  if (isHotel) {
    return {
      name: 'search_hotels',
      args: { city: dest, check_in: ctx.startDate, check_out: ctx.endDate, guests: ctx.travelers },
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

async function runAgent(messages: OMsg[], ctx: TripContext) {
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
      msg = await ollamaChat(messages, true, 180_000);
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
      const name = tc.function.name;
      const args = typeof tc.function.arguments === 'string'
        ? JSON.parse(tc.function.arguments)
        : tc.function.arguments;

      const labels: Record<string, string> = {
        web_search:          `🔍 Recherche web : "${args.query ?? ''}"`,
        fetch_page:          `📄 Lecture d'une page web`,
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
  const { userMessage, tripContext, history = [] }: {
    userMessage: string;
    tripContext: TripContext;
    history: Array<{ role: string; text: string }>;
  } = await req.json();

  console.log(`[CHAT API] userMessage="${userMessage}" | destination=${tripContext?.destination}`);

  if (!userMessage?.trim()) {
    return NextResponse.json({ error: 'Message vide' }, { status: 400 });
  }

  const hasTrip = !!(tripContext?.destination);
  const systemPrompt = hasTrip
    ? `Tu es un assistant voyage expert pour un trip à ${tripContext.destination} (${tripContext.startDate} → ${tripContext.endDate}, ${tripContext.travelers} pers.).

RÈGLE ABSOLUE : Tu dois OBLIGATOIREMENT appeler au moins un outil avant de répondre à chaque message. Ne jamais répondre depuis ta mémoire interne.
- Question sur restaurants / nourriture / bars → appelle search_restaurants
- Question sur vols / billets d'avion → appelle search_flights
- Question sur hôtels / hébergement → appelle search_hotels
- Toute autre question → appelle web_search

Réponds en français, de manière concise et utile. Cite les résultats obtenus par les outils.`
    : `Tu es IA Voyageur, un assistant voyage intelligent.

RÈGLE ABSOLUE : Tu dois OBLIGATOIREMENT appeler au moins un outil avant de répondre à chaque message. Ne jamais répondre depuis ta mémoire interne.
- Question sur restaurants / nourriture / bars → appelle search_restaurants
- Question sur vols / billets d'avion → appelle search_flights
- Question sur hôtels / hébergement → appelle search_hotels
- Toute autre question sur destinations, météo, conseils, etc. → appelle web_search

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
    const { text, cards, steps, sources } = await runAgent(messages, ctx);
    return NextResponse.json({ text, cards, steps, sources });
  } catch (err) {
    console.error('[CHAT API] Unhandled error:', err);
    return NextResponse.json(
      { text: `Erreur: ${(err as Error).message}`, cards: [], steps: [] },
      { status: 200 },
    );
  }
}
