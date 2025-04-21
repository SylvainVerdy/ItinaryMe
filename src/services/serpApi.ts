/**
 * Service pour effectuer des recherches web via SERP API
 */

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface WebSearchResponse {
  results: SearchResult[];
  timeTaken: number;
  status: 'success' | 'error';
}

/**
 * Fonction pour effectuer une recherche web
 * @param query La requête de recherche
 * @returns Les résultats de la recherche
 */
export async function webSearch(query: string): Promise<WebSearchResponse> {
  try {
    // Appel à l'API
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Erreur lors de la recherche web: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de la recherche web:', error);
    return {
      results: [],
      timeTaken: 0,
      status: 'error'
    };
  }
}
