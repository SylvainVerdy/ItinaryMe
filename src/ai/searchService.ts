import axios from 'axios';

interface SearchParams {
  q: string;
  num?: number;
  location?: string;
  hl?: string;
  gl?: string;
}

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SearchResponse {
  searchResults: SearchResult[];
  error?: string;
}

/**
 * Service de recherche web utilisant SerpAPI
 */
export class SearchService {
  private apiKey: string;
  private baseUrl: string = 'https://serpapi.com/search';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SERPAPI_API_KEY || '46ceae7f12b92954fc5bd8f0834cd0b797b6ea2542b343748874f9987c92f7f8';
  }

  /**
   * Effectue une recherche web à partir d'une requête
   */
  public async search(params: SearchParams): Promise<SearchResponse> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          ...params,
          api_key: this.apiKey,
          engine: 'google',
          google_domain: 'google.fr',
          output: 'json'
        }
      });

      if (response.data.error) {
        return {
          searchResults: [],
          error: response.data.error
        };
      }

      const organicResults = response.data.organic_results || [];
      const searchResults = organicResults.map((result: any, index: number) => ({
        title: result.title || '',
        link: result.link || '',
        snippet: result.snippet || '',
        position: index + 1
      }));

      return {
        searchResults
      };
    } catch (error) {
      console.error('Erreur lors de la recherche web:', error);
      return {
        searchResults: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Effectue une recherche spécifique pour les voyages et destinations
   */
  public async searchTravelInfo(destination: string, dates?: string): Promise<SearchResponse> {
    const query = `voyage ${destination}${dates ? ` ${dates}` : ''}`;
    return this.search({
      q: query,
      num: 10,
      hl: 'fr',
      gl: 'fr'
    });
  }

  /**
   * Recherche des hôtels dans une destination
   */
  public async searchHotels(destination: string, checkIn?: string, checkOut?: string): Promise<SearchResponse> {
    const dateInfo = checkIn && checkOut ? ` du ${checkIn} au ${checkOut}` : '';
    const query = `meilleurs hôtels à ${destination}${dateInfo}`;
    
    return this.search({
      q: query,
      num: 8,
      hl: 'fr',
      gl: 'fr'
    });
  }

  /**
   * Recherche des activités et attractions dans une destination
   */
  public async searchActivities(destination: string): Promise<SearchResponse> {
    return this.search({
      q: `meilleures activités choses à faire à ${destination}`,
      num: 8,
      hl: 'fr',
      gl: 'fr'
    });
  }

  /**
   * Recherche des vols pour une destination
   */
  public async searchFlights(origin: string, destination: string, departDate?: string, returnDate?: string): Promise<SearchResponse> {
    const dateInfo = departDate ? ` le ${departDate}${returnDate ? ` retour le ${returnDate}` : ''}` : '';
    const query = `vols de ${origin} à ${destination}${dateInfo}`;
    
    return this.search({
      q: query,
      num: 5,
      hl: 'fr',
      gl: 'fr'
    });
  }
} 