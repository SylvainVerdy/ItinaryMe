import duffel from '@/lib/duffel';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAccommodation = any;

export interface StaySearchParams {
  latitude: number;
  longitude: number;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  rooms?: number;
  radiusKm?: number;
}

export interface StayOffer {
  rateId: string;
  accommodationId: string;
  hotelName: string;
  address: string;
  starRating?: number;
  roomName: string;
  boardType: string;
  price: number;
  currency: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  refundable: boolean;
  photoUrl?: string;
}

export interface StayTraveler {
  givenName: string;
  familyName: string;
  email: string;
  phoneNumber: string;
}

export async function searchStays(params: StaySearchParams): Promise<StayOffer[]> {
  const searchResponse = await duffel.stays.search({
    check_in_date: params.checkInDate,
    check_out_date: params.checkOutDate,
    rooms: params.rooms ?? 1,
    guests: Array.from({ length: params.guests }, () => ({ type: 'adult' as const })),
    location: {
      radius: params.radiusKm ?? 5,
      geographic_coordinates: {
        latitude: params.latitude,
        longitude: params.longitude,
      },
    },
  });

  const nights =
    (new Date(params.checkOutDate).getTime() - new Date(params.checkInDate).getTime()) /
    86400000;

  const offers: StayOffer[] = [];
  const results = searchResponse.data.results ?? [];

  for (const result of results.slice(0, 5)) {
    // Fetch full rates for this search result
    const withRates = await duffel.stays.searchResults.fetchAllRates(result.id);
    const acc: AnyAccommodation = withRates.data.accommodation;
    const rooms: AnyAccommodation[] = acc.rooms ?? [];

    for (const room of rooms) {
      for (const rate of (room.rates ?? [])) {
        offers.push({
          rateId: rate.id,
          accommodationId: acc.id,
          hotelName: acc.name,
          address: acc.location?.address?.line_one ?? '',
          starRating: acc.ratings?.[0]?.value,
          roomName: room.name,
          boardType: rate.board_type,
          price: parseFloat(rate.total_amount),
          currency: rate.total_currency,
          checkInDate: params.checkInDate,
          checkOutDate: params.checkOutDate,
          nights,
          refundable: rate.cancellation_timeline.length > 0,
          photoUrl: acc.photos?.[0]?.url,
        });
      }
    }
  }

  return offers;
}

export async function bookStay(
  rateId: string,
  traveler: StayTraveler,
): Promise<{ confirmationNumber: string; bookingId: string }> {
  // Quote must be created right before booking — it expires quickly
  const quote = await duffel.stays.quotes.create(rateId);
  const quoteId = quote.data.id;

  const booking = await duffel.stays.bookings.create({
    quote_id: quoteId,
    email: traveler.email,
    phone_number: traveler.phoneNumber,
    guests: [{ given_name: traveler.givenName, family_name: traveler.familyName }],
  });

  return {
    confirmationNumber: booking.data.reference ?? booking.data.id,
    bookingId: booking.data.id,
  };
}
