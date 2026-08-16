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
  flight: 'bg-cyan-50 text-cyan-700',
  hotel: 'bg-teal-50 text-teal-700',
  restaurant: 'bg-orange-50 text-orange-700',
  visit: 'bg-emerald-50 text-emerald-700',
  transport: 'bg-amber-50 text-amber-700',
  activity: 'bg-rose-50 text-rose-700',
  other: 'bg-slate-100 text-slate-600',
};
