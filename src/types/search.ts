// Interface pour les résultats de recherche de vols
export interface FlightSearchResult {
  origin: string;
  destination: string;
  date?: string;
  options: Array<{
    id?: string;
    airline: string;
    price: string;
    departureTime?: string;
    arrivalTime?: string;
    duration?: string;
    flightNumber?: string;
    stops?: number;
    link?: string;
    layovers?: Array<{
      airport: string;
      duration?: string;
    }>;
    flightType?: string;
    flightDetails?: Array<{
      airline: string;
      flightNumber?: string;
      departureAirport: string;
      departureTime: string;
      arrivalAirport: string;
      arrivalTime: string;
      duration?: string;
    }>;
  }>;
  bestOption?: {
    airline: string;
    price: string;
    id?: string;
  };
}

// Interface pour les résultats de recherche d'hôtels
export interface HotelSearchResult {
  location: string;
  dates?: {
    checkIn: string;
    checkOut: string;
  };
  options: Array<{
    id?: string;
    name: string;
    price: string;
    rating?: string;
    amenities?: string[];
    address?: string;
    imageUrl?: string;
    link?: string;
  }>;
  bestOption?: {
    name: string;
    price: string;
    rating?: string;
    id?: string;
  };
}

// Interface pour les résultats de recherche de restaurants
export interface RestaurantSearchResult {
  location: string;
  cuisine?: string;
  options: Array<{
    name: string;
    priceRange?: string;
    rating?: string;
    cuisine?: string;
    address?: string;
    openingHours?: string;
    phoneNumber?: string;
    website?: string;
    link?: string;
  }>;
  bestOption?: {
    name: string;
    rating?: string;
    priceRange?: string;
  };
}

// Type union pour les résultats de recherche
export type SearchResult = FlightSearchResult | HotelSearchResult | RestaurantSearchResult; 