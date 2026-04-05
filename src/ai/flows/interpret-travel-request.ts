'use server';
/**
 * @fileOverview Interprets a user's travel request and extracts key parameters.
 *
 * - interpretTravelRequest - A function that interprets the travel request.
 * - InterpretTravelRequestInput - The input type for the interpretTravelRequest function.
 * - InterpretTravelRequestOutput - The return type for the interpretTravelRequest function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

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

interface InterpretTravelRequestParams {
  request: string;
}

export interface InterpretTravelRequestResult {
  destination?: string;
  startDate?: string;
  endDate?: string;
  numPeople?: number;
  budget?: string;
  activities?: string[];
  preferences?: string;
  recommendations?: string;
  notes?: string;
  isValidTravelRequest: boolean;
}

const InterpretTravelResultSchema = z.object({
  isValidTravelRequest: z.boolean(),
  destination: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  numPeople: z.number().optional(),
  budget: z.string().optional(),
  activities: z.array(z.string()).optional(),
  preferences: z.string().optional(),
  recommendations: z.string().optional(),
  notes: z.string().optional(),
});

const interpretTravelPrompt = ai.definePrompt({
  name: 'interpretTravelRequestPrompt',
  input: {
    schema: z.object({
      request: z.string().describe('The user travel request.'),
    }),
  },
  output: { schema: InterpretTravelResultSchema },
  prompt: `Tu es un assistant spécialisé dans l'interprétation des demandes de voyage.
Analyse la demande et extrais les informations pertinentes.

- Indique si c'est une demande de voyage (isValidTravelRequest).
- Destination, dates (JJ/MM/AAAA ou YYYY-MM-DD si plus clair), nombre de personnes, budget, activités, préférences.
- Si pertinent, ajoute recommendations (conseils courts) et notes (compléments).

Demande utilisateur:
{{{request}}}

Réponds uniquement avec les champs du schéma JSON attendu.`,
});

const interpretTravelFlow = ai.defineFlow(
  {
    name: 'interpretTravelRequestFlow',
    inputSchema: InterpretTravelRequestInputSchema,
    outputSchema: InterpretTravelResultSchema,
  },
  async (input) => {
    const { output } = await interpretTravelPrompt(input);
    return output!;
  }
);

export async function interpretTravelRequest({
  request,
}: InterpretTravelRequestParams): Promise<InterpretTravelRequestResult> {
  try {
    const parsed = await interpretTravelFlow({ request });
    return {
      destination: parsed.destination,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      numPeople: parsed.numPeople,
      budget: parsed.budget,
      activities: parsed.activities ?? [],
      preferences: parsed.preferences,
      recommendations: parsed.recommendations,
      notes: parsed.notes,
      isValidTravelRequest: parsed.isValidTravelRequest,
    };
  } catch (error) {
    console.error("Erreur lors de l'interprétation de la demande de voyage:", error);
    return { isValidTravelRequest: false };
  }
}

export async function detectBasicTravelInfo(text: string): Promise<InterpretTravelRequestResult> {
  const result: InterpretTravelRequestResult = {
    isValidTravelRequest: false,
  };

  const destinationRegex =
    /(?:à|à destination de|vers|pour|visiter)\s+([A-Z][a-zÀ-ÿ]+(?:[\s'-][A-Z][a-zÀ-ÿ]+)*)/i;
  const destinationMatch = text.match(destinationRegex);
  if (destinationMatch) {
    result.destination = destinationMatch[1].trim();
    result.isValidTravelRequest = true;
  }

  const datePattern =
    /(?:du|le|pour le)\s+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{2,4})\s+(?:au|jusqu'au|jusqu'à)\s+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{2,4})/i;
  const dateMatch = text.match(datePattern);
  if (dateMatch) {
    result.startDate = dateMatch[1].trim();
    result.endDate = dateMatch[2].trim();
    result.isValidTravelRequest = true;
  }

  const peoplePattern =
    /(?:pour|avec)\s+(\d+)\s+(?:personne|personnes|voyageur|voyageurs|adulte|adultes)/i;
  const peopleMatch = text.match(peoplePattern);
  if (peopleMatch) {
    result.numPeople = parseInt(peopleMatch[1], 10);
    result.isValidTravelRequest = true;
  }

  const budgetPattern =
    /(?:budget|coût|prix|montant)\s+(?:de|:)?\s*(\d+\s*(?:€|euros|EUR|dollars|\$|USD))/i;
  const budgetMatch = text.match(budgetPattern);
  if (budgetMatch) {
    result.budget = budgetMatch[1].trim();
    result.isValidTravelRequest = true;
  }

  return result;
}
