export interface GeoPosition {
    lat: number;
    lng: number;
  }
  
  // Base de données de coordonnées de villes
  export const popularDestinations: Record<string, GeoPosition> = {
    'Paris': { lat: 48.8566, lng: 2.3522 },
    'Rome': { lat: 41.9028, lng: 12.4964 },
    'New York': { lat: 40.7128, lng: -74.0060 },
    'Londres': { lat: 51.5074, lng: -0.1278 },
    'Tokyo': { lat: 35.6762, lng: 139.6503 },
    'Madrid': { lat: 40.4168, lng: -3.7038 },
    'Barcelone': { lat: 41.3851, lng: 2.1734 }
  };
  
  // Trouver les coordonnées d'une destination
  export function getDestinationCoordinates(destination: string): GeoPosition {
    // Recherche exacte
    if (popularDestinations[destination]) {
      return popularDestinations[destination];
    }
    
    // Recherche approximative
    for (const [city, coords] of Object.entries(popularDestinations)) {
      if (destination.toLowerCase().includes(city.toLowerCase())) {
        return coords;
      }
    }
    
    // Coordonnées par défaut (Paris)
    return { lat: 48.8566, lng: 2.3522 };
  }
  
  // Générer un itinéraire d'exemple
  export function generateSampleItinerary(destination: string, numPoints = 3) {
    const baseCoords = getDestinationCoordinates(destination);
    
    const points = [];
    points.push({
      id: 'arrival',
      name: `Arrivée à ${destination}`,
      position: baseCoords,
      category: 'transport'
    });
    
    for (let i = 1; i < numPoints; i++) {
      points.push({
        id: `point-${i}`,
        name: `Attraction ${i} à ${destination}`,
        position: {
          lat: baseCoords.lat + (Math.random() - 0.5) * 0.05,
          lng: baseCoords.lng + (Math.random() - 0.5) * 0.05
        },
        category: i % 2 === 0 ? 'attraction' : 'hébergement'
      });
    }
    
    return points;
  }