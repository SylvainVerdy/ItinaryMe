import { createServer, Resource, ResourceId, ResourceData, Tool, ToolResults } from '@modelcontextprotocol/server';
import { OllamaClient } from '@langchain/ollama';
import axios from 'axios';
import { startServer } from 'model-context-protocol';
import { createOllamaTransport } from '../utils/ollamaTransport';

// Configuration
const SERP_API_KEY = process.env.SERP_API_KEY || "";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mlaprise/gemma-3-4b-it-qat-q4_0-gguf";
const SERP_API_URL = 'https://serpapi.com/search';

// Client Ollama pour les opérations LLM
const ollamaClient = new OllamaClient({
  baseUrl: OLLAMA_BASE_URL,
  model: OLLAMA_MODEL,
});

// Initialisation du serveur MCP
const server = createServer({
  name: "Service de prix de voyage",
  description: "Service spécialisé dans la recherche de prix pour transports, restaurants et hôtels avec analyse comparative",
  version: "1.0.0",
});

// Types de ressources pour le stockage des résultats
enum ResourceType {
  TRANSPORT = 'transport',
  HOTEL = 'hotel',
  RESTAURANT = 'restaurant',
}

// Format des résultats de recherche de prix
interface PriceSearchResult {
  title: string;
  link: string;
  snippet: string;
  price?: string;
  currency?: string;
  priceRange?: string;
  rating?: string;
  location?: string;
  date?: string;
  provider?: string;
}

// Ressource pour stocker les résultats de recherche de prix
class PriceResultsResource implements Resource {
  type = 'price_results';
  private cache: Record<string, PriceSearchResult[]> = {};
  
  // Différents types de recherche disponibles
  getAll(): ResourceId[] {
    return Object.values(ResourceType);
  }
  
  // Récupérer les données d'une recherche spécifique
  async get(id: ResourceId): Promise<ResourceData | null> {
    if (this.cache[id]) {
      return {
        type: this.type,
        data: this.cache[id],
      };
    }
    return null;
  }
  
  // Stocker des résultats dans le cache
  store(id: string, results: PriceSearchResult[]): void {
    this.cache[id] = results;
  }
}

// Instance de la ressource
const priceResultsResource = new PriceResultsResource();

// Enregistrer la ressource
server.registerResource(priceResultsResource);

// Fonction pour effectuer une recherche SERP API
async function searchSerpApi(query: string): Promise<PriceSearchResult[]> {
  try {
    const response = await axios.get(SERP_API_URL, {
      params: {
        q: query,
        api_key: SERP_API_KEY,
        engine: 'google',
        num: 5
      }
    });

    const organicResults = response.data.organic_results || [];
    const shoppingResults = response.data.shopping_results || [];
    
    // Combiner les résultats organiques et shopping
    const results = [
      ...organicResults.map((result: any) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        price: extractPrice(result.snippet),
        rating: result.rating || null,
        location: result.location || null,
      })),
      ...shoppingResults.map((result: any) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet || '',
        price: result.price || null,
        provider: result.source || null,
      })),
    ];
    
    return results;
  } catch (error) {
    console.error('Erreur lors de la recherche SERP API:', error);
    return [];
  }
}

// Fonction utilitaire pour extraire un prix d'un texte
function extractPrice(text: string): string | null {
  if (!text) return null;
  
  // Recherche des patterns de prix en euros
  const priceRegex = /(\d+(?:[\s,\.]\d+)*)\s*(?:€|EUR|euros)/i;
  const match = text.match(priceRegex);
  
  if (match && match[1]) {
    return match[1].trim() + ' €';
  }
  
  return null;
}

// Fonction pour traiter les résultats avec Ollama
async function analyzePricesWithOllama(query: string, results: PriceSearchResult[]): Promise<string> {
  const prompt = `
Analyse les résultats de recherche de prix suivants pour "${query}" et fournir une analyse détaillée:

${results.map((r, i) => `
Résultat ${i+1}:
Titre: ${r.title}
${r.price ? `Prix: ${r.price}` : ''}
${r.provider ? `Fournisseur: ${r.provider}` : ''}
${r.rating ? `Évaluation: ${r.rating}` : ''}
${r.location ? `Emplacement: ${r.location}` : ''}
Extrait: ${r.snippet}
`).join('\n')}

Fournir une analyse structurée avec:
1. Tableau comparatif des prix trouvés (du moins cher au plus cher)
2. Prix moyen et médian
3. Meilleures offres qualité/prix en fonction des évaluations
4. Recommandations et conseils pour économiser
`;

  const response = await ollamaClient.complete({
    prompt,
    temperature: 0.3,
    maxTokens: 1000,
  });

  return response.completion;
}

// Outil de recherche de prix de transport
const transportPriceSearchTool: Tool = {
  name: 'search_transport_prices',
  description: 'Recherche et analyse des prix de transport (avions, trains, bus)',
  parameters: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Type de transport (avion, train, bus)',
        enum: ['avion', 'train', 'bus'],
      },
      origin: {
        type: 'string',
        description: 'Lieu de départ',
      },
      destination: {
        type: 'string',
        description: 'Lieu d\'arrivée',
      },
      date: {
        type: 'string',
        description: 'Date du voyage (format: YYYY-MM-DD)',
      },
      passengers: {
        type: 'integer',
        description: 'Nombre de voyageurs',
        default: 1,
      },
    },
    required: ['type', 'origin', 'destination'],
  },
  handler: async (params: any): Promise<ToolResults> => {
    const { type, origin, destination, date, passengers } = params;
    
    let query = `prix ${type} de ${origin} à ${destination}`;
    if (date) query += ` le ${date}`;
    if (passengers && passengers > 1) query += ` pour ${passengers} personnes`;
    
    // Recherche via SERP API
    const results = await searchSerpApi(query);
    
    // Générer un ID unique pour cette recherche
    const searchId = `${type}_${origin}_${destination}_${date || 'anytime'}`;
    
    // Stocker les résultats dans le cache
    priceResultsResource.store(searchId, results);
    
    // Analyser les résultats avec Ollama
    const analysis = await analyzePricesWithOllama(query, results);
    
    return {
      type: 'text',
      text: analysis,
    };
  },
};

// Outil de recherche de prix d'hôtels
const hotelPriceSearchTool: Tool = {
  name: 'search_hotel_prices',
  description: 'Recherche et analyse des prix d\'hôtels et d\'hébergements',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'Ville ou région de l\'hôtel',
      },
      checkIn: {
        type: 'string',
        description: 'Date d\'arrivée (format: YYYY-MM-DD)',
      },
      checkOut: {
        type: 'string',
        description: 'Date de départ (format: YYYY-MM-DD)',
      },
      guests: {
        type: 'integer',
        description: 'Nombre de personnes',
        default: 2,
      },
      stars: {
        type: 'integer',
        description: 'Nombre minimum d\'étoiles (1-5)',
        minimum: 1,
        maximum: 5,
      },
      priceRange: {
        type: 'string',
        description: 'Gamme de prix (ex: "économique", "modéré", "luxe")',
      },
    },
    required: ['location'],
  },
  handler: async (params: any): Promise<ToolResults> => {
    const { location, checkIn, checkOut, guests, stars, priceRange } = params;
    
    let query = `prix hôtel à ${location}`;
    if (checkIn && checkOut) query += ` du ${checkIn} au ${checkOut}`;
    if (guests && guests > 1) query += ` pour ${guests} personnes`;
    if (stars) query += ` ${stars} étoiles`;
    if (priceRange) query += ` ${priceRange}`;
    
    // Recherche via SERP API
    const results = await searchSerpApi(query);
    
    // Générer un ID unique pour cette recherche
    const searchId = `hotel_${location}_${checkIn || 'anytime'}_${stars || 'any'}`;
    
    // Stocker les résultats dans le cache
    priceResultsResource.store(searchId, results);
    
    // Analyser les résultats avec Ollama
    const analysis = await analyzePricesWithOllama(query, results);
    
    return {
      type: 'text',
      text: analysis,
    };
  },
};

// Outil de recherche de prix de restaurants
const restaurantPriceSearchTool: Tool = {
  name: 'search_restaurant_prices',
  description: 'Recherche et analyse des prix de restaurants',
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
      priceLevel: {
        type: 'string',
        description: 'Niveau de prix (économique, intermédiaire, gastronomique)',
        enum: ['économique', 'intermédiaire', 'gastronomique'],
      },
      rating: {
        type: 'number',
        description: 'Note minimale (sur 5)',
        minimum: 1,
        maximum: 5,
      },
    },
    required: ['location'],
  },
  handler: async (params: any): Promise<ToolResults> => {
    const { location, cuisine, priceLevel, rating } = params;
    
    let query = `prix restaurant ${cuisine || ''} à ${location}`;
    if (priceLevel) query += ` ${priceLevel}`;
    if (rating) query += ` ${rating} étoiles minimum`;
    
    // Recherche via SERP API
    const results = await searchSerpApi(query);
    
    // Générer un ID unique pour cette recherche
    const searchId = `restaurant_${location}_${cuisine || 'any'}_${priceLevel || 'any'}`;
    
    // Stocker les résultats dans le cache
    priceResultsResource.store(searchId, results);
    
    // Analyser les résultats avec Ollama
    const analysis = await analyzePricesWithOllama(query, results);
    
    return {
      type: 'text',
      text: analysis,
    };
  },
};

// Enregistrement des outils
server.registerTool(transportPriceSearchTool);
server.registerTool(hotelPriceSearchTool);
server.registerTool(restaurantPriceSearchTool);

// Démarrage du serveur
export function startTravelPriceServer(port: number = 3301) {
  server.listen(port, () => {
    console.log(`Serveur de recherche de prix MCP démarré sur le port ${port}`);
  });
  
  return server;
}

export default startTravelPriceServer; 