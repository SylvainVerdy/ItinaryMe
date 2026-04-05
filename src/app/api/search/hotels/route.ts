import { NextRequest, NextResponse } from 'next/server';
import { searchStays } from '@/services/duffel-stays';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const checkInDate = searchParams.get('checkInDate');
  const checkOutDate = searchParams.get('checkOutDate');
  const guests = searchParams.get('guests') ?? '1';

  if (!lat || !lng || !checkInDate || !checkOutDate) {
    return NextResponse.json(
      { error: 'lat, lng, checkInDate and checkOutDate are required' },
      { status: 400 },
    );
  }

  try {
    const offers = await searchStays({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      checkInDate,
      checkOutDate,
      guests: parseInt(guests),
    });
    return NextResponse.json(offers);
  } catch (err) {
    console.error('Stay search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
