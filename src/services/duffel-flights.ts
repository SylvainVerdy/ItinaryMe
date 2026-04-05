import duffel from '@/lib/duffel';

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
}

export interface FlightOffer {
  offerId: string;
  offerRequestId: string;
  passengerIds: string[];
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  returnDepartureAt?: string;
  price: number;
  currency: string;
  airline: string;
  airlineCode: string | null;
  duration: string;
  stops: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawOffer: any;
}

export interface FlightTraveler {
  passengerId: string;
  givenName: string;
  familyName: string;
  title: 'mr' | 'mrs' | 'ms' | 'miss';
  gender: 'm' | 'f';
  bornOn: string;
  email: string;
  phoneNumber: string;
}

export async function searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slices: any[] = [
    { origin: params.origin, destination: params.destination, departure_date: params.departureDate },
  ];
  if (params.returnDate) {
    slices.push({ origin: params.destination, destination: params.origin, departure_date: params.returnDate });
  }

  const offerRequest = await duffel.offerRequests.create({
    slices,
    passengers: Array.from({ length: params.adults }, () => ({ type: 'adult' as const })),
    cabin_class: params.cabinClass ?? 'economy',
    return_offers: true,
  });

  const passengerIds = offerRequest.data.passengers.map((p) => p.id);
  const offerRequestId = offerRequest.data.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const offers: any[] = offerRequest.data.offers ?? [];

  return offers.slice(0, 10).map((offer) => {
    const outbound = offer.slices[0];
    const firstSeg = outbound.segments[0];
    const lastSeg = outbound.segments[outbound.segments.length - 1];
    const returnSlice = offer.slices[1];

    return {
      offerId: offer.id,
      offerRequestId,
      passengerIds,
      origin: firstSeg.origin.iata_code,
      destination: lastSeg.destination.iata_code,
      departureAt: firstSeg.departing_at,
      arrivalAt: lastSeg.arriving_at,
      returnDepartureAt: returnSlice?.segments[0]?.departing_at,
      price: parseFloat(offer.total_amount),
      currency: offer.total_currency,
      airline: offer.owner.name,
      airlineCode: offer.owner.iata_code ?? null,
      duration: outbound.duration,
      stops: outbound.segments.length - 1,
      rawOffer: offer,
    };
  });
}

export async function bookFlight(
  offerId: string,
  totalAmount: string,
  currency: string,
  travelers: FlightTraveler[],
): Promise<{ confirmationNumber: string; orderId: string }> {
  const order = await duffel.orders.create({
    selected_offers: [offerId],
    passengers: travelers.map((t) => ({
      id: t.passengerId,
      given_name: t.givenName,
      family_name: t.familyName,
      title: t.title,
      gender: t.gender,
      born_on: t.bornOn,
      email: t.email,
      phone_number: t.phoneNumber,
    })),
    payments: [{ type: 'balance', amount: totalAmount, currency }],
    type: 'instant',
  });

  return {
    confirmationNumber: order.data.booking_reference,
    orderId: order.data.id,
  };
}
