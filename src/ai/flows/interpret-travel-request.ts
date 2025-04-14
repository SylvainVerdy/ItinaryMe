'use server';
/**
 * @fileOverview Interprets a user's travel request and extracts key parameters.
 *
 * - interpretTravelRequest - A function that interprets the travel request.
 * - InterpretTravelRequestInput - The input type for the interpretTravelRequest function.
 * - InterpretTravelRequestOutput - The return type for the interpretTravelRequest function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import { OpenAIModel } from '@/ai/openai-model';

const InterpretTravelRequestInputSchema = z.object({
  request: z.string().describe('The user travel request.'),
});
export type InterpretTravelRequestInput = z.infer<typeof InterpretTravelRequestInputSchema>;

const InterpretTravelRequestOutputSchema = z.object({
  destination: z.string().describe('The destination of the trip.'),
  startDate: z.string().describe('The start date of the trip (YYYY-MM-DD).'),
  endDate: z.string().describe('The end date of the trip (YYYY-MM-DD).'),
});
export type InterpretTravelRequestOutput = z.infer<typeof InterpretTravelRequestOutputSchema>;

// Interface pour les paramètres de la fonction
interface InterpretTravelRequestParams {
  request: string;
}

// Interface pour le résultat de l'interprétation
interface InterpretTravelRequestResult {
  destination?: string;
  startDate?: string;
  endDate?: string;
  numPeople?: number;
  budget?: string;
  activities?: string[];
  preferences?: string;
  isValidTravelRequest: boolean;
}

// Fonction principale
export async function interpretTravelRequest({ request }: InterpretTravelRequestParams): Promise<InterpretTravelRequestResult> {
  try {
    // Créer une instance du modèle OpenAI
    const model = new OpenAIModel();
    
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
    
    const result = await model.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: request }
    ]);
    
    // Parser la réponse JSON
    try {
      const parsedResponse = JSON.parse(result.content || '{}');
      
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
      return {
        isValidTravelRequest: false
      };
    }
  } catch (error) {
    console.error('Erreur lors de l\'interprétation de la demande de voyage:', error);
    return {
      isValidTravelRequest: false
    };
  }
}

// Fonction utilitaire de détection basique (fallback si l'IA ne répond pas)
export function detectBasicTravelInfo(text: string): InterpretTravelRequestResult {
  const result: InterpretTravelRequestResult = {
    isValidTravelRequest: false
  };
  
  // Détecter une destination
  const destinationRegex = /(?:à|à destination de|vers|pour|visiter)\s+([A-Z][a-zÀ-ÿ]+(?:[\s'-][A-Z][a-zÀ-ÿ]+)*)/i;
  const destinationMatch = text.match(destinationRegex);
  if (destinationMatch) {
    result.destination = destinationMatch[1].trim();
    result.isValidTravelRequest = true;
  }
  
  // Détecter les dates
  const datePattern = /(?:du|le|pour le)\s+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{2,4})\s+(?:au|jusqu'au|jusqu'à)\s+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{2,4})/i;
  const dateMatch = text.match(datePattern);
  if (dateMatch) {
    result.startDate = dateMatch[1].trim();
    result.endDate = dateMatch[2].trim();
    result.isValidTravelRequest = true;
  }
  
  // Détecter le nombre de voyageurs
  const peoplePattern = /(?:pour|avec)\s+(\d+)\s+(?:personne|personnes|voyageur|voyageurs|adulte|adultes)/i;
  const peopleMatch = text.match(peoplePattern);
  if (peopleMatch) {
    result.numPeople = parseInt(peopleMatch[1], 10);
    result.isValidTravelRequest = true;
  }
  
  // Détecter le budget
  const budgetPattern = /(?:budget|coût|prix|montant)\s+(?:de|:)?\s*(\d+\s*(?:€|euros|EUR|dollars|\$|USD))/i;
  const budgetMatch = text.match(budgetPattern);
  if (budgetMatch) {
    result.budget = budgetMatch[1].trim();
    result.isValidTravelRequest = true;
  }
  
  return result;
}
