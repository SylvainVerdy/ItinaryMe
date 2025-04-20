import { getDestinationCoordinates, generateSampleItinerary } from './geoHelper';

export async function extractPointsFromNotes(notes: string, destination: string) {
  // Pour l'instant, nous retournons un itinéraire d'exemple
  // Vous pourrez améliorer cette fonction plus tard pour extraire réellement des points des notes
  return generateSampleItinerary(destination, 4);
}