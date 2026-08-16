import { FlightOffer } from '@/services/duffel-flights';
import { StayOffer } from '@/services/duffel-stays';
import { ActivityOffer } from '@/types/activity-offer';

export type ChatCardType = 'flights' | 'hotels' | 'activities';

export interface FlightsCard {
  type: 'flights';
  results: FlightOffer[];
}

export interface HotelsCard {
  type: 'hotels';
  results: StayOffer[];
}

export interface ActivitiesCard {
  type: 'activities';
  results: ActivityOffer[];
}

export type ChatCard = FlightsCard | HotelsCard | ActivitiesCard;

export interface WebSource {
  title: string;
  url: string;
}

export interface TripChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cards?: ChatCard[];
  steps?: string[];
  sources?: WebSource[];
  createdAt: Date;
}

export interface TripContext {
  tripId: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  travelers: number;
}

// Shape of the /api/chat response
export interface ChatApiResponse {
  text: string;
  cards?: ChatCard[];
  error?: string;
}
