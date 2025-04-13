// Types pour les notes
export interface Note {
  id?: string;
  userId: string;
  tripId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  isImportant?: boolean;
}

// Types pour les voyages
export interface Trip {
  id?: string;
  userId: string;
  destination: string;
  startDate: string;
  endDate: string;
  numPeople: number;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
} 