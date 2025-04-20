'use server';

import { OpenAIModel } from '../openai-model';

interface GenerateNoteContentParams {
  prompt: string;
  tripContext: {
    destination: string;
    startDate: string;
    endDate: string;
    numPeople: number;
    [key: string]: any;
  };
}

interface GenerateNoteContentResult {
  content: string;
  success: boolean;
}

/**
 * Génère du contenu de note à partir d'une requête et d'un contexte de voyage
 */
export async function generateNoteContent({ prompt, tripContext }: GenerateNoteContentParams): Promise<GenerateNoteContentResult> {
  try {
    // Créer une instance du modèle OpenAI (qui utilise Ollama)
    const model = new OpenAIModel();
    
    // Vérifier si l'API est désactivée
    if (model.disabled) {
      console.log("API désactivée, impossible de générer des notes");
      return {
        content: "La génération de notes est désactivée. Veuillez activer l'API Ollama dans les paramètres.",
        success: false
      };
    }
    
    // Préparer le contexte pour le modèle
    const systemPrompt = `
      Tu es un assistant de voyage expert qui aide à créer des notes détaillées pour un voyage.
      
      Contexte du voyage:
      - Destination: ${tripContext.destination}
      - Dates: du ${tripContext.startDate} au ${tripContext.endDate}
      - Voyageurs: ${tripContext.numPeople} personne(s)
      
      Ta tâche est de générer une note complète et utile en fonction de la requête de l'utilisateur.
      Réponds en français, de manière structurée avec des sections claires.
      N'invente pas d'informations factuelles comme des horaires précis, des prix exacts ou des adresses.
      
      Exemples de sections possibles:
      - Points d'intérêt à visiter
      - Activités recommandées
      - Conseils pratiques
      - Idées de restaurants
      - Options de transport
      
      Format ta réponse avec une structure claire et des puces pour plus de lisibilité.
    `;
    
    console.log("Appel du modèle Ollama pour générer une note");
    const result = await model.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]);
    
    if (!result.content) {
      return {
        content: "Désolé, je n'ai pas pu générer de contenu pour cette note. Veuillez essayer une autre requête.",
        success: false
      };
    }
    
    return {
      content: result.content,
      success: true
    };
    
  } catch (error) {
    console.error('Erreur lors de la génération du contenu de la note:', error);
    return {
      content: "Une erreur s'est produite lors de la génération de la note. Veuillez réessayer plus tard.",
      success: false
    };
  }
} 