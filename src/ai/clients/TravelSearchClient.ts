import { createClient } from '@modelcontextprotocol/client';

// Interface pour les résultats de recherche de vols
interface FlightSearchResult {
  origin: string;
  destination: string;
  date?: string;
  options: Array<{
    airline: string;
    price: string;
    departureTime?: string;
    arrivalTime?: string;
    duration?: string;
    link?: string;
  }>;
  bestOption?: {
    airline: string;
    price: string;
  };
}

// Interface pour les résultats de recherche d'hôtels
interface HotelSearchResult {
  location: string;
  dates?: {
    checkIn: string;
    checkOut: string;
  };
  options: Array<{
    name: string;
    price: string;
    rating?: string;
    amenities?: string[];
    link?: string;
  }>;
  bestOption?: {
    name: string;
    price: string;
    rating?: string;
  };
}

// Interface pour les résultats de recherche de restaurants
interface RestaurantSearchResult {
  location: string;
  cuisine?: string;
  options: Array<{
    name: string;
    priceRange?: string;
    rating?: string;
    cuisine?: string;
    address?: string;
    link?: string;
  }>;
  bestOption?: {
    name: string;
    rating?: string;
    priceRange?: string;
  };
}

/**
 * Client pour rechercher des informations de voyage via le serveur MCP
 */
class TravelSearchClient {
  private client;

  /**
   * Crée une nouvelle instance du client de recherche de voyage
   * @param serverUrl URL du serveur MCP (par défaut: http://localhost:3300)
   */
  constructor(serverUrl: string = 'http://localhost:3300') {
    this.client = createClient({
      transport: {
        type: 'http',
        url: serverUrl,
      },
    });
  }

  /**
   * Recherche des vols entre deux destinations
   * @param origin Ville ou aéroport de départ
   * @param destination Ville ou aéroport d'arrivée
   * @param date Date du vol (format YYYY-MM-DD)
   * @param passengers Nombre de passagers
   * @returns Résultats de la recherche de vols
   */
  async searchFlights(
    origin: string,
    destination: string,
    date?: string,
    passengers: number = 1
  ): Promise<string> {
    try {
      const response = await this.client.useTool('search_flights', {
        origin,
        destination,
        date,
        passengers,
      });

      return response.text;
    } catch (error) {
      console.error('Erreur lors de la recherche de vols:', error);
      throw new Error(`Échec de la recherche de vols: ${error}`);
    }
  }

  /**
   * Recherche des hôtels dans une destination
   * @param location Ville ou région
   * @param checkIn Date d'arrivée (format YYYY-MM-DD)
   * @param checkOut Date de départ (format YYYY-MM-DD)
   * @param persons Nombre de personnes
   * @param priceRange Gamme de prix (ex: "économique", "modéré", "luxe")
   * @returns Résultats de la recherche d'hôtels
   */
  async searchHotels(
    location: string,
    checkIn?: string,
    checkOut?: string,
    persons: number = 2,
    priceRange?: string
  ): Promise<string> {
    try {
      const response = await this.client.useTool('search_hotels', {
        location,
        checkIn,
        checkOut,
        persons,
        priceRange,
      });

      return response.text;
    } catch (error) {
      console.error('Erreur lors de la recherche d\'hôtels:', error);
      throw new Error(`Échec de la recherche d'hôtels: ${error}`);
    }
  }

  /**
   * Recherche des restaurants dans une destination
   * @param location Ville ou quartier
   * @param cuisine Type de cuisine
   * @param priceRange Gamme de prix
   * @param rating Note minimale (sur 5)
   * @returns Résultats de la recherche de restaurants
   */
  async searchRestaurants(
    location: string,
    cuisine?: string,
    priceRange?: string,
    rating?: number
  ): Promise<string> {
    try {
      const response = await this.client.useTool('search_restaurants', {
        location,
        cuisine,
        priceRange,
        rating,
      });

      return response.text;
    } catch (error) {
      console.error('Erreur lors de la recherche de restaurants:', error);
      throw new Error(`Échec de la recherche de restaurants: ${error}`);
    }
  }

  /**
   * Ferme la connexion client
   */
  close() {
    // Si le client MCP a une méthode de fermeture, l'appeler ici
    if (this.client && typeof this.client.close === 'function') {
      this.client.close();
    }
  }
}

export default TravelSearchClient; 