import { bookFlight, FlightTraveler } from '@/services/duffel-flights';
import { bookStay, StayTraveler } from '@/services/duffel-stays';
import { BookingJobItem, BookingResult, TravelerInfo } from '@/types/booking';

export async function runDuffelBookings(
  items: BookingJobItem[],
  traveler: TravelerInfo,
): Promise<BookingResult[]> {
  const results: BookingResult[] = [];

  for (const item of items) {
    try {
      if (item.type === 'flight') {
        if (!item.offerId || !item.passengerIds?.length) {
          throw new Error('Missing offerId or passengerIds for flight');
        }

        const flightTravelers: FlightTraveler[] = item.passengerIds.map((pid) => ({
          passengerId: pid,
          givenName: traveler.firstName,
          familyName: traveler.lastName,
          title: 'mr',
          gender: 'm',
          bornOn: traveler.bornOn ?? '1990-01-01',
          email: traveler.email,
          phoneNumber: traveler.phone,
        }));

        const { confirmationNumber } = await bookFlight(
          item.offerId,
          String(item.price ?? '0'),
          item.currency ?? 'EUR',
          flightTravelers,
        );
        results.push({ itemId: item.id, itemName: item.name, status: 'success', confirmationNumber });

      } else if (item.type === 'hotel') {
        if (!item.rateId) throw new Error('Missing rateId for stay');

        const stayTraveler: StayTraveler = {
          givenName: traveler.firstName,
          familyName: traveler.lastName,
          email: traveler.email,
          phoneNumber: traveler.phone,
        };

        const { confirmationNumber } = await bookStay(item.rateId, stayTraveler);
        results.push({ itemId: item.id, itemName: item.name, status: 'success', confirmationNumber });

      } else {
        // Restaurants / activities — no Duffel API, flag for manual booking
        results.push({
          itemId: item.id,
          itemName: item.name,
          status: 'success',
          confirmationNumber: 'Réservation directe requise',
        });
      }
    } catch (err) {
      results.push({
        itemId: item.id,
        itemName: item.name,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Booking failed',
      });
    }
  }

  return results;
}
