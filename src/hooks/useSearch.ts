import { useState } from 'react';

interface SearchParams {
  q: string;
  type?: 'hotels' | 'flights' | 'activities' | 'travel' | 'general';
  destination?: string;
  origin?: string;
  checkIn?: string;
  checkOut?: string;
  departDate?: string;
  returnDate?: string;
  dates?: string;
  num?: number;
  hl?: string;
  gl?: string;
}

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface SearchResponse {
  searchResults: SearchResult[];
  error?: string;
}

/**
 * Hook pour effectuer des recherches web
 */
export function useSearch() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Effectue une recherche web générale
   */
  const search = async (params: SearchParams): Promise<SearchResult[]> => {
    setLoading(true);
    setError(null);

    try {
      // Construire l'URL avec les paramètres
      const url = new URL('/api/search', window.location.origin);
      
      // Ajouter tous les paramètres définis
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });

      // Effectuer la requête
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }

      const data: SearchResponse = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setResults(data.searchResults);
      return data.searchResults;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      setResults([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Recherche d'hôtels dans une destination
   */
  const searchHotels = async (destination: string, checkIn?: string, checkOut?: string): Promise<SearchResult[]> => {
    return search({
      q: destination,
      type: 'hotels',
      destination,
      checkIn,
      checkOut
    });
  };

  /**
   * Recherche de vols entre deux destinations
   */
  const searchFlights = async (origin: string, destination: string, departDate?: string, returnDate?: string): Promise<SearchResult[]> => {
    return search({
      q: `${origin} to ${destination}`,
      type: 'flights',
      origin,
      destination,
      departDate,
      returnDate
    });
  };

  /**
   * Recherche d'activités dans une destination
   */
  const searchActivities = async (destination: string): Promise<SearchResult[]> => {
    return search({
      q: destination,
      type: 'activities'
    });
  };

  /**
   * Recherche d'informations générales sur une destination
   */
  const searchTravelInfo = async (destination: string, dates?: string): Promise<SearchResult[]> => {
    return search({
      q: destination,
      type: 'travel',
      dates
    });
  };

  return {
    search,
    searchHotels,
    searchFlights,
    searchActivities,
    searchTravelInfo,
    results,
    loading,
    error
  };
} 