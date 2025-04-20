'use server';
/**
 * @fileOverview Analyzes browser content to extract travel-related information.
 * Remplacé par un mock après désinstallation de GenKit.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'zod';
import { OpenAIModel } from '../openai-model';

export interface AnalyzeBrowserContentInput {
  text: string;
}

export interface AnalyzeBrowserContentOutput {
  destination?: string;
  startDate?: string;
  endDate?: string;
  preferences?: string;
}

export async function analyzeBrowserContent(input: AnalyzeBrowserContentInput): Promise<AnalyzeBrowserContentOutput> {
  try {
    // Créer une instance du modèle OpenAI (qui utilise Ollama)
    const model = new OpenAIModel();
    
    if (model.disabled) {
      return {
        destination: undefined,
        startDate: undefined,
        endDate: undefined,
        preferences: undefined
      };
    }
    
    const systemPrompt = `
      Tu es un assistant de voyage qui analyse le contenu textuel d'une page web.
      Extrais les informations suivantes du texte:
      - destination: le lieu principal mentionné (ville, pays ou région)
      - startDate: la date de début du voyage au format YYYY-MM-DD (si mentionnée)
      - endDate: la date de fin du voyage au format YYYY-MM-DD (si mentionnée)
      - preferences: toute préférence ou exigence mentionnée pour le voyage
      
      Si certaines informations ne sont pas présentes, ne les inclus pas.
      Réponds uniquement au format JSON.
    `;
    
    const result = await model.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyse ce contenu web:\n${input.text}` }
    ]);
    
    // Tenter de parser la réponse JSON
    try {
      const parsedResponse = JSON.parse(result.content || '{}');
      return {
        destination: parsedResponse.destination,
        startDate: parsedResponse.startDate,
        endDate: parsedResponse.endDate,
        preferences: parsedResponse.preferences
      };
    } catch (error) {
      console.error('Erreur lors du parsing de la réponse JSON:', error);
      return {};
    }
  } catch (error) {
    console.error('Erreur lors de l\'analyse du contenu du navigateur:', error);
    return {};
  }
}
