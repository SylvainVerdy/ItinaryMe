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

// Types pour les messages de chat
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  webSearchUsed?: boolean;
  webSources?: Array<{ name: string; url: string }>;
  isLoading?: boolean;
  linkedToTrip?: boolean;
  travelId?: string;
  userId?: string;
  systemContextOnly?: boolean;
}

// Types pour les voyages
export interface Trip {
  id?: string;
  userId: string;
  destination: string;
  startDate: Date | string;
  endDate: Date | string;
  numPeople: number;
  createdAt: Date | string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: Note[] | string;
}

// Types pour les points sur la carte
export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  type?: 'activity' | 'transport' | 'accommodation' | 'food' | 'other' | 'visit';
  color?: string;
  day?: number | string;
  order?: number;
  hideOnMap?: boolean;
}

// Types pour les événements du calendrier
export interface TravelEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  description?: string;
  location?: string;
  color?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  noteId?: string;
  eventType?: 'activity' | 'transport' | 'accommodation' | 'food' | 'other' | 'visit';
  hideOnMap?: boolean;
  day?: number; // Jour de l'événement par rapport au début du voyage
}

// Types pour les documents de voyage dans le style Notion
export interface TravelDocument {
  id?: string;
  userId: string;
  tripId: string;
  title: string;
  content: DocumentContent;
  createdAt: string;
  updatedAt: string;
  coverImage?: string;
  icon?: string;
  tags?: string[];
  isPublic?: boolean;
  collaborators?: string[]; // IDs des utilisateurs collaborateurs
}

// Types des blocs de contenu pour TravelDocument
export type DocumentContent = DocumentBlock[];

export type DocumentBlockType = 
  | 'paragraph' 
  | 'heading1' 
  | 'heading2' 
  | 'heading3' 
  | 'bulletList' 
  | 'numberedList' 
  | 'todo' 
  | 'toggle' 
  | 'quote' 
  | 'divider'
  | 'image'
  | 'embed'
  | 'link'
  | 'callout'
  | 'table';

export interface DocumentBlock {
  id: string;
  type: DocumentBlockType;
  content: string;
  children?: DocumentBlock[];
  checked?: boolean; // Pour les todos
  url?: string; // Pour les images, embeds, liens
  backgroundColor?: string; // Pour les callouts
  textColor?: string;
  metadata?: Record<string, any>; // Métadonnées additionnelles
}

// Types pour l'historique des conversations
export interface ChatHistory {
  id?: string;
  userId: string;
  tripId?: string; // Si la conversation est liée à un voyage
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  isFavorite?: boolean;
}

// Types pour les itinéraires de voyage générés
export interface TravelItinerary {
  title?: string;
  description?: string;
  days?: TravelItineraryDay[];
  totalBudget?: string;
  recommendations?: string[];
  links?: Array<{ title: string; url: string }>;
}

export interface TravelItineraryDay {
  dayNumber?: number;
  day?: number;
  date?: string;
  activities?: TravelItineraryActivity[];
  accommodation?: {
    name?: string;
    cost?: string;
    location?: string;
  };
}

export interface TravelItineraryActivity {
  time?: string;
  description?: string;
  location?: string;
  cost?: string;
} 