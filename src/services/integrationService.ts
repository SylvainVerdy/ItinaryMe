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

  // Lier un événement à un point sur la carte
  async linkEventToMapPoint(tripId: string, eventId: string, mapPointId: string): Promise<string> {
    try {
      const integrationData: IntegrationItem = {
        tripId,
        sourceType: 'event',
        sourceId: eventId,
        targetType: 'mapPoint',
        targetId: mapPointId,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, this.integrationCollection), integrationData);
      return docRef.id;
    } catch (error) {
      console.error("Erreur lors de la liaison de l'événement au point sur la carte:", error);
      throw error;
    }
  }
  
  // Lier une note à un événement
  async linkNoteToEvent(tripId: string, noteId: string, eventId: string): Promise<string> {
    try {
      const integrationData: IntegrationItem = {
        tripId,
        sourceType: 'note',
        sourceId: noteId,
        targetType: 'event',
        targetId: eventId,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, this.integrationCollection), integrationData);
      return docRef.id;
    } catch (error) {
      console.error("Erreur lors de la liaison de la note à l'événement:", error);
      throw error;
    }
  }
  
  // Lier une note à un point sur la carte
  async linkNoteToMapPoint(tripId: string, noteId: string, mapPointId: string): Promise<string> {
    try {
      const integrationData: IntegrationItem = {
        tripId,
        sourceType: 'note',
        sourceId: noteId,
        targetType: 'mapPoint',
        targetId: mapPointId,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, this.integrationCollection), integrationData);
      return docRef.id;
    } catch (error) {
      console.error("Erreur lors de la liaison de la note au point sur la carte:", error);
      throw error;
    }
  }
  
  // Récupérer toutes les intégrations pour un voyage
  async getAllIntegrations(tripId: string): Promise<IntegrationItem[]> {
    try {
      const q = query(
        collection(db, this.integrationCollection),
        where("tripId", "==", tripId)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as IntegrationItem));
    } catch (error) {
      console.error("Erreur lors de la récupération des intégrations:", error);
      throw error;
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
        type: event.eventType || 'visit',
        color: event.color,
        // Calculer le jour en fonction de la date de début
        day: new Date(event.start).getDate(),
        order: 0  // À définir en fonction de l'heure
      }));
  }
  
  // Extraire les événements à partir des notes
  async extractEventsFromNotes(notes: Note[], tripId: string): Promise<TravelEvent[]> {
    const events: TravelEvent[] = [];
    
    for (const note of notes) {
      // Chercher des dates et des lieux dans le contenu de la note
      const extractedData = this.extractDateTimeAndLocation(note.content);
      
      if (extractedData.dates.length > 0) {
        // Créer un événement pour chaque date trouvée
        for (const dateInfo of extractedData.dates) {
          const eventData: Omit<TravelEvent, 'id'> = {
            title: note.title,
            description: note.content.substring(0, 100) + (note.content.length > 100 ? '...' : ''),
            start: dateInfo.start || new Date(),
            end: dateInfo.end || new Date(new Date().setHours(new Date().getHours() + 1)),
            allDay: !dateInfo.hasTime,
            noteId: note.id,
            eventType: this.determineEventType(note.content)
          };
          
          // Ajouter les coordonnées si un lieu a été trouvé
          if (extractedData.location) {
            // Simuler un géocodage pour obtenir les coordonnées du lieu
            const coordinates = await this.geocodeAddress(extractedData.location);
            if (coordinates) {
              eventData.location = extractedData.location;
              eventData.coordinates = coordinates;
            }
          }
          
          // Ajouter l'événement à Firestore
          try {
            const eventRef = await addDoc(collection(db, 'travelEvents'), {
              ...eventData,
              tripId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            
            // Lier la note à l'événement
            await this.linkNoteToEvent(tripId, note.id, eventRef.id);
            
            // Ajouter l'événement à la liste avec son ID
            events.push({
              id: eventRef.id,
              ...eventData
            });
          } catch (error) {
            console.error("Erreur lors de la création de l'événement à partir de la note:", error);
          }
        }
      }
    }
    
    return events;
  }
  
  // Extraire dates, heures et lieux du contenu d'une note
  private extractDateTimeAndLocation(content: string): {
    dates: Array<{
      start: Date | null;
      end: Date | null;
      hasTime: boolean;
    }>;
    location: string | null;
  } {
    const result = {
      dates: [] as Array<{
        start: Date | null;
        end: Date | null;
        hasTime: boolean;
      }>,
      location: null as string | null
    };
    
    // Recherche de motifs de date
    // Format: JJ/MM/YYYY ou JJ-MM-YYYY
    const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g;
    // Format: du JJ/MM au JJ/MM/YYYY
    const dateRangePattern = /du\s+(\d{1,2})[\/\-](\d{1,2})\s+au\s+(\d{1,2})[\/\-](\d{1,2})[\/\-]?(\d{4})?/gi;
    // Format: le 15 juin 2023 à 14h30
    const naturalDatePattern = /(le\s+)?(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})(\s+à\s+(\d{1,2})h(\d{0,2}))?/gi;
    
    // Recherche de motifs de lieu
    const locationPattern = /(à|@|lieu|adresse|emplacement|localisation)\s*:?\s*([^,.\n]+)/gi;
    
    // Traitement des dates au format JJ/MM/YYYY
    let match;
    while ((match = datePattern.exec(content)) !== null) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // Les mois en JS commencent à 0
      const year = parseInt(match[3], 10);
      
      const date = new Date(year, month, day);
      if (isValid(date) && isFuture(date)) {
        result.dates.push({
          start: date,
          end: null,
          hasTime: false
        });
      }
    }
    
    // Traitement des plages de dates
    while ((match = dateRangePattern.exec(content)) !== null) {
      const startDay = parseInt(match[1], 10);
      const startMonth = parseInt(match[2], 10) - 1;
      const endDay = parseInt(match[3], 10);
      const endMonth = parseInt(match[4], 10) - 1;
      const year = match[5] ? parseInt(match[5], 10) : new Date().getFullYear();
      
      const startDate = new Date(year, startMonth, startDay);
      const endDate = new Date(year, endMonth, endDay);
      
      if (isValid(startDate) && isValid(endDate)) {
        result.dates.push({
          start: startDate,
          end: endDate,
          hasTime: false
        });
      }
    }
    
    // Traitement des dates en langage naturel
    const monthMap: Record<string, number> = {
      'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
      'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
    };
    
    while ((match = naturalDatePattern.exec(content)) !== null) {
      const day = parseInt(match[2], 10);
      const month = monthMap[match[3].toLowerCase()];
      const year = parseInt(match[4], 10);
      
      let hasTime = false;
      let hours = 0;
      let minutes = 0;
      
      if (match[5]) { // A une heure
        hasTime = true;
        hours = parseInt(match[6], 10);
        minutes = match[7] ? parseInt(match[7], 10) : 0;
      }
      
      const date = new Date(year, month, day, hours, minutes);
      if (isValid(date)) {
        result.dates.push({
          start: date,
          end: null,
          hasTime
        });
      }
    }
    
    // Recherche de lieu
    while ((match = locationPattern.exec(content)) !== null) {
      result.location = match[2].trim();
      break; // Prendre seulement le premier lieu trouvé
    }
    
    return result;
  }
  
  // Déterminer le type d'événement à partir du contenu
  private determineEventType(content: string): 'visit' | 'transport' | 'accommodation' | 'food' | 'activity' | 'other' {
    const lowerContent = content.toLowerCase();
    
    if (/vol|train|bus|taxi|navette|transfert|transport|vélo|voiture|avion/i.test(lowerContent)) {
      return 'transport';
    }
    
    if (/hôtel|hotel|airbnb|hébergement|logement|appartement|chambre|dormir|nuit/i.test(lowerContent)) {
      return 'accommodation';
    }
    
    if (/restaurant|repas|dîner|déjeuner|petit-déjeuner|manger|cuisine|café|bar/i.test(lowerContent)) {
      return 'food';
    }
    
    if (/visite|musée|monument|site|tourisme|voir|découvrir|exploration/i.test(lowerContent)) {
      return 'visit';
    }
    
    if (/activité|jeu|sport|spectacle|concert|festival|parc|loisir/i.test(lowerContent)) {
      return 'activity';
    }
    
    return 'other';
  }
  
  // Géocoder une adresse (version simulée)
  private async geocodeAddress(address: string): Promise<{lat: number, lng: number} | null> {
    // Simulation - Dans une application réelle, utilisez une API de géocodage
    // comme Google Maps, Mapbox, etc.
    return {
      lat: 48.8 + (Math.random() - 0.5) * 0.2,
      lng: 2.3 + (Math.random() - 0.5) * 0.2
    };
  }
  
  // Synchroniser les événements du calendrier avec les points sur la carte
  async syncCalendarWithMap(
    tripId: string, 
    events: TravelEvent[], 
    mapPoints: MapPoint[]
  ): Promise<void> {
    try {
      // Récupérer les liaisons existantes
      const integrations = await this.getAllIntegrations(tripId);
      
      // Pour chaque événement avec des coordonnées
      for (const event of events.filter(e => e.coordinates)) {
        // Vérifier si une liaison existe déjà
        const existingIntegration = integrations.find(
          i => i.sourceType === 'event' && i.sourceId === event.id
        );
        
        if (!existingIntegration) {
          // Trouver un point sur la carte correspondant ou en créer un nouveau
          const matchingPoint = mapPoints.find(
            mp => mp.lat === event.coordinates!.lat && mp.lng === event.coordinates!.lng
          );
          
          if (matchingPoint) {
            // Lier l'événement à un point existant
            await this.linkEventToMapPoint(tripId, event.id, matchingPoint.id);
          } else {
            // Créer un nouveau point sur la carte pour cet événement
            const newPointData: Omit<MapPoint, 'id'> = {
              lat: event.coordinates!.lat,
              lng: event.coordinates!.lng,
              title: event.title,
              description: event.description || '',
              type: event.eventType || 'visit',
              color: event.color,
              day: new Date(event.start).getDate(),
              order: this.calculateEventOrder(event, events)
            };
            
            // Ajouter le point à Firestore (ou la collection appropriée)
            try {
              const pointRef = await addDoc(collection(db, 'mapPoints'), {
                ...newPointData,
                tripId,
                createdAt: new Date().toISOString()
              });
              
              // Lier l'événement au nouveau point
              await this.linkEventToMapPoint(tripId, event.id, pointRef.id);
            } catch (error) {
              console.error("Erreur lors de la création du point sur la carte:", error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors de la synchronisation du calendrier avec la carte:", error);
      throw error;
    }
  }
  
  // Synchroniser les notes avec le calendrier et la carte
  async syncNotesWithCalendarAndMap(tripId: string, notes: Note[]): Promise<void> {
    try {
      // Extraire des événements à partir des notes
      const events = await this.extractEventsFromNotes(notes, tripId);
      
      if (events.length > 0) {
        // Créer des points sur la carte à partir des événements
        const mapPoints = await this.extractMapPointsFromEvents(events);
        
        // Synchroniser les événements avec la carte
        await this.syncCalendarWithMap(tripId, events, mapPoints);
      }
    } catch (error) {
      console.error("Erreur lors de la synchronisation des notes avec le calendrier et la carte:", error);
    }
  }
  
  // Calculer l'ordre d'un événement dans une journée
  private calculateEventOrder(event: TravelEvent, allEvents: TravelEvent[]): number {
    // Filtrer les événements du même jour
    const sameDay = allEvents.filter(e => {
      const eventDate = new Date(event.start);
      const otherDate = new Date(e.start);
      return eventDate.getDate() === otherDate.getDate() && 
             eventDate.getMonth() === otherDate.getMonth() &&
             eventDate.getFullYear() === otherDate.getFullYear();
    });
    
    // Trier par heure de début
    sameDay.sort((a, b) => {
      const aTime = new Date(a.start).getTime();
      const bTime = new Date(b.start).getTime();
      return aTime - bTime;
    });
    
    // Trouver l'index de l'événement actuel
    return sameDay.findIndex(e => e.id === event.id);
  }
  
  // Supprimer une intégration
  async deleteIntegration(integrationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.integrationCollection, integrationId));
    } catch (error) {
      console.error("Erreur lors de la suppression de l'intégration:", error);
      throw error;
    }
  }
}

export const integrationService = new IntegrationService();