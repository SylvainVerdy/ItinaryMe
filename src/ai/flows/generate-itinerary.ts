'use server';

import { OpenAI } from '@langchain/openai';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';

/**
 * Paramètres pour générer un itinéraire
 */
export interface ItineraryParams {
  destination: string;
  startDate?: string;
  endDate?: string;
  preferences?: string[];
  budget?: string;
}

/**
 * Structure pour représenter une activité dans l'itinéraire
 */
export interface ItineraryActivity {
  id: string;
  title: string;
  description: string;
  time: string;
  duration: string;
  location: string;
  category: 'attraction' | 'restaurant' | 'museum' | 'nature' | 'shopping' | 'entertainment' | 'other';
  price?: string;
  imageUrl?: string;
  rating?: number;
}

/**
 * Structure pour représenter un jour dans l'itinéraire
 */
export interface ItineraryDay {
  date: string;
  dayNumber: number;
  activities: ItineraryActivity[];
  accommodation?: {
    name: string;
    description: string;
    location: string;
    price?: string;
  };
}

/**
 * Structure complète de l'itinéraire
 */
export interface TravelItinerary {
  destination: string;
  duration: number;
  startDate: string;
  endDate: string;
  summary: string;
  days: ItineraryDay[];
  estimatedBudget?: {
    accommodation: string;
    food: string;
    activities: string;
    transportation: string;
    total: string;
  };
  travelTips: string[];
}

/**
 * Génère un itinéraire pour un voyage en fonction des paramètres spécifiés
 */
export async function generateItinerary(params: ItineraryParams): Promise<TravelItinerary> {
  // En mode développement, on retourne un exemple d'itinéraire
  if (process.env.NODE_ENV === 'development') {
    return getMockItinerary(params);
  }
  
  try {
    // Initialiser le modèle LLM
    const model = new OpenAI({
      temperature: 0.7,
      modelName: process.env.OPENAI_MODEL || 'gpt-4',
    });
    
    // Créer le parser
    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        destination: z.string(),
        duration: z.number(),
        startDate: z.string(),
        endDate: z.string(),
        summary: z.string(),
        days: z.array(
          z.object({
            date: z.string(),
            dayNumber: z.number(),
            activities: z.array(
              z.object({
                id: z.string(),
                title: z.string(),
                description: z.string(),
                time: z.string(),
                duration: z.string(),
                location: z.string(),
                category: z.enum(['attraction', 'restaurant', 'museum', 'nature', 'shopping', 'entertainment', 'other']),
                price: z.string().optional(),
                imageUrl: z.string().optional(),
                rating: z.number().optional(),
              })
            ),
            accommodation: z.object({
              name: z.string(),
              description: z.string(),
              location: z.string(),
              price: z.string().optional(),
            }).optional(),
          })
        ),
        estimatedBudget: z.object({
          accommodation: z.string(),
          food: z.string(),
          activities: z.string(),
          transportation: z.string(),
          total: z.string(),
        }).optional(),
        travelTips: z.array(z.string()),
      })
    );
    
    // Créer le prompt pour la génération de l'itinéraire
    const prompt = `
    Crée un itinéraire de voyage détaillé pour un voyage à ${params.destination}
    ${params.startDate ? `commençant le ${params.startDate}` : ''}
    ${params.endDate ? `et se terminant le ${params.endDate}` : ''}
    ${params.preferences?.length ? `avec les préférences suivantes: ${params.preferences.join(', ')}` : ''}
    ${params.budget ? `et un budget de ${params.budget}` : ''}.
    
    L'itinéraire doit inclure des activités spécifiques et variées, des lieux d'intérêt,
    des recommandations de restaurants, et des informations sur l'hébergement.
    
    Équilibre les activités populaires et les expériences locales moins connues.
    Pour chaque activité, fournis une description détaillée, l'emplacement, la durée estimée,
    et la catégorie (attraction, restaurant, musée, nature, shopping, divertissement, autre).
    `;
    
    // Appeler le modèle pour générer l'itinéraire
    const result = await model.invoke(prompt);
    
    // Parser le résultat
    return await parser.parse(result);
    
  } catch (error) {
    console.error("Erreur lors de la génération de l'itinéraire:", error);
    // Retourner un itinéraire de secours en cas d'erreur
    return getMockItinerary(params);
  }
}

/**
 * Génère un itinéraire factice pour le développement
 */
function getMockItinerary(params: ItineraryParams): TravelItinerary {
  const startDate = params.startDate || '2023-07-01';
  const endDate = params.endDate || '2023-07-04';
  
  return {
    destination: params.destination,
    duration: 4,
    startDate,
    endDate,
    summary: `Un voyage de 4 jours à ${params.destination}, parfait pour découvrir les sites emblématiques et la culture locale.`,
    days: [
      {
        date: '2023-07-01',
        dayNumber: 1,
        activities: [
          {
            id: '1',
            title: 'Petit-déjeuner au café local',
            description: 'Commencez votre journée avec un petit-déjeuner typique dans un café apprécié des locaux.',
            time: '08:00',
            duration: '1h',
            location: 'Centre-ville',
            category: 'restaurant',
            price: '€€',
          },
          {
            id: '2',
            title: 'Visite du musée principal',
            description: 'Découvrez l\'histoire et la culture de la région dans ce musée renommé.',
            time: '10:00',
            duration: '2h30',
            location: 'Quartier culturel',
            category: 'museum',
            price: '€€',
          },
          {
            id: '3',
            title: 'Déjeuner gastronomique',
            description: 'Savourez des spécialités locales dans ce restaurant réputé.',
            time: '13:00',
            duration: '1h30',
            location: 'Place centrale',
            category: 'restaurant',
            price: '€€€',
          },
        ],
        accommodation: {
          name: 'Hôtel Central',
          description: 'Hôtel confortable en plein centre-ville avec accès facile aux attractions.',
          location: 'Centre-ville',
          price: '€€€',
        },
      },
      {
        date: '2023-07-02',
        dayNumber: 2,
        activities: [
          {
            id: '4',
            title: 'Excursion nature',
            description: 'Partez à la découverte des paysages naturels environnants.',
            time: '09:00',
            duration: '5h',
            location: 'Parc naturel régional',
            category: 'nature',
            price: '€',
          },
        ],
        accommodation: {
          name: 'Hôtel Central',
          description: 'Hôtel confortable en plein centre-ville avec accès facile aux attractions.',
          location: 'Centre-ville',
          price: '€€€',
        },
      },
      {
        date: '2023-07-03',
        dayNumber: 3,
        activities: [
          {
            id: '5',
            title: 'Shopping dans les boutiques locales',
            description: 'Découvrez les produits artisanaux et souvenirs locaux.',
            time: '10:00',
            duration: '3h',
            location: 'Rue commerçante',
            category: 'shopping',
            price: '€€',
          },
        ],
        accommodation: {
          name: 'Hôtel Central',
          description: 'Hôtel confortable en plein centre-ville avec accès facile aux attractions.',
          location: 'Centre-ville',
          price: '€€€',
        },
      },
      {
        date: '2023-07-04',
        dayNumber: 4,
        activities: [
          {
            id: '6',
            title: 'Visite guidée historique',
            description: 'Une visite à pied avec un guide local pour découvrir l\'histoire cachée de la ville.',
            time: '09:30',
            duration: '2h',
            location: 'Vieille ville',
            category: 'attraction',
            price: '€€',
          },
        ],
        accommodation: {
          name: 'Départ',
          description: 'Retour à la maison après un voyage mémorable.',
          location: 'N/A',
        },
      },
    ],
    estimatedBudget: {
      accommodation: '€600',
      food: '€300',
      activities: '€200',
      transportation: '€100',
      total: '€1200',
    },
    travelTips: [
      'Réservez vos visites à l\'avance pour éviter les files d\'attente.',
      'Utilisez les transports en commun pour économiser de l\'argent.',
      'Apprenez quelques phrases en langue locale pour faciliter vos interactions.',
      'Gardez vos documents importants dans un endroit sécurisé.',
    ],
  };
} 