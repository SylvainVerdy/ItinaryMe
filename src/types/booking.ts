export type BookingStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface BookingJobItem {
  id: string;
  name: string;
  type: string;
  price?: number;
  currency?: string;
  // Duffel flights
  offerId?: string;
  passengerIds?: string[];
  // Duffel stays
  rateId?: string;
  // Legacy fallback
  sourceUrl?: string;
}

export interface BookingResult {
  itemId: string;
  itemName: string;
  status: 'success' | 'failed' | 'pending';
  confirmationNumber?: string;
  error?: string;
}

export interface BookingJob {
  id?: string;
  stripeSessionId: string;
  tripId: string;
  items: BookingJobItem[];
  status: BookingStatus;
  results: BookingResult[];
  createdAt: string;
  updatedAt: string;
}

export interface TravelerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;   // E.164 e.g. +33612345678
  bornOn?: string; // YYYY-MM-DD
}

export interface CardInfo {
  number: string;
  expiryMonth: number;
  expiryYear: number;
  holderName: string;
  cvv: string;
}
