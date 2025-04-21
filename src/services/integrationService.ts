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
  private integrationCollection = 'integrations';

  // Lier un événement à un point sur la carte
  async linkEventToMapPoint(tripId: string, eventId: string, mapPointId: string): Promise<string> {
    try {
      const integration: IntegrationItem = {
        tripId,
        sourceType: 'event',
        sourceId: eventId,
        targetType: 'mapPoint',
        targetId: mapPointId,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, this.integrationCollection), integration);
      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de la liaison événement-point:', error);
      throw error;
    }
  }

  // Lier une note à un événement
  async linkNoteToEvent(tripId: string, noteId: string, eventId: string): Promise<string> {
    try {
      const integration: IntegrationItem = {
        tripId,
        sourceType: 'note',
        sourceId: noteId,
        targetType: 'event',
        targetId: eventId,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, this.integrationCollection), integration);
      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de la liaison note-événement:', error);
      throw error;
    }
  }

  // Récupérer toutes les intégrations pour un voyage
  async getAllIntegrationsForTrip(tripId: string): Promise<IntegrationItem[]> {
    try {
      const q = query(collection(db, this.integrationCollection), where("tripId", "==", tripId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as IntegrationItem[];
    } catch (error) {
      console.error('Erreur lors de la récupération des intégrations:', error);
      throw error;
    }
  }

  // Extraire les points de carte depuis les événements
  async extractMapPointsFromEvents(events: TravelEvent[]): Promise<MapPoint[]> {
    const mapPoints: MapPoint[] = [];
    
    events.forEach(event => {
      if (event.coordinates) {
        const mapPoint: MapPoint = {
          id: `event-${event.id}`,
          lat: event.coordinates.lat,
          lng: event.coordinates.lng,
          title: event.title,
          description: event.description || '',
          type: event.eventType || 'activity',
          color: event.color,
          day: event.day?.toString() || '1',
          order: 0
        };
        
        mapPoints.push(mapPoint);
      }
    });
    
    return mapPoints;
  }

  // Synchroniser les événements du calendrier avec les points sur la carte
  async syncCalendarEventsWithMapPoints(tripId: string, events: TravelEvent[]): Promise<void> {
    try {
      // D'abord supprimer les anciennes intégrations
      const oldIntegrations = await this.getAllIntegrationsForTrip(tripId);
      
      for (const integration of oldIntegrations) {
        if (integration.sourceType === 'event' && integration.targetType === 'mapPoint') {
          await deleteDoc(doc(db, this.integrationCollection, integration.id!));
        }
      }
      
      // Créer les nouveaux points et les lier
      for (const event of events) {
        if (event.coordinates) {
          // Cette implémentation peut être étendue selon les besoins
          console.log(`Synchronisation de l'événement ${event.id} avec un point sur la carte`);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation des événements:', error);
      throw error;
    }
  }

  // Supprimer une intégration
  async deleteIntegration(integrationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.integrationCollection, integrationId));
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'intégration:', error);
      throw error;
    }
  }
}

export const integrationService = new IntegrationService();