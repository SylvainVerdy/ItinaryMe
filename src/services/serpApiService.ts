import { HotelSearchResult, FlightSearchResult } from '@/types/search';

const SERPAPI_KEY = process.env.SERPAPI_API_KEY || '';

/**
 * Service pour effectuer des recherches via SerpAPI
 */
export class SerpApiService {
  /**
   * Recherche d'hôtels via Google Hotels API de SerpAPI
   */
  static async searchHotels(
    location: string,
    checkIn?: string,
    checkOut?: string,
    guests: number = 2,
    currency: string = 'EUR'
  ): Promise<HotelSearchResult> {
    try {
      // Construction des paramètres pour SerpAPI
      const params = new URLSearchParams({
        engine: 'google_hotels',
        q: location,
        api_key: SERPAPI_KEY,
        currency,
        adults: guests.toString(),
        hl: 'fr',
        gl: 'fr'
      });

      // Ajout des dates si présentes
      if (checkIn) params.append('check_in_date', checkIn);
      if (checkOut) params.append('check_out_date', checkOut);

      const apiUrl = `https://serpapi.com/search?${params.toString()}`;
      console.log("SerpAPI URL:", apiUrl);
      console.log("API Key utilisée:", SERPAPI_KEY?.substring(0, 5) + "..." + SERPAPI_KEY?.substring(SERPAPI_KEY.length - 5));

      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erreur SerpAPI:", response.status, errorText);
        throw new Error(`Erreur API SerpAPI: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Réponse SerpAPI:", JSON.stringify(data).substring(0, 500) + "...");
      
      // Transformation des données pour correspondre à notre format interne
      return this.formatHotelResults(data, location, checkIn, checkOut);
    } catch (error) {
      console.error('Erreur lors de la recherche d\'hôtels via SerpAPI:', error);
      throw error;
    }
  }

  /**
   * Recherche de vols via Google Flights API de SerpAPI
   */
  static async searchFlights(
    origin: string,
    destination: string,
    date?: string,
    returnDate?: string,
    passengers: number = 1,
    currency: string = 'EUR'
  ): Promise<FlightSearchResult> {
    try {
      // Obtenir les codes IATA pour l'origine et la destination
      const originCode = await this.getCityAirportCode(origin);
      const destinationCode = await this.getCityAirportCode(destination);
      
      // Construction des paramètres pour SerpAPI
      const params = new URLSearchParams({
        engine: 'google_flights',
        api_key: SERPAPI_KEY,
        departure_id: originCode,
        arrival_id: destinationCode,
        currency,
        hl: 'fr',
        gl: 'fr',
        stops: '0' // "0" = any number of stops (default) pour inclure tous les types de vols
      });

      // Ajout des dates si présentes
      if (date) params.append('outbound_date', date);
      if (returnDate) params.append('return_date', returnDate);
      if (passengers > 1) params.append('adults', passengers.toString());

      const apiUrl = `https://serpapi.com/search?${params.toString()}`;
      console.log("SerpAPI URL de recherche de vols:", apiUrl);
      console.log("API Key utilisée:", SERPAPI_KEY?.substring(0, 5) + "..." + SERPAPI_KEY?.substring(SERPAPI_KEY.length - 5));
      console.log("Origine:", origin, "→", originCode);
      console.log("Destination:", destination, "→", destinationCode);

      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erreur SerpAPI Flights:", response.status, errorText);
        throw new Error(`Erreur API SerpAPI: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Réponse SerpAPI Flights (début):", JSON.stringify(data).substring(0, 500) + "...");
      
      // Vérifier si l'API a retourné une erreur
      if (data.error) {
        throw new Error(`Erreur SerpAPI: ${data.error}`);
      }
      
      // Vérifier la structure de la réponse pour être sûr qu'elle contient des résultats de vols
      if (!data.best_flights && !data.other_flights) {
        console.error("Structure de réponse inattendue:", JSON.stringify(data).substring(0, 1000));
        throw new Error("Aucun résultat de vol trouvé dans la réponse de l'API");
      }
      
      // Transformation des données pour correspondre à notre format interne
      return this.formatFlightResults(data, origin, destination, date);
    } catch (error) {
      console.error('Erreur lors de la recherche de vols via SerpAPI:', error);
      throw error;
    }
  }

  /**
   * Formate les résultats de la recherche d'hôtels
   */
  private static formatHotelResults(
    data: any, 
    location: string,
    checkIn?: string,
    checkOut?: string
  ): HotelSearchResult {
    const hotels = data.properties || [];
    
    return {
      location,
      dates: {
        checkIn: checkIn || "Non spécifié",
        checkOut: checkOut || "Non spécifié"
      },
      options: hotels.map((hotel: any) => ({
        name: hotel.name || "Hôtel inconnu",
        price: hotel.rate_per_night?.lowest || "Prix non disponible",
        rating: hotel.overall_rating ? `${hotel.overall_rating}/5` : "Note non disponible",
        amenities: hotel.amenities || [],
        link: hotel.link || "#"
      })),
      bestOption: hotels.length > 0 ? {
        name: hotels[0].name || "Hôtel inconnu",
        price: hotels[0].rate_per_night?.lowest || "Prix non disponible",
        rating: hotels[0].overall_rating ? `${hotels[0].overall_rating}/5` : "Note non disponible"
      } : undefined
    };
  }

  /**
   * Formate les résultats de la recherche de vols
   */
  private static formatFlightResults(
    data: any,
    origin: string,
    destination: string,
    date?: string
  ): FlightSearchResult {
    // Combiner les vols "best_flights" et "other_flights" pour récupérer tous les résultats
    const allFlights = [
      ...(data.best_flights || []), 
      ...(data.other_flights || [])
    ];
    
    console.log(`Nombre total de vols trouvés: ${allFlights.length}`);
    
    // Transformer les résultats en notre format interne
    const formattedFlights = allFlights.map((flight: any) => {
      // Calculer le nombre d'escales
      const numStops = flight.layovers ? flight.layovers.length : 0;
      
      // Créer un objet pour les escales
      const layovers = flight.layovers ? flight.layovers.map((layover: any) => ({
        airport: layover.name,
        duration: this.formatDuration(layover.duration)
      })) : [];
      
      // Déterminer le type de vol (direct ou avec correspondance)
      const flightType = numStops === 0 ? 'direct' : `${numStops} escale${numStops > 1 ? 's' : ''}`;
      
      return {
        airline: flight.flights[0].airline || "Compagnie inconnue",
        price: flight.price ? `${flight.price} ${data.search_parameters?.currency || 'EUR'}` : "Prix non disponible",
        departureTime: flight.flights[0].departure_airport?.time || "Heure non disponible",
        arrivalTime: flight.flights[flight.flights.length - 1].arrival_airport?.time || "Heure non disponible",
        duration: this.formatDuration(flight.total_duration) || "Durée inconnue",
        stops: numStops,
        layovers: layovers,
        flightType: flightType,
        link: "#",
        flightDetails: flight.flights.map((segment: any) => ({
          airline: segment.airline || "Compagnie inconnue",
          flightNumber: segment.flight_number || "Numéro inconnu",
          departureAirport: segment.departure_airport?.name || "Aéroport inconnu",
          departureTime: segment.departure_airport?.time || "Heure inconnue",
          arrivalAirport: segment.arrival_airport?.name || "Aéroport inconnu",
          arrivalTime: segment.arrival_airport?.time || "Heure inconnue",
          duration: this.formatDuration(segment.duration) || "Durée inconnue"
        }))
      };
    });
    
    // Trier les vols par prix (du moins cher au plus cher)
    const sortedFlights = [...formattedFlights].sort((a, b) => {
      const priceA = this.extractPrice(a.price);
      const priceB = this.extractPrice(b.price);
      return priceA - priceB;
    });
    
    // Trouver la meilleure option (généralement la moins chère)
    const bestOption = sortedFlights.length > 0 ? {
      airline: sortedFlights[0].airline,
      price: sortedFlights[0].price
    } : undefined;
    
    return {
      origin,
      destination,
      date: date || "Non spécifié",
      options: sortedFlights,
      bestOption
    };
  }
  
  /**
   * Extrait le prix numérique d'une chaîne (ex: "350 €" -> 350)
   */
  private static extractPrice(priceStr: string): number {
    const match = priceStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
  }
  
  /**
   * Formatage de la durée en minutes vers un format lisible (ex: 120 -> "2h00")
   */
  private static formatDuration(minutes?: number): string | undefined {
    if (!minutes) return undefined;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Table de correspondance de certaines villes avec leur code IATA
   * Utilisée comme solution de repli si l'API ne fonctionne pas
   */
  private static CITY_TO_AIRPORT_CODE: Record<string, string> = {
    'paris': 'CDG',
    'london': 'LHR',
    'new york': 'JFK',
    'berlin': 'BER',
    'madrid': 'MAD',
    'rome': 'FCO',
    'barcelona': 'BCN',
    'amsterdam': 'AMS',
  };

  /**
   * Obtient les coordonnées géographiques d'une ville en utilisant l'API de géocodage de Google
   */
  private static async getCoordinates(city: string): Promise<{lat: number, lng: number} | null> {
    try {
      // On utilise l'API de géocodage Nominatim (OpenStreetMap) qui est gratuite
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
      
      if (!response.ok) {
        throw new Error(`Erreur API Nominatim: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération des coordonnées:', error);
      return null;
    }
  }

  /**
   * Obtient le code IATA d'un aéroport à partir des coordonnées GPS à l'aide de l'API iatageo.com
   */
  private static async getAirportCodeFromCoordinates(lat: number, lng: number): Promise<string | null> {
    try {
      // API iatageo.com comme mentionné dans le lien StackOverflow
      const response = await fetch(`https://iatageo.com/getCode/${lat}/${lng}`);
      
      if (!response.ok) {
        throw new Error(`Erreur API iatageo: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.code) {
        return data.code;
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération du code IATA:', error);
      return null;
    }
  }

  /**
   * Obtient le code IATA d'un aéroport à partir d'un nom de ville
   * Utilise d'abord la table de correspondance, puis essaie l'API si nécessaire
   */
  private static async getCityAirportCode(cityName: string): Promise<string> {
    // Normaliser le nom de la ville
    const normalizedName = cityName.trim().toLowerCase();
    
    // Vérifier d'abord dans notre table de correspondance
    if (this.CITY_TO_AIRPORT_CODE[normalizedName]) {
      return this.CITY_TO_AIRPORT_CODE[normalizedName];
    }
    
    // Si la ville n'est pas dans notre table, essayer avec l'API
    try {
      // Étape 1: Obtenir les coordonnées de la ville
      const coordinates = await this.getCoordinates(cityName);
      
      if (coordinates) {
        // Étape 2: Obtenir le code IATA à partir des coordonnées
        const code = await this.getAirportCodeFromCoordinates(coordinates.lat, coordinates.lng);
        
        if (code) {
          return code;
        }
      }
    } catch (error) {
      console.error('Erreur lors de la conversion ville vers code IATA:', error);
    }
    
    // Si tout échoue, retourner le nom de la ville en majuscules (pour respecter l'exigence de l'API)
    // Limiter à 3 lettres pour les codes qui ne sont pas trouvés
    const fallbackCode = normalizedName.substring(0, 3).toUpperCase();
    console.warn(`Code IATA non trouvé pour ${cityName}, utilisation du code de substitution ${fallbackCode}`);
    return fallbackCode;
  }
} 