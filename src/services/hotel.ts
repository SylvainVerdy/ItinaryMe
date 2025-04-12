/**
 * Represents a geographical location with latitude and longitude coordinates.
 */
export interface Location {
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
 * Represents hotel information, including name, rating and price.
 */
export interface Hotel {
  /**
   * The name of the hotel.
   */
  name: string;
  /**
   * The hotel rating (e.g., 4 stars).
   */
  rating: number;
    /**
   * The price per night in USD.
   */
  price: number;
}

/**
 * Asynchronously retrieves hotel information for a given location.
 * @param location The location for which to retrieve hotel data.
 * @returns A promise that resolves to a list of Hotels.
 */
export async function getHotels(location: Location): Promise<Hotel[]> {
  // TODO: Implement this by calling an API.

  return [{
    name: 'Hyatt Regency Chicago',
    rating: 4,
    price: 170
  },{
    name: 'Thompson Hotel',
    rating: 5,
    price: 310
  }];
}
