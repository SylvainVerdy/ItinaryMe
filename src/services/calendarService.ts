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
  }
}; 