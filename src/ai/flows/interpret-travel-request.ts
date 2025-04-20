'use server';
/**
 * @fileOverview Interprets a user's travel request and extracts key parameters.
 * Remplacé par un mock minimal après désinstallation de GenKit.
 */

import { z } from 'zod';
import { OpenAIModel } from '../openai-model';
import { ollamaModel } from '../agents/ollama-instance';
import { OpenAI } from '@langchain/openai';
import { StructuredOutputParser } from 'langchain/output_parsers';

export interface InterpretTravelRequestInput {
  request: string;
}

export interface InterpretTravelRequestOutput {
  destination?: string;
  startDate?: string;
  endDate?: string;
  numPeople?: number;
  budget?: string;
  activities?: string[];
  preferences?: string;
  isValidTravelRequest: boolean;
}

/**
 * Interface pour les informations basiques de voyage
 */
export interface BasicTravelInfo {
  isValidTravelRequest: boolean;
  destination?: string;
  startDate?: string;
  endDate?: string;
  numPeople?: number;
  budget?: string;
  preferences?: string[];
  additionalInfo?: string;
}

// Interface pour les paramètres de la fonction
interface InterpretTravelRequestParams {
  request: string;
}

// Fonction principale
export async function interpretTravelRequest({ request }: InterpretTravelRequestParams): Promise<InterpretTravelRequestOutput> {
  try {
    // Essayer d'abord l'analyse basique pour obtenir des résultats immédiats
    const basicResult = await detectBasicTravelInfo(request);
    
    // Si l'analyse basique a trouvé des informations de voyage, on peut la retourner
    if (basicResult.isValidTravelRequest && basicResult.destination) {
      console.log("Informations détectées via regex, pas besoin d'appeler l'API");
      return basicResult;
    }
    
    // Créer une instance du modèle OpenAI (qui utilise Ollama)
    const model = new OpenAIModel();
    
    // Vérifier si l'API est désactivée
    if (model.disabled) {
      console.log("API désactivée, utilisation uniquement de l'analyse par regex");
      return basicResult;
    }
    
    // Appeler le modèle pour interpréter la demande de voyage
    const systemPrompt = `
      Tu es un assistant spécialisé dans l'interprétation des demandes de voyage.
      Ta tâche est d'analyser la demande de l'utilisateur et d'en extraire les informations pertinentes.
      
      - Identifie s'il s'agit d'une demande de voyage ou non.
      - Extrait la destination (ville, pays ou région) si elle est mentionnée.
      - Extrait les dates de début et de fin du voyage si elles sont mentionnées. Formate-les en JJ/MM/AAAA.
      - Extrait le nombre de personnes participant au voyage si mentionné.
      - Extrait le budget si mentionné.
      - Extrait les activités souhaitées si mentionnées.
      - Extrait les préférences (type d'hébergement, style de voyage, etc.) si mentionnées.
      
      Réponds uniquement en format JSON avec les clés suivantes:
      {
        "isValidTravelRequest": true/false,
        "destination": "nom de la destination", // ou null si absent
        "startDate": "date de début formatée", // ou null si absente
        "endDate": "date de fin formatée", // ou null si absente
        "numPeople": nombre, // ou null si absent
        "budget": "budget mentionné", // ou null si absent
        "activities": ["activité 1", "activité 2", ...], // ou [] si aucune
        "preferences": "préférences mentionnées" // ou null si absentes
      }
    `;
    
    console.log("Appel du modèle Ollama pour analyser la demande");
    const result = await model.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: request }
    ]);
    
    // Parser la réponse JSON
    try {
      console.log("Réponse reçue:", result.content);
      const parsedResponse = JSON.parse(result.content || '{}');
      
      // Vérifier si l'API a fourni une réponse valide
      if (parsedResponse.isValidTravelRequest === false && basicResult.isValidTravelRequest) {
        console.log("L'API n'a pas détecté de demande de voyage, mais l'analyse regex oui. Utilisation du résultat regex.");
        return basicResult;
      }
      
      return {
        destination: parsedResponse.destination || undefined,
        startDate: parsedResponse.startDate || undefined,
        endDate: parsedResponse.endDate || undefined,
        numPeople: parsedResponse.numPeople || undefined,
        budget: parsedResponse.budget || undefined,
        activities: parsedResponse.activities || [],
        preferences: parsedResponse.preferences || undefined,
        isValidTravelRequest: parsedResponse.isValidTravelRequest || false
      };
    } catch (e) {
      console.error('Erreur lors du parsing de la réponse JSON:', e);
      return basicResult;
    }
  } catch (error) {
    console.error('Erreur lors de l\'interprétation de la demande de voyage:', error);
    return {
      isValidTravelRequest: false
    };
  }
}

/**
 * Détecte les informations basiques de voyage à partir d'un message en langage naturel
 */
export async function detectBasicTravelInfo(message: string): Promise<BasicTravelInfo> {
  // En mode développement, retourne des données factices
  if (process.env.NODE_ENV === 'development') {
    return getMockTravelInfo(message);
  }
  
  try {
    // Initialiser le modèle LLM 
    const model = new OpenAI({
      temperature: 0.3,
      modelName: process.env.OPENAI_MODEL || 'gpt-4',
    });
    
    // Créer le parser pour la sortie structurée
    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        isValidTravelRequest: z.boolean(),
        destination: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        numPeople: z.number().optional(),
        budget: z.string().optional(),
        preferences: z.array(z.string()).optional(),
        additionalInfo: z.string().optional(),
      })
    );
    
    // Créer le prompt pour l'interprétation
    const prompt = `
    Analyse le message suivant et extrais les informations de voyage s'il s'agit d'une demande de voyage.
    Si ce n'est pas une demande de voyage, renvoie isValidTravelRequest: false.
    
    Message: ${message}
    
    Tu dois identifier:
    1. Si c'est une demande de voyage (booléen)
    2. La destination
    3. La date de début (format YYYY-MM-DD)
    4. La date de fin (format YYYY-MM-DD)
    5. Le nombre de personnes
    6. Le budget (description textuelle)
    7. Les préférences (activités, type d'hébergement, etc.)
    8. Toute information supplémentaire pertinente
    
    Format de sortie:
    {
      "isValidTravelRequest": boolean,
      "destination": string | null,
      "startDate": "YYYY-MM-DD" | null,
      "endDate": "YYYY-MM-DD" | null,
      "numPeople": number | null,
      "budget": string | null,
      "preferences": string[] | null,
      "additionalInfo": string | null
    }
    `;
    
    // Appeler le modèle pour analyser le message
    const result = await model.invoke(prompt);
    
    // Parser le résultat
    return await parser.parse(result);
    
  } catch (error) {
    console.error("Erreur lors de l'analyse de la demande de voyage:", error);
    // Retourner un résultat de secours en cas d'erreur
    return getMockTravelInfo(message);
  }
}

/**
 * Fonction d'assistance pour générer des informations de voyage factices en mode développement
 * Utilise une analyse basique pour extraire certaines informations
 */
function getMockTravelInfo(message: string): BasicTravelInfo {
  // Vérifier si le message contient des éléments qui suggèrent une demande de voyage
  const containsDestinationKeywords = /voyage|visiter|aller à|partir( à| en)|destination|vacances|séjour/i.test(message);
  const containsDateKeywords = /semaine|jour|mois|dates|du \d+ au \d+|partir le|revenir le|début|fin/i.test(message);
  
  // Si le message ne semble pas être lié à un voyage, retourner une réponse négative
  if (!containsDestinationKeywords && !containsDateKeywords) {
    return { isValidTravelRequest: false };
  }
  
  // Extraire la destination (recherche basique)
  let destination = null;
  const destinationMatch = message.match(/(?:à|en|pour|vers|dans|au|aux|le) ([A-Z][a-zÀ-ÿ]+(?:[ -][A-Z][a-zÀ-ÿ]+)*)/);
  if (destinationMatch) {
    destination = destinationMatch[1];
  } else {
    // Recherche de villes ou pays communs
    const commonPlaces = ['Paris', 'Londres', 'Rome', 'Berlin', 'Madrid', 'Barcelone', 'New York', 'Tokyo', 'France', 'Italie', 'Espagne'];
    for (const place of commonPlaces) {
      if (message.includes(place)) {
        destination = place;
        break;
      }
    }
  }
  
  // Par défaut, supposons que c'est une demande valide si une destination a été trouvée
  return {
    isValidTravelRequest: !!destination,
    destination: destination || 'Paris', // Valeur par défaut
    startDate: '2023-07-01', // Valeur par défaut
    endDate: '2023-07-07', // Valeur par défaut
    numPeople: 2, // Valeur par défaut
    budget: 'moyen', // Valeur par défaut
    preferences: ['culture', 'gastronomie'], // Valeurs par défaut
    additionalInfo: 'Mode de développement: informations factices générées automatiquement.'
  };
}
