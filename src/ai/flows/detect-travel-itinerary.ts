import { ollamaModel } from '../agents/ollama-instance';
import { BasicTravelInfo } from './interpret-travel-request';
import { v4 as uuidv4 } from 'uuid';
import { TravelItinerary as LibTravelItinerary } from '@/lib/types';

// Interface locale pour la génération d'itinéraire
export interface TravelItineraryTemplate {
  id?: string;
  title: string;
  description: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  days: ItineraryDay[];
  totalBudget: string;
  recommendations: string[];
  links: Array<{ title: string; url: string }>;
}

export interface ItineraryDay {
  dayNumber: number;
  date?: string;
  activities: ItineraryActivity[];
  accommodation?: string;
  meals?: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  };
}

export interface ItineraryActivity {
  time?: string;
  title: string;
  description: string;
  location?: string;
  duration?: string;
  cost?: string;
}

interface ItineraryRequestDetection {
  isItineraryRequest: boolean;
  travelInfo?: {
    destination?: string;
    startDate?: string;
    endDate?: string;
    numPeople?: number;
    preferences?: string[];
  };
  confidence: number;
}

/**
 * Détecte si un message contient une demande d'itinéraire de voyage
 */
export async function detectItineraryRequest(message: string): Promise<ItineraryRequestDetection> {
  // Liste de mots-clés liés aux itinéraires
  const itineraryKeywords = [
    'itinéraire', 'planning', 'programme', 'agenda', 'plan', 'journée',
    'jour par jour', 'visiter', 'activités', 'que faire', 'quoi faire',
    'circuit', 'parcours', 'excursions', 'visite', 'explorer'
  ];
  
  const messageLC = message.toLowerCase();
  let keywordMatches = 0;
  
  // Compter combien de mots-clés sont présents
  itineraryKeywords.forEach(keyword => {
    if (messageLC.includes(keyword.toLowerCase())) {
      keywordMatches++;
    }
  });
  
  // Calculer un score de confiance simple
  const confidence = Math.min(keywordMatches / 3, 1) * 100;
  
  // Extraire des informations basiques
  const destinationMatch = message.match(/(?:à|pour|vers|sur|dans|en)\s+([A-Z][a-zÀ-ÿ]+(?:[\s-][A-Z][a-zÀ-ÿ]+)*)/);
  const dateMatch = message.match(/(?:du|le|partir du)\s+(\d{1,2}[\s/.-]\d{1,2}(?:[\s/.-]\d{2,4})?)/);
  const peopleMatch = message.match(/(\d+)\s+(?:personne|voyageur|participant)s?/i);
  
  // Si assez de confiance, extraire les détails
  const travelInfo = confidence > 50 ? {
    destination: destinationMatch ? destinationMatch[1] : undefined,
    startDate: dateMatch ? dateMatch[1] : undefined,
    numPeople: peopleMatch ? parseInt(peopleMatch[1], 10) : undefined
  } : undefined;
  
  return {
    isItineraryRequest: confidence > 60,
    travelInfo,
    confidence
  };
}

/**
 * Génère un itinéraire de voyage basé sur les informations fournies
 */
export async function generateTravelItinerary(travelInfo: any): Promise<TravelItineraryTemplate> {
  // Exemple d'implémentation simple, à remplacer par l'appel réel à l'API
  
  const mockItinerary: TravelItineraryTemplate = {
    title: `Itinéraire pour ${travelInfo.destination || 'votre voyage'}`,
    description: `Un itinéraire personnalisé pour explorer ${travelInfo.destination || 'votre destination'} en ${travelInfo.numPeople || 2} personne(s).`,
    days: [
      {
        dayNumber: 1,
        date: 'Premier jour',
        activities: [
          { 
            time: '9h00', 
            title: 'Visite culturelle',
            description: 'Visite du centre-ville', 
            location: 'Centre' 
          },
          { 
            time: '13h00', 
            title: 'Pause déjeuner',
            description: 'Déjeuner dans un restaurant local', 
            location: 'Restaurant' 
          },
          { 
            time: '15h00', 
            title: 'Activité culturelle',
            description: 'Visite du musée principal', 
            location: 'Musée' 
          }
        ],
        accommodation: 'Hôtel Central - 100€'
      },
      {
        dayNumber: 2,
        date: 'Deuxième jour',
        activities: [
          { 
            time: '10h00', 
            title: 'Sortie nature',
            description: 'Excursion nature', 
            location: 'Parc national' 
          },
          { 
            time: '16h00', 
            title: 'Temps libre',
            description: 'Temps libre et shopping', 
            location: 'Centre commercial' 
          }
        ],
        accommodation: 'Hôtel Central - 100€'
      }
    ],
    totalBudget: '600€ - 800€ par personne',
    recommendations: [
      'Réservez vos billets de musée à l\'avance',
      'Utilisez les transports en commun pour économiser',
      'N\'oubliez pas d\'essayer la spécialité locale'
    ],
    links: [
      { title: 'Site officiel du tourisme', url: 'https://example.com/tourisme' },
      { title: 'Billetterie des musées', url: 'https://example.com/musees' }
    ]
  };
  
  return mockItinerary;
}

// Fonctions utilitaires

function detectItineraryKeywords(message: string): boolean {
  const itineraryKeywords = [
    'itinéraire', 'planning', 'programme', 'agenda', 'emploi du temps', 
    'choses à faire', 'activités', 'jour par jour', 'visiter', 
    'que faire', 'organiser', 'planifier'
  ];
  
  const lowerCaseMessage = message.toLowerCase();
  return itineraryKeywords.some(keyword => lowerCaseMessage.includes(keyword));
}

function createFallbackItinerary(travelInfo: BasicTravelInfo, durationDays: number): TravelItineraryTemplate {
  const destination = travelInfo.destination || "Destination";
  const days: ItineraryDay[] = [];
  
  // Créer un jour de base pour chaque jour du voyage
  for (let i = 1; i <= durationDays; i++) {
    let date: string | undefined = undefined;
    
    // Calculer la date si disponible
    if (travelInfo.startDate) {
      const startDate = new Date(travelInfo.startDate);
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i - 1);
      date = currentDate.toISOString().split('T')[0];
    }
    
    days.push({
      dayNumber: i,
      date,
      activities: [
        {
          time: "10:00",
          title: `Exploration de ${destination} - Partie ${i}`,
          description: "Exploration des principales attractions de la destination.",
          location: destination,
          duration: "2-3 heures"
        },
        {
          time: "14:00",
          title: "Temps libre et découvertes locales",
          description: "Temps libre pour explorer les environs et découvrir la culture locale.",
          duration: "3-4 heures"
        }
      ],
      accommodation: "Hébergement recommandé en fonction de vos préférences",
      meals: {
        breakfast: "Petit-déjeuner à l'hébergement",
        lunch: "Déjeuner dans un restaurant local",
        dinner: "Dîner dans un restaurant recommandé"
      }
    });
  }
  
  return {
    id: uuidv4(),
    title: `Voyage à ${destination}`,
    description: `Un voyage de ${durationDays} jours à ${destination}`,
    destination,
    startDate: travelInfo.startDate,
    endDate: travelInfo.endDate,
    days,
    totalBudget: "Variable selon vos choix d'hébergement et d'activités",
    recommendations: [
      "Vérifiez la météo avant votre départ",
      "Prévoyez des vêtements confortables pour vos activités",
      "Renseignez-vous sur les coutumes locales"
    ],
    links: [
      { title: "Site officiel de tourisme", url: "https://example.com/tourisme" }
    ]
  };
} 