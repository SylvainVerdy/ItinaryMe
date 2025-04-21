// Ce fichier est une version temporaire qui n'utilise pas @modelcontextprotocol/client
// Interfaces pour les résultats de recherche (inchangées)

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
 * Client pour rechercher des informations de voyage (version temporaire sans dépendance MCP)
 */
class TravelSearchClient {
  private serverUrl: string;

  /**
   * Crée une nouvelle instance du client de recherche de voyage
   * @param serverUrl URL du serveur (non utilisé dans cette version temporaire)
   */
  constructor(serverUrl: string = 'http://localhost:3300') {
    this.serverUrl = serverUrl;
    console.warn('TravelSearchClient: Version temporaire sans MCP initialisée');
  }

  /**
   * Recherche des vols entre deux destinations
   * @param origin Ville ou aéroport de départ
   * @param destination Ville ou aéroport d'arrivée
   * @param date Date du vol (format YYYY-MM-DD)
   * @param passengers Nombre de passagers
   * @returns Résultats de recherche de vols
   */
  async searchFlights(
    origin: string,
    destination: string,
    date?: string,
    passengers: number = 1
  ): Promise<FlightSearchResult> {
    console.log(`Recherche de vols (temporaire): ${origin} → ${destination}, ${date}, ${passengers} passagers`);
    
    // Retourner directement des données mockées au format attendu
    return {
      origin,
      destination,
      date: date || "2024-01-01",
      options: [
        {
          airline: "Air France",
          price: "250€",
          departureTime: "10:00",
          arrivalTime: "12:00",
          duration: "2h00",
          link: "#"
        },
        {
          airline: "Lufthansa",
          price: "300€",
          departureTime: "14:30",
          arrivalTime: "16:45",
          duration: "2h15",
          link: "#"
        },
        {
          airline: "British Airways",
          price: "280€",
          departureTime: "08:15",
          arrivalTime: "10:25",
          duration: "2h10",
          link: "#"
        }
      ],
      bestOption: {
        airline: "Air France",
        price: "250€"
      }
    };
  }

  /**
   * Recherche des hôtels dans une destination
   * @param location Ville ou région
   * @param checkIn Date d'arrivée (format YYYY-MM-DD)
   * @param checkOut Date de départ (format YYYY-MM-DD)
   * @param persons Nombre de personnes
   * @param priceRange Gamme de prix (ex: "économique", "modéré", "luxe")
   * @returns Résultats de recherche d'hôtels
   */
  async searchHotels(
    location: string,
    checkIn?: string,
    checkOut?: string,
    persons: number = 2,
    priceRange?: string
  ): Promise<HotelSearchResult> {
    console.log(`Recherche d'hôtels (temporaire): ${location}, du ${checkIn} au ${checkOut}, ${persons} personnes, ${priceRange}`);
    
    // Retourner directement des données mockées au format attendu
    return {
      location,
      dates: {
        checkIn: checkIn || "2024-01-01",
        checkOut: checkOut || "2024-01-05"
      },
      options: [
        {
          name: "Grand Hôtel Central",
          price: "120€ / nuit",
          rating: "4.5/5",
          amenities: ["WiFi", "Piscine", "Spa", "Restaurant"],
          link: "#"
        },
        {
          name: "Résidence Luxe",
          price: "180€ / nuit",
          rating: "4.8/5",
          amenities: ["WiFi", "Piscine", "Spa", "Restaurant", "Fitness"],
          link: "#"
        },
        {
          name: "Hôtel du Port",
          price: "95€ / nuit",
          rating: "4.2/5",
          amenities: ["WiFi", "Restaurant", "Bar"],
          link: "#"
        }
      ],
      bestOption: {
        name: "Grand Hôtel Central",
        price: "120€ / nuit",
        rating: "4.5/5"
      }
    };
  }

  /**
   * Recherche des restaurants dans une destination
   * @param location Ville ou quartier
   * @param cuisine Type de cuisine
   * @param priceRange Gamme de prix
   * @param rating Note minimale (sur 5)
   * @returns Résultats de recherche de restaurants
   */
  async searchRestaurants(
    location: string,
    cuisine?: string,
    priceRange?: string,
    rating?: number
  ): Promise<RestaurantSearchResult> {
    console.log(`Recherche de restaurants (temporaire): ${location}, cuisine ${cuisine}, prix ${priceRange}, note min. ${rating}`);
    
    // Retourner directement des données mockées au format attendu
    return {
      location,
      cuisine: cuisine || "Française",
      options: [
        {
          name: "Le Gourmet",
          priceRange: priceRange || "$$",
          rating: "4.2/5",
          cuisine: cuisine || "Française",
          address: "123 Rue Principale",
          link: "#"
        },
        {
          name: "La Brasserie Parisienne",
          priceRange: priceRange || "$$$",
          rating: "4.5/5",
          cuisine: cuisine || "Française",
          address: "45 Avenue des Champs",
          link: "#"
        },
        {
          name: "Le Petit Bistro",
          priceRange: priceRange || "$",
          rating: "4.0/5",
          cuisine: cuisine || "Française",
          address: "78 Rue du Commerce",
          link: "#"
        }
      ],
      bestOption: {
        name: "La Brasserie Parisienne",
        rating: "4.5/5",
        priceRange: priceRange || "$$$"
      }
    };
  }

  /**
   * Ferme la connexion client (méthode fictive)
   */
  close() {
    console.log('TravelSearchClient: Fermeture de la connexion (opération fictive)');
  }
}

export default TravelSearchClient; 