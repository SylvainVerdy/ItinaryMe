import { ollamaModel } from '../agents/ollama-instance';
import { BasicTravelInfo } from './interpret-travel-request';
import { v4 as uuidv4 } from 'uuid';

export interface TravelItinerary {
  id: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  days: ItineraryDay[];
  overview: string;
  tips: string[];
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

export interface ItineraryRequestResult {
  isItineraryRequest: boolean;
  travelInfo?: BasicTravelInfo;
}

/**
 * Détecte si un message est une demande d'itinéraire de voyage
 */
export async function detectItineraryRequest(message: string): Promise<ItineraryRequestResult> {
  try {
    const prompt = `
Tu es un assistant spécialisé dans la détection de demandes d'itinéraires de voyage.

Message de l'utilisateur: "${message}"

Détermine si ce message contient une demande explicite d'itinéraire de voyage ou de planning détaillé.
Une demande d'itinéraire contient généralement:
- Des mots-clés comme "itinéraire", "planning", "programme", "agenda", "choses à faire", "activités"
- Des questions sur comment organiser les jours
- Des demandes de suggestions d'activités jour par jour

Réponds uniquement au format JSON suivant:
{
  "isItineraryRequest": true/false,
  "travelInfo": {
    "destination": "nom de la destination" ou null,
    "startDate": "YYYY-MM-DD" ou null,
    "endDate": "YYYY-MM-DD" ou null,
    "numPeople": nombre ou null,
    "preferences": "description des préférences" ou null,
    "budget": "description du budget" ou null
  } ou null si aucune information n'est détectée
}
`;

    console.log("Détection de demande d'itinéraire...");
    const response = await ollamaModel.call(prompt);
    
    try {
      // Extraction du JSON de la réponse
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log("Résultat de détection d'itinéraire:", result);
        return result;
      } else {
        throw new Error("Format JSON non détecté dans la réponse");
      }
    } catch (parseError) {
      console.error("Erreur lors du parsing de la demande d'itinéraire:", parseError);
      
      // Détection de secours basée sur des mots-clés
      const isItineraryRequest = detectItineraryKeywords(message);
      return {
        isItineraryRequest
      };
    }
  } catch (error) {
    console.error("Erreur lors de la détection de demande d'itinéraire:", error);
    return { isItineraryRequest: false };
  }
}

/**
 * Génère un itinéraire de voyage à partir des informations de base
 */
export async function generateTravelItinerary(travelInfo: BasicTravelInfo): Promise<TravelItinerary> {
  try {
    // Calculer la durée du séjour si les dates sont disponibles
    let durationDays = 3; // Valeur par défaut
    if (travelInfo.startDate && travelInfo.endDate) {
      const start = new Date(travelInfo.startDate);
      const end = new Date(travelInfo.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      // Minimum 1 jour
      durationDays = Math.max(1, durationDays);
    }

    const prompt = `
Tu es un expert en planification de voyages et tu dois créer un itinéraire détaillé.

Informations sur le voyage:
- Destination: ${travelInfo.destination || "Non spécifiée"}
- Date de début: ${travelInfo.startDate || "Non spécifiée"}
- Date de fin: ${travelInfo.endDate || "Non spécifiée"}
- Durée: ${durationDays} jour(s)
- Nombre de personnes: ${travelInfo.numPeople || "Non spécifié"}
- Préférences: ${travelInfo.preferences || "Non spécifiées"}
- Budget: ${travelInfo.budget || "Non spécifié"}
- Infos additionnelles: ${travelInfo.additionalInfo || "Non spécifiées"}

Crée un itinéraire réaliste et détaillé pour ce voyage, incluant:
1. Un aperçu général du voyage
2. Pour chaque jour: 
   - 3-5 activités avec descriptions détaillées
   - Suggestions de repas
   - Hébergement recommandé
3. Des conseils pratiques pour ce voyage

Réponds uniquement au format JSON suivant:
{
  "destination": "nom de la destination",
  "startDate": "YYYY-MM-DD" ou null,
  "endDate": "YYYY-MM-DD" ou null,
  "overview": "aperçu général du voyage",
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD" ou null,
      "activities": [
        {
          "time": "HH:MM",
          "title": "titre de l'activité",
          "description": "description détaillée",
          "location": "lieu spécifique",
          "duration": "durée approximative",
          "cost": "coût approximatif"
        },
        // autres activités...
      ],
      "accommodation": "hébergement recommandé pour la nuit",
      "meals": {
        "breakfast": "suggestion de petit déjeuner",
        "lunch": "suggestion de déjeuner",
        "dinner": "suggestion de dîner"
      }
    },
    // autres jours...
  ],
  "tips": [
    "conseil 1",
    "conseil 2",
    // autres conseils...
  ]
}
`;

    console.log("Génération d'itinéraire pour:", travelInfo.destination);
    const response = await ollamaModel.call(prompt);
    
    try {
      // Extraction du JSON de la réponse
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const itineraryData = JSON.parse(jsonMatch[0]);
        console.log("Itinéraire généré avec succès");
        
        // Ajout d'un identifiant unique
        return {
          ...itineraryData,
          id: uuidv4(),
          destination: itineraryData.destination || travelInfo.destination || "Destination"
        };
      } else {
        throw new Error("Format JSON non détecté dans la réponse");
      }
    } catch (parseError) {
      console.error("Erreur lors du parsing de l'itinéraire:", parseError);
      
      // Créer un itinéraire de secours simple
      return createFallbackItinerary(travelInfo, durationDays);
    }
  } catch (error) {
    console.error("Erreur lors de la génération de l'itinéraire:", error);
    throw error;
  }
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

function createFallbackItinerary(travelInfo: BasicTravelInfo, durationDays: number): TravelItinerary {
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
    destination,
    startDate: travelInfo.startDate,
    endDate: travelInfo.endDate,
    days,
    overview: `Un voyage de ${durationDays} jours à ${destination} avec des activités adaptées à vos préférences.`,
    tips: [
      "Vérifiez la météo avant votre départ",
      "Prévoyez des vêtements confortables pour vos activités",
      "Renseignez-vous sur les coutumes locales"
    ]
  };
} 