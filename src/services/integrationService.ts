"use client";

import { db } from '@/lib/firebase';
import { collection, doc, updateDoc, getDoc, setDoc, arrayUnion, Timestamp, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { TravelEvent, MapPoint, Note } from '@/lib/types';
import { parse, isValid, isFuture } from 'date-fns';

// Interface pour stocker les liens entre différents éléments
export interface IntegrationItem {
  id?: string;
  tripId: string;
  sourceType: 'event' | 'mapPoint' | 'note';
  sourceId: string;
  targetType: 'event' | 'mapPoint' | 'note';
  targetId: string;
  createdAt: string;
}

class IntegrationService {
  private integrationCollection = "integrations";

  // Lier un événement du calendrier à un point sur la carte
  async linkEventToMapPoint(tripId: string, eventId: string, mapPointId: string): Promise<string | null> {
    try {
      // Créer un nouvel élément d'intégration
      const integrationData: IntegrationItem = {
        tripId,
        sourceType: 'event',
        sourceId: eventId,
        targetType: 'mapPoint',
        targetId: mapPointId,
        createdAt: new Date().toISOString()
      };

      // Ajouter l'élément à la collection d'intégrations
      const docRef = await addDoc(collection(db, this.integrationCollection), integrationData);
      console.log(`Événement ${eventId} lié au point de carte ${mapPointId}`);
      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de la liaison de l\'événement au point de carte:', error);
      return null;
    }
  }

  // Lier une note à un événement du calendrier
  async linkNoteToEvent(tripId: string, noteId: string, eventId: string): Promise<string | null> {
    try {
      // Créer un nouvel élément d'intégration
      const integrationData: IntegrationItem = {
        tripId,
        sourceType: 'note',
        sourceId: noteId,
        targetType: 'event',
        targetId: eventId,
        createdAt: new Date().toISOString()
      };

      // Ajouter l'élément à la collection d'intégrations
      const docRef = await addDoc(collection(db, this.integrationCollection), integrationData);
      console.log(`Note ${noteId} liée à l'événement ${eventId}`);
      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de la liaison de la note à l\'événement:', error);
      return null;
    }
  }

  // Récupérer toutes les intégrations pour un voyage spécifique
  async getAllIntegrationsForTrip(tripId: string): Promise<IntegrationItem[]> {
    try {
      const q = query(
        collection(db, this.integrationCollection),
        where("tripId", "==", tripId)
      );
      
      const querySnapshot = await getDocs(q);
      const integrations: IntegrationItem[] = [];
      
      querySnapshot.forEach((doc) => {
        integrations.push({
          id: doc.id,
          ...doc.data()
        } as IntegrationItem);
      });
      
      return integrations;
    } catch (error) {
      console.error('Erreur lors de la récupération des intégrations:', error);
      return [];
    }
  }
  
  // Extraire les points de la carte à partir des événements
  async extractMapPointsFromEvents(events: TravelEvent[]): Promise<MapPoint[]> {
    return events
      .filter(event => event.coordinates)
      .map(event => ({
        id: `event-${event.id}`,
        lat: event.coordinates!.lat,
        lng: event.coordinates!.lng,
        title: event.title,
        description: event.description || '',
        type: (event.eventType || 'activity') as 'activity' | 'transport' | 'accommodation' | 'food' | 'other',
        color: event.color,
        // Calculer le jour en fonction de la date de début
        day: new Date(event.start).getDate(),
        order: 0  // À définir en fonction de l'heure
      }));
  }

  // Synchroniser les événements du calendrier avec les points sur la carte
  async syncCalendarEventsWithMapPoints(tripId: string, events: TravelEvent[]): Promise<void> {
    try {
      // 1. Récupérer toutes les intégrations existantes pour ce voyage
      const existingIntegrations = await this.getAllIntegrationsForTrip(tripId);
      
      // 2. Filtrer les événements qui ont des coordonnées mais pas encore d'intégration
      const eventsWithCoordinates = events.filter(event => 
        event.coordinates && 
        !existingIntegrations.some(integration => 
          integration.sourceType === 'event' && integration.sourceId === event.id
        )
      );
      
      // 3. Créer des points sur la carte pour ces événements et les lier
      for (const event of eventsWithCoordinates) {
        const mapPointId = `event-${event.id}`;
        await this.linkEventToMapPoint(tripId, event.id, mapPointId);
      }
      
      console.log(`${eventsWithCoordinates.length} événements synchronisés avec la carte`);
    } catch (error) {
      console.error('Erreur lors de la synchronisation des événements avec la carte:', error);
    }
  }

  // Supprimer une intégration
  async deleteIntegration(integrationId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.integrationCollection, integrationId));
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'intégration:', error);
      return false;
    }
  }
}

export const integrationService = new IntegrationService();