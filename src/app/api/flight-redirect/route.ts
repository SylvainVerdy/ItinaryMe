import { NextRequest, NextResponse } from 'next/server';

const SERPAPI_BASE = 'https://serpapi.com/search';

/** Build a SerpAPI URL with the given params + API key, WITHOUT URLSearchParams (to avoid double-encoding the booking_token) */
function buildSerpUrl(base: Record<string, string>, bookingToken?: string): string {
  const key = process.env.SERPAPI_KEY ?? '';
  const qs = Object.entries(base)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  const tokenPart = bookingToken ? `&booking_token=${encodeURIComponent(bookingToken)}` : '';
  return `${SERPAPI_BASE}?${qs}&api_key=${encodeURIComponent(key)}${tokenPart}`;
}

/** Try to get booking options for a given token. Returns the best booking URL or null. */
async function getBookingUrl(token: string, from: string, to: string, date: string, returnDate: string): Promise<string | null> {
  const url = buildSerpUrl({
    engine: 'google_flights',
    hl: 'fr',
    currency: 'EUR',
    departure_id: from,
    arrival_id: to,
    outbound_date: date,
    ...(returnDate ? { return_date: returnDate, type: '1' } : { type: '2' }),
  }, token);

  console.log(`[FLIGHT REDIRECT] Trying booking_token (${token.length} chars) for ${from}→${to} ${date}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const rawBody = await res.text();

  if (!res.ok) {
    console.warn(`[FLIGHT REDIRECT] SerpAPI ${res.status}: ${rawBody.slice(0, 300)}`);
    return null;
  }

  let data: Record<string, unknown>;
  try { data = JSON.parse(rawBody); } catch { return null; }

  const topKeys = Object.keys(data);
  console.log(`[FLIGHT REDIRECT] SerpAPI keys: ${topKeys.join(', ')}`);

  const options = (data.booking_options ?? []) as Array<{
    book_with: string;
    price?: number;
    booking_request?: { url: string; post_data?: string };
  }>;

  console.log(`[FLIGHT REDIRECT] booking_options: ${options.length}`);

  if (!options.length) {
    console.warn(`[FLIGHT REDIRECT] Empty booking_options. Preview:\n${rawBody.slice(0, 800)}`);
    return null;
  }

  // Pick the cheapest option
  const best = options.reduce((a, b) => (a.price ?? Infinity) <= (b.price ?? Infinity) ? a : b);
  console.log(`[FLIGHT REDIRECT] Best option: ${best.book_with} · ${best.price ?? '?'}€`);
  return best.booking_request?.url ?? null;
}

/** Do a fresh flight search and return the first available booking_token */
async function getFreshToken(from: string, to: string, date: string, returnDate: string): Promise<string | null> {
  const url = buildSerpUrl({
    engine: 'google_flights',
    departure_id: from,
    arrival_id: to,
    outbound_date: date,
    type: returnDate ? '1' : '2',
    ...(returnDate ? { return_date: returnDate } : {}),
    currency: 'EUR',
    hl: 'fr',
    adults: '1',
  });

  console.log(`[FLIGHT REDIRECT] Fresh search ${from}→${to} ${date}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) { console.warn(`[FLIGHT REDIRECT] Fresh search failed: ${res.status}`); return null; }

  const data = await res.json().catch(() => null);
  if (!data) return null;

  const allFlights = [
    ...(data.best_flights ?? []),
    ...(data.other_flights ?? []),
  ] as Array<{ booking_token?: string }>;

  const first = allFlights.find((f) => f.booking_token);
  console.log(`[FLIGHT REDIRECT] Fresh search → ${allFlights.length} flights, first token: ${first?.booking_token ? 'yes' : 'no'}`);
  return first?.booking_token ?? null;
}

export async function GET(req: NextRequest) {
  const token      = req.nextUrl.searchParams.get('token') ?? '';
  const from       = req.nextUrl.searchParams.get('from') ?? '';
  const to         = req.nextUrl.searchParams.get('to') ?? '';
  const date       = req.nextUrl.searchParams.get('date') ?? '';
  const returnDate = req.nextUrl.searchParams.get('return') ?? '';

  if (!token) return new NextResponse('Missing token', { status: 400 });
  if (!process.env.SERPAPI_KEY) return new NextResponse('SERPAPI_KEY not configured', { status: 500 });

  // Fallback: Kayak deep-link — supports IATA codes + dates natively.
  // Format: kayak.fr/flights/NCE-CDG/2026-04-06  (one-way)
  //         kayak.fr/flights/NCE-CDG/2026-04-06/2026-04-10  (round-trip)
  const kayakPath = returnDate
    ? `https://www.kayak.fr/flights/${from}-${to}/${date}/${returnDate}`
    : `https://www.kayak.fr/flights/${from}-${to}/${date}`;
  const fallbackSearchUrl = (from && to && date) ? kayakPath : 'https://www.kayak.fr/flights';

  try {
    // 1. Try the stored token directly
    let bookingUrl = await getBookingUrl(token, from, to, date, returnDate);

    // 2. Token expired → fresh search to get a live token, then try again
    if (!bookingUrl && from && to && date) {
      console.log(`[FLIGHT REDIRECT] Token stale, trying fresh search…`);
      const freshToken = await getFreshToken(from, to, date, returnDate);
      if (freshToken) {
        bookingUrl = await getBookingUrl(freshToken, from, to, date, returnDate);
      }
    }

    if (!bookingUrl) {
      console.log(`[FLIGHT REDIRECT] All attempts failed → fallback search URL`);
      return NextResponse.redirect(fallbackSearchUrl, 302);
    }

    console.log(`[FLIGHT REDIRECT] ✓ Redirecting to: ${bookingUrl.slice(0, 100)}…`);
    return NextResponse.redirect(bookingUrl, 302);

  } catch (e) {
    console.error('[FLIGHT REDIRECT]', e);
    return NextResponse.redirect(fallbackSearchUrl, 302);
  }
}
