/**
 * Represents a destination with a name and a location.
 */
export interface Destination {
  /**
   * The name of the destination.
   */
  name: string;
  /**
   * The latitude of the location.
   */
  lat: number;
  /**
   * The longitude of the location.
   */
  lng: number;
}

/**
 * Represents travel information, including destination, dates and price.
 */
export interface Travel {
  /**
   * The destination of the trip.
   */
  destination: string;
  /**
   * The start date of the trip.
   */
  startDate: string;
    /**
   * The end date of the trip.
   */
  endDate: string;
    /**
   * The price of the travel in USD.
   */
  price: number;
}

/**
 * Asynchronously retrieves travel information for a given location.
 *
 * @param destination The destination for which to retrieve travel data.
 * @param startDate The start date of the trip.
 * @param endDate The end date of the trip.
 * @returns A promise that resolves to a list of Travels.
 */
export async function getTravels(destination: string, startDate: string, endDate: string): Promise<Travel[]> {
  // TODO: Implement this by calling an API.

  return [{
    destination: 'Chicago',
    startDate: '2024-03-15',
    endDate: '2024-03-22',
    price: 600
  },{
    destination: 'New York',
    startDate: '2024-04-01',
    endDate: '2024-04-08',
    price: 800
  }];
}
