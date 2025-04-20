import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export interface TravelEvent {
  id: string;
  tripId: string;
  title: string;
  start: Date | string;
  end: Date | string;
  allDay?: boolean;
  description?: string;
  location?: string;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
  // Intégration avec la carte
  coordinates?: {
    lat: number;
    lng: number;
  };
  // Lien avec les notes
  noteId?: string;
  // Type d'événement (visite, transport, hébergement, etc.)
  eventType?: 'visit' | 'transport' | 'accommodation' | 'food' | 'activity' | 'other';
}

// Convertir les dates du format de Firestore
const convertEvent = (event: any): TravelEvent => {
  return {
    ...event,
    start: event.start instanceof Date ? event.start : new Date(event.start),
    end: event.end instanceof Date ? event.end : new Date(event.end)
  };
};

// Convertir les dates pour Firestore
const prepareEventForFirestore = (event: Omit<TravelEvent, 'id' | 'tripId'> & { tripId: string }) => {
  return {
    ...event,
    start: event.start instanceof Date ? event.start.toISOString() : event.start,
    end: event.end instanceof Date ? event.end.toISOString() : event.end,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
};

export const calendarService = {
  // Récupérer tous les événements d'un voyage
  async getEventsForTrip(tripId: string): Promise<TravelEvent[]> {
    try {
      const eventsQuery = query(
        collection(db, 'travelEvents'), 
        where('tripId', '==', tripId)
      );
      
      const snapshot = await getDocs(eventsQuery);
      const events: TravelEvent[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        events.push(convertEvent({
          id: doc.id,
          ...data
        }));
      });
      
      return events;
    } catch (error) {
      console.error('Erreur lors de la récupération des événements:', error);
      return [];
    }
  },
  
  // Ajouter un nouvel événement
  async addEvent(tripId: string, event: Omit<TravelEvent, 'id' | 'tripId'>): Promise<string | null> {
    try {
      const eventData = prepareEventForFirestore({ ...event, tripId });
      const docRef = await addDoc(collection(db, 'travelEvents'), eventData);
      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'événement:', error);
      return null;
    }
  },
  
  // Mettre à jour un événement existant
  async updateEvent(event: TravelEvent): Promise<boolean> {
    try {
      const { id, ...eventData } = event;
      const updateData = {
        ...eventData,
        start: eventData.start instanceof Date ? eventData.start.toISOString() : eventData.start,
        end: eventData.end instanceof Date ? eventData.end.toISOString() : eventData.end,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'travelEvents', id), updateData);
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'événement:', error);
      return false;
    }
  },
  
  // Supprimer un événement
  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'travelEvents', eventId));
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'événement:', error);
      return false;
    }
  },

  // Lier un événement à une note
  async linkEventToNote(eventId: string, noteId: string): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'travelEvents', eventId), {
        noteId,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Erreur lors de la liaison de l\'événement à la note:', error);
      return false;
    }
  },

  // Récupérer les événements liés à une note
  async getEventsForNote(noteId: string): Promise<TravelEvent[]> {
    try {
      const eventsQuery = query(
        collection(db, 'travelEvents'), 
        where('noteId', '==', noteId)
      );
      
      const snapshot = await getDocs(eventsQuery);
      const events: TravelEvent[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        events.push(convertEvent({
          id: doc.id,
          ...data
        }));
      });
      
      return events;
    } catch (error) {
      console.error('Erreur lors de la récupération des événements pour la note:', error);
      return [];
    }
  },

  // Ajouter des coordonnées à un événement (pour la carte)
  async addCoordinatesToEvent(eventId: string, coordinates: {lat: number, lng: number}): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'travelEvents', eventId), {
        coordinates,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'ajout des coordonnées à l\'événement:', error);
      return false;
    }
  },

  // Générer un itinéraire journalier à partir des événements (pour la carte)
  generateDailyItinerary(events: TravelEvent[], date: Date): TravelEvent[] {
    // Filtrer les événements pour la date spécifique
    return events.filter(event => {
      const eventStart = new Date(event.start);
      return eventStart.getDate() === date.getDate() && 
             eventStart.getMonth() === date.getMonth() &&
             eventStart.getFullYear() === date.getFullYear();
    }).sort((a, b) => {
      const aStart = new Date(a.start).getTime();
      const bStart = new Date(b.start).getTime();
      return aStart - bStart;
    });
  }
}; 