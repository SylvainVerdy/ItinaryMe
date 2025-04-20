import { useState, useCallback } from 'react';
import { detectBasicTravelInfo, BasicTravelInfo } from '../ai/flows/interpret-travel-request';
import { generateItinerary, TravelItinerary } from '../ai/flows/generate-itinerary';

export interface TripState {
  loading: boolean;
  error: string | null;
  travelInfo: BasicTravelInfo | null;
  itinerary: TravelItinerary | null;
  step: 'idle' | 'analyzing' | 'confirmed' | 'generating' | 'completed';
}

interface UseTripReturn extends TripState {
  analyzeMessage: (message: string) => Promise<void>;
  confirmTravelInfo: () => void;
  generateTravelItinerary: () => Promise<void>;
  reset: () => void;
  updateTravelInfo: (updates: Partial<BasicTravelInfo>) => void;
}

const initialState: TripState = {
  loading: false,
  error: null,
  travelInfo: null,
  itinerary: null,
  step: 'idle'
};

export function useTrip(): UseTripReturn {
  const [state, setState] = useState<TripState>(initialState);

  /**
   * Analyse le message de l'utilisateur pour extraire les informations de voyage
   */
  const analyzeMessage = useCallback(async (message: string) => {
    setState(prev => ({ ...prev, loading: true, error: null, step: 'analyzing' }));
    
    try {
      const travelInfo = await detectBasicTravelInfo(message);
      
      if (!travelInfo.isValidTravelRequest) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: "Je n'ai pas pu identifier une demande de voyage valide. Pourriez-vous fournir plus de détails sur votre destination et vos dates?",
          step: 'idle'
        }));
        return;
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        travelInfo,
        step: 'confirmed'
      }));
    } catch (error) {
      console.error("Erreur lors de l'analyse du message:", error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: "Une erreur s'est produite lors de l'analyse de votre demande. Veuillez réessayer.",
        step: 'idle'
      }));
    }
  }, []);

  /**
   * Confirme les informations de voyage et prépare la génération d'itinéraire
   */
  const confirmTravelInfo = useCallback(() => {
    if (!state.travelInfo) {
      setState(prev => ({
        ...prev,
        error: "Aucune information de voyage à confirmer."
      }));
      return;
    }
    
    setState(prev => ({
      ...prev,
      step: 'confirmed'
    }));
  }, [state.travelInfo]);

  /**
   * Génère un itinéraire de voyage basé sur les informations confirmées
   */
  const generateTravelItinerary = useCallback(async () => {
    if (!state.travelInfo || !state.travelInfo.destination) {
      setState(prev => ({
        ...prev,
        error: "Informations de voyage insuffisantes pour générer un itinéraire."
      }));
      return;
    }
    
    setState(prev => ({ ...prev, loading: true, error: null, step: 'generating' }));
    
    try {
      const itinerary = await generateItinerary({
        destination: state.travelInfo.destination,
        startDate: state.travelInfo.startDate,
        endDate: state.travelInfo.endDate,
        preferences: state.travelInfo.preferences,
        budget: state.travelInfo.budget
      });
      
      setState(prev => ({
        ...prev,
        loading: false,
        itinerary,
        step: 'completed'
      }));
    } catch (error) {
      console.error("Erreur lors de la génération de l'itinéraire:", error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: "Une erreur s'est produite lors de la génération de votre itinéraire. Veuillez réessayer.",
        step: 'confirmed'
      }));
    }
  }, [state.travelInfo]);

  /**
   * Met à jour les informations de voyage
   */
  const updateTravelInfo = useCallback((updates: Partial<BasicTravelInfo>) => {
    setState(prev => ({
      ...prev,
      travelInfo: prev.travelInfo ? { ...prev.travelInfo, ...updates } : updates as BasicTravelInfo
    }));
  }, []);

  /**
   * Réinitialise l'état
   */
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    analyzeMessage,
    confirmTravelInfo,
    generateTravelItinerary,
    updateTravelInfo,
    reset
  };
}

export default useTrip; 