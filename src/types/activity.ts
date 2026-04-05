export type ActivityCategory =
  | 'flight'
  | 'hotel'
  | 'restaurant'
  | 'visit'
  | 'transport'
  | 'activity'
  | 'other';

export type ActivityStatus = 'planned' | 'booked' | 'done' | 'cancelled';

export interface Activity {
  id: string;
  tripId: string;
  title: string;
  date: string;       // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  category: ActivityCategory;
  location?: string;
  notes?: string;
  price?: number;
  currency?: string;
  status: ActivityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityInput {
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  category: ActivityCategory;
  location?: string;
  notes?: string;
  price?: number;
  currency?: string;
  status: ActivityStatus;
}

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  flight: 'Vol',
  hotel: 'Hébergement',
  restaurant: 'Restaurant',
  visit: 'Visite',
  transport: 'Transport',
  activity: 'Activité',
  other: 'Autre',
};

export const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  flight: 'bg-blue-100 text-blue-700',
  hotel: 'bg-purple-100 text-purple-700',
  restaurant: 'bg-orange-100 text-orange-700',
  visit: 'bg-green-100 text-green-700',
  transport: 'bg-yellow-100 text-yellow-700',
  activity: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-600',
};
