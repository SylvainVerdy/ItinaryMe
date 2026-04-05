/**
 * Web tools for the AI agent.
 * Primary : SerpAPI (serpapi.com) — Google Search + Google Maps
 * Fallback : Jina AI (free, no key required)
 */

export interface WebSource { title: string; url: string }
export interface WebResult  { text: string; sources: WebSource[] }

const SERPAPI_BASE    = 'https://serpapi.com/search';
const DEFAULT_TIMEOUT = 20_000;

async function fetchWithTimeout(url: string, options: RequestInit = {}, ms = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function serpapiUrl(params: Record<string, string>): string {
  const key = process.env.SERPAPI_KEY;
  if (!key) throw new Error('SERPAPI_KEY not set');
  const p = new URLSearchParams({ ...params, api_key: key });
  return `${SERPAPI_BASE}?${p.toString()}`;
}

/** Search the web using SerpAPI (Google) or Jina fallback */
export async function webSearch(query: string): Promise<WebResult> {
  if (process.env.SERPAPI_KEY) {
    try {
      console.log(`[WEB SEARCH] SerpAPI → "${query}"`);
      const res = await fetchWithTimeout(serpapiUrl({ engine: 'google', q: query, hl: 'fr', num: '6' }));
      if (res.ok) {
        const data = await res.json();
        const organic = (data.organic_results ?? []).slice(0, 6) as Array<{ title: string; link: string; snippet: string }>;
        if (organic.length) {
          console.log(`[WEB SEARCH] SerpAPI OK → ${organic.length} résultats`);
          const sources: WebSource[] = organic.map((r) => ({ title: r.title, url: r.link }));
          const text = organic.map((r) => `**${r.title}**\n${r.link}\n${r.snippet}`).join('\n\n');
          return { text, sources };
        }
      }
    } catch (e) {
      console.warn(`[WEB SEARCH] SerpAPI error: ${(e as Error).message}`);
    }
  }

  // Fallback: Jina
  try {
    console.log(`[WEB SEARCH] Jina fallback → "${query}"`);
    const res = await fetchWithTimeout(
      `https://s.jina.ai/${encodeURIComponent(query)}`,
      { headers: { Accept: 'text/plain' } },
    );
    if (res.ok) {
      const text = await res.text();
      console.log(`[WEB SEARCH] Jina OK → ${text.length} chars`);
      return { text: text.slice(0, 4000) || 'Aucun résultat.', sources: [] };
    }
  } catch (e) {
    console.warn(`[WEB SEARCH] Jina error: ${(e as Error).message}`);
  }

  return { text: `Impossible d'effectuer la recherche pour: "${query}".`, sources: [] };
}

/**
 * Search restaurants/places using SerpAPI Google Maps engine.
 */
export async function searchRestaurants(city: string, query: string, maxResults = 5): Promise<WebResult> {
  const fullQuery = `${query} ${city}`;

  if (process.env.SERPAPI_KEY) {
    // 1. Google Maps local results
    try {
      console.log(`[RESTAURANTS] SerpAPI Maps → "${fullQuery}"`);
      const res = await fetchWithTimeout(
        serpapiUrl({ engine: 'google_maps', q: fullQuery, type: 'search', hl: 'fr' })
      );
      if (res.ok) {
        const data = await res.json();
        const places = (data.local_results ?? []).slice(0, maxResults) as Array<{
          title: string; address?: string; rating?: number; reviews?: number;
          type?: string; price?: string; phone?: string; website?: string;
        }>;
        if (places.length) {
          console.log(`[RESTAURANTS] SerpAPI Maps OK → ${places.length} établissements`);
          const sources: WebSource[] = places
            .filter((p) => p.website)
            .map((p) => ({ title: p.title, url: p.website! }));
          const text = places.map((p, i) => {
            const lines = [`${i + 1}. **${p.title}**`];
            if (p.address) lines.push(`   📍 ${p.address}`);
            if (p.rating)  lines.push(`   ⭐ ${p.rating}/5 (${p.reviews ?? '?'} avis)`);
            if (p.type)    lines.push(`   🏷️ ${p.type}`);
            if (p.price)   lines.push(`   💰 ${p.price}`);
            if (p.phone)   lines.push(`   📞 ${p.phone}`);
            if (p.website) lines.push(`   🔗 ${p.website}`);
            return lines.join('\n');
          }).join('\n\n');
          return { text, sources };
        }
      }
    } catch (e) {
      console.warn(`[RESTAURANTS] SerpAPI Maps error: ${(e as Error).message}`);
    }

    // 2. Google organic fallback
    try {
      console.log(`[RESTAURANTS] SerpAPI Search fallback → "${fullQuery}"`);
      const res = await fetchWithTimeout(
        serpapiUrl({ engine: 'google', q: `meilleurs restaurants ${fullQuery}`, hl: 'fr', num: String(maxResults) })
      );
      if (res.ok) {
        const data = await res.json();
        const organic = (data.organic_results ?? []).slice(0, maxResults) as Array<{ title: string; link: string; snippet: string }>;
        if (organic.length) {
          console.log(`[RESTAURANTS] SerpAPI Search OK → ${organic.length} résultats`);
          const sources: WebSource[] = organic.map((r) => ({ title: r.title, url: r.link }));
          const text = organic.map((r) => `**${r.title}**\n${r.link}\n${r.snippet}`).join('\n\n');
          return { text, sources };
        }
      }
    } catch (e) {
      console.warn(`[RESTAURANTS] SerpAPI Search error: ${(e as Error).message}`);
    }
  }

  // 3. Jina fallback
  try {
    console.log(`[RESTAURANTS] Jina fallback → "${fullQuery}"`);
    const res = await fetchWithTimeout(
      `https://s.jina.ai/${encodeURIComponent(`meilleurs restaurants ${fullQuery}`)}`,
      { headers: { Accept: 'text/plain' } },
    );
    if (res.ok) {
      const text = await res.text();
      return { text: text.slice(0, 3000) || 'Aucun résultat.', sources: [] };
    }
  } catch (e) {
    console.warn(`[RESTAURANTS] Jina error: ${(e as Error).message}`);
  }

  return { text: `Aucun résultat pour "${fullQuery}".`, sources: [] };
}

/** Search real flights via SerpAPI Google Flights engine */
export async function searchFlightsSerpApi(
  originIata: string,
  destinationIata: string,
  departureDate: string,
  returnDate?: string,
  adults = 1,
): Promise<WebResult> {
  if (!process.env.SERPAPI_KEY) return { text: 'SERPAPI_KEY manquante.', sources: [] };

  try {
    // type=1 round-trip (needs return_date), type=2 one-way
    const isRoundTrip = !!(returnDate && returnDate !== departureDate);
    console.log(`[FLIGHTS] SerpAPI → ${originIata}→${destinationIata} ${departureDate}${isRoundTrip ? ` retour ${returnDate}` : ' aller simple'}`);

    const params: Record<string, string> = {
      engine: 'google_flights',
      departure_id: originIata,
      arrival_id: destinationIata,
      outbound_date: departureDate,
      type: isRoundTrip ? '1' : '2',
      currency: 'EUR',
      hl: 'fr',
      adults: String(adults),
    };
    if (isRoundTrip && returnDate) params.return_date = returnDate;

    const res = await fetchWithTimeout(serpapiUrl(params));
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[FLIGHTS] SerpAPI ${res.status}: ${errBody.slice(0, 300)}`);
      throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 100)}`);
    }
    const data = await res.json();

    const allFlights = [
      ...(data.best_flights ?? []),
      ...(data.other_flights ?? []),
    ] as Array<{
      flights: Array<{
        departure_airport: { id: string; name: string; time: string };
        arrival_airport: { id: string; name: string; time: string };
        airline: string;
        duration: number;
        airplane?: string;
      }>;
      total_duration: number;
      price?: number;
      booking_token?: string;
      type?: string;
    }>;

    if (!allFlights.length) return { text: 'Aucun vol trouvé.', sources: [] };

    const lines: string[] = [];
    const sources: WebSource[] = [];

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:9000';

    allFlights.slice(0, 5).forEach((f, i) => {
      const first = f.flights[0];
      const last  = f.flights[f.flights.length - 1];
      const stops = f.flights.length - 1;
      const price = f.price ? `${f.price} €` : 'prix non disponible';
      const dur   = f.total_duration
        ? `${Math.floor(f.total_duration / 60)}h${String(f.total_duration % 60).padStart(2, '0')}`
        : '';

      // Internal token kept in text for agent context (stripped before display)
      const tokenNote = f.booking_token
        ? `\n   [booking_token: ${f.booking_token}]`
        : '';

      lines.push(
        `${i + 1}. **${first.airline}** · ${first.departure_airport.id} → ${last.arrival_airport.id}` +
        `\n   🕐 Départ: ${first.departure_airport.time} · Arrivée: ${last.arrival_airport.time}` +
        `\n   ⏱ ${dur} · ${stops === 0 ? 'Direct' : `${stops} escale${stops > 1 ? 's' : ''}`}` +
        `\n   💶 ${price}` +
        tokenNote
      );

      // Booking redirect link via our proxy
      if (f.booking_token) {
        sources.push({
          title: `Réserver · Vol ${i + 1} · ${first.airline} · ${price}`,
          url: `${baseUrl}/api/flight-redirect?token=${encodeURIComponent(f.booking_token)}&from=${originIata}&to=${destinationIata}&date=${departureDate}${returnDate ? `&return=${returnDate}` : ''}`,
        });
      }
    });

    sources.push({
      title: `Tous les vols · ${originIata} → ${destinationIata}`,
      url: `https://www.google.com/travel/flights?q=vols+${originIata}+${destinationIata}`,
    });

    console.log(`[FLIGHTS] SerpAPI OK → ${allFlights.length} vols`);
    return { text: lines.join('\n\n'), sources };
  } catch (e) {
    console.warn(`[FLIGHTS] SerpAPI error: ${(e as Error).message}`);
    return { text: `Erreur recherche vols: ${(e as Error).message}`, sources: [] };
  }
}

/**
 * Get booking options for a specific flight using its booking_token.
 * Returns direct booking URLs per vendor (airline, OTA, etc.)
 */
export async function getFlightBookingOptions(bookingToken: string, departureId = '', arrivalId = '', outboundDate = '', returnDate = ''): Promise<WebResult> {
  if (!process.env.SERPAPI_KEY) return { text: 'SERPAPI_KEY manquante.', sources: [] };

  try {
    console.log(`[BOOKING] SerpAPI booking options → ${departureId}→${arrivalId} ${outboundDate}, token=${bookingToken.slice(0, 20)}...`);
    const bookingUrl = `${SERPAPI_BASE}?engine=google_flights&hl=fr&currency=EUR`
      + `&departure_id=${departureId}&arrival_id=${arrivalId}`
      + `&outbound_date=${outboundDate}`
      + (returnDate ? `&return_date=${returnDate}&type=1` : `&type=2`)
      + `&api_key=${process.env.SERPAPI_KEY}`
      + `&booking_token=${encodeURIComponent(bookingToken)}`;
    const res = await fetchWithTimeout(bookingUrl);
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[BOOKING] SerpAPI ${res.status}: ${errBody.slice(0, 300)}`);
      throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 100)}`);
    }
    const data = await res.json();

    const options = (data.booking_options ?? []) as Array<{
      book_with: string;
      price: number;
      option_title?: string;
      extensions?: string[][];
      booking_request?: { url: string; post_data?: string };
    }>;

    if (!options.length) return { text: 'Aucune option de réservation trouvée.', sources: [] };

    const lines: string[] = ['**Options de réservation :**\n'];
    const sources: WebSource[] = [];

    options.forEach((opt, i) => {
      const price = opt.price ? `${opt.price} €` : '';
      const cabin = opt.option_title ?? '';
      const url   = opt.booking_request?.url ?? '';

      lines.push(
        `${i + 1}. **${opt.book_with}** · ${price}${cabin ? ` · ${cabin}` : ''}` +
        (url ? `\n   🔗 ${url}` : '')
      );
      if (url) sources.push({ title: `${opt.book_with} · ${price}`, url });
    });

    console.log(`[BOOKING] OK → ${options.length} options`);
    return { text: lines.join('\n'), sources };
  } catch (e) {
    console.warn(`[BOOKING] error: ${(e as Error).message}`);
    return { text: `Erreur options de réservation: ${(e as Error).message}`, sources: [] };
  }
}

/** Search real hotels via SerpAPI Google Hotels engine */
export async function searchHotelsSerpApi(
  city: string,
  checkIn: string,
  checkOut: string,
  adults = 1,
): Promise<WebResult> {
  if (!process.env.SERPAPI_KEY) return { text: 'SERPAPI_KEY manquante.', sources: [] };

  try {
    console.log(`[HOTELS] SerpAPI Google Hotels → ${city} (${checkIn} → ${checkOut})`);
    const res = await fetchWithTimeout(serpapiUrl({
      engine: 'google_hotels',
      q: `hôtels ${city}`,
      check_in_date: checkIn,
      check_out_date: checkOut,
      adults: String(adults),
      currency: 'EUR',
      hl: 'fr',
    }));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const properties = (data.properties ?? []).slice(0, 6) as Array<{
      name: string;
      description?: string;
      link?: string;
      rate_per_night?: { lowest?: string };
      total_rate?: { lowest?: string };
      overall_rating?: number;
      reviews?: number;
      stars?: number;
      amenities?: string[];
      images?: Array<{ thumbnail: string }>;
    }>;

    if (!properties.length) return { text: 'Aucun hôtel trouvé.', sources: [] };

    const lines: string[] = [];
    const sources: WebSource[] = [];

    properties.forEach((h, i) => {
      const price   = h.rate_per_night?.lowest ?? h.total_rate?.lowest ?? 'prix non disponible';
      const bookUrl = h.link ?? `https://www.google.com/travel/hotels?q=${encodeURIComponent(h.name + ' ' + city)}`;
      lines.push(
        `${i + 1}. **${h.name}**` +
        (h.stars ? `\n   ${'⭐'.repeat(Math.min(h.stars, 5))}` : '') +
        (h.overall_rating ? `\n   ⭐ ${h.overall_rating}/5 (${h.reviews ?? '?'} avis)` : '') +
        `\n   💶 Dès ${price}/nuit` +
        (h.description ? `\n   ${h.description.slice(0, 100)}…` : '') +
        `\n   🔗 Réserver : ${bookUrl}`
      );
      sources.push({ title: `${h.name} · ${price}/nuit`, url: bookUrl });
    });

    sources.push({
      title: `Google Hotels · ${city}`,
      url: `https://www.google.com/travel/hotels?q=${encodeURIComponent(`hôtels ${city}`)}&checkin=${checkIn}&checkout=${checkOut}`,
    });

    console.log(`[HOTELS] SerpAPI OK → ${properties.length} hôtels`);
    return { text: lines.join('\n\n'), sources };
  } catch (e) {
    console.warn(`[HOTELS] SerpAPI error: ${(e as Error).message}`);
    return { text: `Erreur recherche hôtels: ${(e as Error).message}`, sources: [] };
  }
}

/** Fetch the content of a URL and return clean text (Jina Reader) */
export async function fetchPageText(url: string): Promise<string> {
  try {
    console.log(`[FETCH PAGE] Jina Reader → ${url}`);
    const res = await fetchWithTimeout(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'text/plain' },
    });
    if (res.ok) {
      const text = await res.text();
      console.log(`[FETCH PAGE] OK → ${text.length} chars`);
      return text.slice(0, 5000);
    }
  } catch (e) {
    console.warn(`[FETCH PAGE] Jina error: ${(e as Error).message}`);
  }

  // Fallback: raw HTML strip
  try {
    const res = await fetchWithTimeout(url, {}, 10_000);
    if (res.ok) {
      const html = await res.text();
      const stripped = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return stripped.slice(0, 4000);
    }
  } catch { /* ignore */ }

  return `Impossible de lire la page: ${url}`;
}
