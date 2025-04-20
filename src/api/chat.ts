import { OpenAIModel } from '@/ai/openai-model';
import { BrowserAgent } from '@/ai/browserAgent';
import { API_DISABLED } from '@/ai/ai-instance';
import { interpretTravelRequest } from '@/ai/flows/interpret-travel-request';
import { noteService } from '@/services/noteService';

// Utiliser le modèle Ollama
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mlaprise/gemma-3-4b-it-qat-q4_0-gguf';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  tripContext?: {
    tripId?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    numPeople?: number;
    budget?: string;
  };
}

interface ChatResponse {
  content: string;
  tripInfoExtracted?: {
    destination?: string;
    startDate?: string;
    endDate?: string;
    numPeople?: number;
    budget?: string;
    isValidTravelRequest?: boolean;
  };
  webSearchResults?: {
    summary?: string;
    links?: {name: string, url: string}[];
  };
}

/**
 * Traite une requête de chat et retourne une réponse
 */
export async function processChat(request: ChatRequest): Promise<ChatResponse> {
  try {
    // Vérifier les messages
    if (!request.messages || request.messages.length === 0) {
      return { content: "Aucun message fourni" };
    }
    
    // Récupérer le dernier message de l'utilisateur
    const lastUserMessage = [...request.messages].reverse().find(msg => msg.role === 'user');
    if (!lastUserMessage) {
      return { content: "Aucun message utilisateur trouvé" };
    }
    
    // Vérifier si le message demande des informations qui pourraient nécessiter une recherche web
    const needsWebSearch = shouldPerformWebSearch(lastUserMessage.content);
    
    let webSearchResults = null;
    if (needsWebSearch) {
      // Effectuer une recherche web
      const browserAgent = new BrowserAgent();
      const searchQuery = formatWebSearchQuery(lastUserMessage.content, request.tripContext);
      
      console.log("Effectuer une recherche web pour:", searchQuery);
      const searchResults = await browserAgent.searchWeb(searchQuery, OLLAMA_MODEL);
      
      if (searchResults.success && searchResults.content) {
        webSearchResults = {
          summary: searchResults.content,
          links: searchResults.links || []
        };
      }
    }
    
    // Extraire les informations de voyage si présentes
    let tripInfoExtracted = null;
    if (isLikelyTravelRequest(lastUserMessage.content)) {
      const travelInfo = await interpretTravelRequest({ request: lastUserMessage.content });
      if (travelInfo.isValidTravelRequest) {
        tripInfoExtracted = travelInfo;
      }
    }
    
    // Construire un prompt enrichi pour le modèle
    const systemMessage = generateSystemPrompt(request.tripContext, webSearchResults);
    
    // Appeler le modèle Ollama
    const model = new OpenAIModel({
      model: OLLAMA_MODEL,
      temperature: 0.5
    });
    
    if (API_DISABLED) {
      return {
        content: "Je ne peux pas traiter cette demande actuellement car l'API est désactivée. Veuillez activer l'API dans les paramètres.",
        tripInfoExtracted,
        webSearchResults: webSearchResults ? {
          summary: "Recherche web désactivée",
          links: []
        } : undefined
      };
    }
    
    // Préparer les messages pour le modèle
    const messagesForModel: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      ...request.messages.filter(msg => msg.role !== 'system')
    ];
    
    // Si nous avons des résultats de recherche web, les ajouter comme contexte
    if (webSearchResults) {
      // Insérer un contexte avant le dernier message utilisateur
      const lastUserIndex = messagesForModel.findIndex(msg => 
        msg.role === 'user' && msg.content === lastUserMessage.content
      );
      
      if (lastUserIndex > 0) {
        messagesForModel.splice(lastUserIndex, 0, {
          role: 'assistant',
          content: "Je vais effectuer une recherche pour vous aider avec votre question."
        });
      }
    }
    
    // Envoyer la requête au modèle
    const response = await model.chat(messagesForModel);
    
    // Enrichir la réponse avec des liens si disponibles
    let enhancedContent = response.content || "Je n'ai pas pu générer de réponse.";
    
    if (webSearchResults && webSearchResults.links && webSearchResults.links.length > 0) {
      // Ajouter les liens pertinents à la fin de la réponse
      enhancedContent += "\n\n**Liens utiles:**\n";
      webSearchResults.links.forEach(link => {
        enhancedContent += `\n- [${link.name}](${link.url})`;
      });
    }
    
    return {
      content: enhancedContent,
      tripInfoExtracted,
      webSearchResults: webSearchResults ? {
        summary: webSearchResults.summary,
        links: webSearchResults.links
      } : undefined
    };
    
  } catch (error) {
    console.error("Erreur lors du traitement du chat:", error);
    return {
      content: "Désolé, une erreur s'est produite lors du traitement de votre message. Veuillez réessayer."
    };
  }
}

/**
 * Détermine si une recherche web est nécessaire
 */
function shouldPerformWebSearch(message: string): boolean {
  // Utiliser la logique du service de notes
  return noteService.shouldPerformWebSearch(message);
}

/**
 * Formate la requête de recherche web
 */
function formatWebSearchQuery(message: string, tripContext?: any): string {
  // Extraire les mots-clés du message
  const keywords = message.replace(/[^\w\s]/gi, ' ')
                         .split(' ')
                         .filter(word => word.length > 3)
                         .join(' ');
  
  // Ajouter le contexte du voyage s'il est disponible
  if (tripContext) {
    const { destination, startDate, endDate, numPeople } = tripContext;
    let query = keywords;
    
    if (destination) {
      query += ` ${destination}`;
    }
    
    if (startDate && endDate) {
      query += ` du ${startDate} au ${endDate}`;
    }
    
    if (numPeople && numPeople > 1) {
      query += ` pour ${numPeople} personnes`;
    }
    
    return query.trim();
  }
  
  return keywords;
}

/**
 * Vérifie si le message semble être une demande de voyage
 */
function isLikelyTravelRequest(message: string): boolean {
  const travelPatterns = [
    /voyage/i,
    /vacances/i,
    /séjour/i,
    /itinéraire/i,
    /visiter/i,
    /explorer/i,
    /découvrir/i,
    /destination/i,
    /planifier/i,
    /organiser/i,
    /hôtel/i,
    /restaurant/i,
    /réservation/i,
    /billet/i,
    /vol/i,
    /train/i,
    /transport/i
  ];
  
  return travelPatterns.some(pattern => pattern.test(message));
}

/**
 * Génère un prompt système enrichi
 */
function generateSystemPrompt(tripContext: any, webSearchResults: any): string {
  let systemPrompt = `
  Tu es un assistant de voyage expert qui aide les utilisateurs à planifier et organiser leurs voyages.
  Réponds toujours en français de manière concise, utile et précise.
  `;
  
  // Ajouter le contexte du voyage s'il est disponible
  if (tripContext) {
    const { destination, startDate, endDate, numPeople, budget } = tripContext;
    systemPrompt += `\nContexte du voyage:`;
    
    if (destination) {
      systemPrompt += `\n- Destination: ${destination}`;
    }
    
    if (startDate && endDate) {
      systemPrompt += `\n- Dates: du ${startDate} au ${endDate}`;
    }
    
    if (numPeople) {
      systemPrompt += `\n- Voyageurs: ${numPeople} personne(s)`;
    }
    
    if (budget) {
      systemPrompt += `\n- Budget: ${budget}`;
    }
  }
  
  // Ajouter les résultats de recherche web s'ils sont disponibles
  if (webSearchResults && webSearchResults.summary) {
    systemPrompt += `\n\nInformations récentes issues de recherches sur internet:
    ${webSearchResults.summary}
    
    Si pertinent, utilise ces informations pour enrichir ta réponse. 
    Si des liens sont mentionnés et pertinents, tu peux les inclure dans ta réponse.
    `;
  }
  
  systemPrompt += `\nTes réponses doivent être structurées, informatives et utiles pour l'utilisateur.`;
  
  return systemPrompt;
} 