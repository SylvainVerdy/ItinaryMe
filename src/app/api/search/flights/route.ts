import { NextRequest, NextResponse } from 'next/server';
import { searchFlights } from '@/services/duffel-flights';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');
  const departureDate = searchParams.get('departureDate');
  const returnDate = searchParams.get('returnDate') ?? undefined;
  const adults = searchParams.get('adults') ?? '1';
  const cabinClass = (searchParams.get('cabinClass') ?? 'economy') as 'economy' | 'business' | 'first' | 'premium_economy';

  if (!origin || !destination || !departureDate) {
    return NextResponse.json(
      { error: 'origin, destination and departureDate are required' },
      { status: 400 },
    );
  }

  try {
    const offers = await searchFlights({
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departureDate,
      returnDate,
      adults: parseInt(adults),
      cabinClass,
    });
    return NextResponse.json(offers);
  } catch (err) {
    console.error('Flight search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
