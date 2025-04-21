import { createServer, Resource, ResourceId, ResourceData, Tool, ToolResults } from '@modelcontextprotocol/server';
import { OllamaClient } from '@langchain/ollama';
import axios from 'axios';

// Configuration
const SERP_API_KEY = process.env.SERP_API_KEY || "";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mlaprise/gemma-3-4b-it-qat-q4_0-gguf";

// Client Ollama pour les opérations LLM
const ollamaClient = new OllamaClient({
  baseUrl: OLLAMA_BASE_URL,
  model: OLLAMA_MODEL,
});

// Initialisation du serveur MCP
const server = createServer({
  name: "Service de recherche de voyages",
  description: "Recherche de prix pour les transports, restaurants et hôtels en utilisant des APIs de recherche web",
  version: "1.0.0",
});

// Types de ressources
enum ResourceType {
  FLIGHT = 'flight',
  HOTEL = 'hotel',
  RESTAURANT = 'restaurant',
}

// Format des résultats de recherche
interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  price?: string;
  rating?: string;
  location?: string;
}

// Ressource pour stocker les résultats de recherche
class SearchResultsResource implements Resource {
  type = 'search_results';
  
  // Différents types de recherche disponibles
  getAll(): ResourceId[] {
    return Object.values(ResourceType);
  }
  
  // Récupérer les données d'une recherche spécifique
  async get(id: ResourceId): Promise<ResourceData | null> {
    // Cette fonction est appelée quand l'utilisateur demande des résultats spécifiques
    // Dans un cas réel, nous retournerions des résultats de cache si disponibles
    return null;
  }
}

// Enregistrer la ressource de résultats de recherche
server.registerResource(new SearchResultsResource());

// Fonction auxiliaire pour faire une recherche SERP API
async function searchSerpApi(query: string): Promise<SearchResult[]> {
  try {
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        api_key: SERP_API_KEY,
        q: query,
        engine: 'google',
      },
    });

    const results = response.data.organic_results || [];
    return results.map((result: any) => ({
      title: result.title,
      link: result.link,
      snippet: result.snippet,
      price: result.price || null,
      rating: result.rating || null,
      location: result.location || null,
    }));
  } catch (error) {
    console.error('Erreur lors de la recherche SERP API:', error);
    return [];
  }
}

// Fonction pour traiter les résultats avec Ollama (analyse et extraction d'informations pertinentes)
async function processResultsWithOllama(query: string, results: SearchResult[]): Promise<string> {
  const prompt = `
Analyse les résultats de recherche suivants concernant "${query}" et extrait les informations les plus pertinentes:

${results.map((r, i) => `
Résultat ${i+1}:
Titre: ${r.title}
Lien: ${r.link}
Extrait: ${r.snippet}
${r.price ? `Prix: ${r.price}` : ''}
${r.rating ? `Évaluation: ${r.rating}` : ''}
${r.location ? `Emplacement: ${r.location}` : ''}
`).join('\n')}

Fournir un résumé structuré contenant:
1. Les meilleures options avec leurs prix (si disponibles)
2. Comparaison des différentes options
3. Recommandations basées sur les évaluations et les avis
`;

  const response = await ollamaClient.complete({
    prompt,
    temperature: 0.5,
    maxTokens: 800,
  });

  return response.completion;
}

// Outil de recherche de vols
const flightSearchTool: Tool = {
  name: 'search_flights',
  description: 'Recherche des informations sur les vols et billets d'avion',
  parameters: {
    type: 'object',
    properties: {
      origin: {
        type: 'string',
        description: 'Ville ou aéroport de départ',
      },
      destination: {
        type: 'string',
        description: 'Ville ou aéroport d'arrivée',
      },
      date: {
        type: 'string',
        description: 'Date du vol au format YYYY-MM-DD',
      },
      passengers: {
        type: 'integer',
        description: 'Nombre de passagers',
        default: 1,
      },
    },
    required: ['origin', 'destination'],
  },
  handler: async (params: any): Promise<ToolResults> => {
    const { origin, destination, date, passengers } = params;
    const query = `vol ${origin} à ${destination}${date ? ` le ${date}` : ''} ${passengers ? `pour ${passengers} passagers` : ''}`;
    
    // Recherche via SERP API
    const results = await searchSerpApi(query);
    
    // Traitement des résultats avec Ollama
    const processedResults = await processResultsWithOllama(query, results);
    
    return {
      type: 'text',
      text: processedResults,
    };
  },
};

// Outil de recherche d'hôtels
const hotelSearchTool: Tool = {
  name: 'search_hotels',
  description: 'Recherche des informations sur les hôtels et hébergements',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'Ville ou région de l\'hôtel',
      },
      checkIn: {
        type: 'string',
        description: 'Date d\'arrivée au format YYYY-MM-DD',
      },
      checkOut: {
        type: 'string', 
        description: 'Date de départ au format YYYY-MM-DD',
      },
      persons: {
        type: 'integer',
        description: 'Nombre de personnes',
        default: 2,
      },
      priceRange: {
        type: 'string',
        description: 'Gamme de prix (ex: "économique", "modéré", "luxe")',
      },
    },
    required: ['location'],
  },
  handler: async (params: any): Promise<ToolResults> => {
    const { location, checkIn, checkOut, persons, priceRange } = params;
    let query = `hôtels à ${location}`;
    
    if (checkIn && checkOut) {
      query += ` du ${checkIn} au ${checkOut}`;
    }
    
    if (persons) {
      query += ` pour ${persons} personnes`;
    }
    
    if (priceRange) {
      query += ` ${priceRange}`;
    }
    
    // Recherche via SERP API
    const results = await searchSerpApi(query);
    
    // Traitement des résultats avec Ollama
    const processedResults = await processResultsWithOllama(query, results);
    
    return {
      type: 'text',
      text: processedResults,
    };
  },
};

// Outil de recherche de restaurants
const restaurantSearchTool: Tool = {
  name: 'search_restaurants',
  description: 'Recherche des informations sur les restaurants',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'Ville ou quartier du restaurant',
      },
      cuisine: {
        type: 'string',
        description: 'Type de cuisine (ex: "italienne", "japonaise")',
      },
      priceRange: {
        type: 'string',
        description: 'Gamme de prix (ex: "économique", "modéré", "luxe")',
      },
      rating: {
        type: 'number',
        description: 'Note minimale (sur 5)',
      },
    },
    required: ['location'],
  },
  handler: async (params: any): Promise<ToolResults> => {
    const { location, cuisine, priceRange, rating } = params;
    let query = `restaurants à ${location}`;
    
    if (cuisine) {
      query += ` cuisine ${cuisine}`;
    }
    
    if (priceRange) {
      query += ` ${priceRange}`;
    }
    
    if (rating) {
      query += ` ${rating} étoiles et plus`;
    }
    
    // Recherche via SERP API
    const results = await searchSerpApi(query);
    
    // Traitement des résultats avec Ollama
    const processedResults = await processResultsWithOllama(query, results);
    
    return {
      type: 'text',
      text: processedResults,
    };
  },
};

// Enregistrement des outils
server.registerTool(flightSearchTool);
server.registerTool(hotelSearchTool);
server.registerTool(restaurantSearchTool);

// Démarrage du serveur
export function startTravelSearchServer(port: number = 3300) {
  server.listen(port, () => {
    console.log(`Serveur de recherche de voyages MCP démarré sur le port ${port}`);
  });
  
  return server;
}

export default startTravelSearchServer; 