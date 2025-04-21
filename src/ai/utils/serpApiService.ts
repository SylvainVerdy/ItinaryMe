import axios from 'axios';

/**
 * Interface pour les résultats de recherche
 */
export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

/**
 * Interface pour la réponse de l'API SERP
 */
export interface SerpApiResponse {
  organic_results: SearchResult[];
  error?: string;
}

/**
 * Service pour interagir avec SerpApi
 */
export class SerpApiService {
  private apiKey: string;
  private baseUrl: string;

  /**
   * Initialise le service SerpApi
   * @param apiKey Clé API pour SerpApi
   * @param baseUrl URL de base optionnelle (par défaut: 'https://serpapi.com/search')
   */
  constructor(apiKey: string, baseUrl: string = 'https://serpapi.com/search') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Effectue une recherche via SerpApi
   * @param query Termes de recherche
   * @param options Options supplémentaires pour la recherche
   * @returns Les résultats de la recherche
   */
  async search(query: string, options: Record<string, any> = {}): Promise<SerpApiResponse> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          api_key: this.apiKey,
          q: query,
          engine: options.engine || 'google',
          ...options
        }
      });

      return response.data;
    } catch (error: any) {
      console.error("Erreur lors de la recherche SERP:", error.message);
      return {
        organic_results: [],
        error: error.message
      };
    }
  }

  /**
   * Recherche des informations sur les prix des billets de transport
   * @param from Lieu de départ
   * @param to Destination
   * @param date Date du voyage (optionnelle)
   * @returns Résultats de recherche concernant les prix de transport
   */
  async searchTransportPrices(from: string, to: string, date?: string): Promise<SerpApiResponse> {
    const dateStr = date ? ` le ${date}` : '';
    const query = `prix billet transport de ${from} à ${to}${dateStr}`;
    return this.search(query, { num: 10 });
  }

  /**
   * Recherche des informations sur les restaurants
   * @param location Lieu de recherche
   * @param cuisine Type de cuisine (optionnel)
   * @returns Résultats de recherche concernant les restaurants
   */
  async searchRestaurants(location: string, cuisine?: string): Promise<SerpApiResponse> {
    const cuisineStr = cuisine ? ` ${cuisine}` : '';
    const query = `restaurants${cuisineStr} à ${location} prix`;
    return this.search(query, { num: 10 });
  }

  /**
   * Recherche des informations sur les hôtels
   * @param location Lieu de recherche
   * @param checkIn Date d'arrivée (optionnelle)
   * @param checkOut Date de départ (optionnelle)
   * @returns Résultats de recherche concernant les hôtels
   */
  async searchHotels(location: string, checkIn?: string, checkOut?: string): Promise<SerpApiResponse> {
    let query = `hôtels à ${location} prix`;
    if (checkIn && checkOut) {
      query += ` du ${checkIn} au ${checkOut}`;
    }
    return this.search(query, { num: 10 });
  }
} 