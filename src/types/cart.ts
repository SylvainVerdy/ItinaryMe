export type CartItemType = 'hotel' | 'flight' | 'restaurant' | 'activity';

export interface CartItem {
  id: string;
  type: CartItemType;
  name: string;
  price: number;
  currency: string;
  location: string;
  sourceUrl?: string;  // kept for non-Amadeus items
  tripId: string;
  // Duffel booking data (stored at add-to-cart time)
  offerId?: string;        // Duffel flight offer ID
  passengerIds?: string[]; // Duffel offer request passenger IDs (flights)
  rateId?: string;         // Duffel stay rate ID (hotels)
  image?: string;
  // Hotel-specific
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  // Flight-specific
  departureDate?: string;
  returnDate?: string;
  origin?: string;
  destination?: string;
  // Restaurant / activity
  date?: string;
  time?: string;
}

export interface CartState {
  items: CartItem[];
  tripId: string | null;
}
