"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { travelService, TravelPlanInput } from '@/services/travelService';

interface TravelFormProps {
  initialData?: TravelPlanInput;
  travelId?: string;
  isEditing?: boolean;
}

export function TravelForm({ initialData, travelId, isEditing = false }: TravelFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<TravelPlanInput>({
    destination: '',
    dateDepart: '',
    dateRetour: '',
    nombreVoyageurs: 1,
    notes: '',
    activities: []
  });

  // Si on est en mode édition, charger les données initiales
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      // Vérifier si un paramètre de destination est présent dans l'URL
      const searchParams = new URLSearchParams(window.location.search);
      const destinationParam = searchParams.get('destination');
      
      if (destinationParam) {
        setFormData(prev => ({
          ...prev,
          destination: destinationParam
        }));
      }
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'nombreVoyageurs' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setFormError("Vous devez être connecté pour créer un voyage.");
      return;
    }
    
    if (!formData.destination || !formData.dateDepart || !formData.dateRetour) {
      setFormError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setFormError(null);
      
      if (isEditing && travelId) {
        // Mode édition
        await travelService.updateTravel(travelId, formData);
        router.push(`/travel/${travelId}`);
      } else {
        // Mode création
        const newTravelId = await travelService.createTravel(user.uid, formData);
        router.push(`/travel/${newTravelId}`);
      }
    } catch (error: any) {
      console.error("Erreur lors de l'enregistrement du voyage:", error);
      // Afficher le message d'erreur spécifique si disponible
      setFormError(error.message || "Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? 'Modifier votre voyage' : 'Planifier un nouveau voyage'}
      </h1>
      
      {formError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {formError}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="destination" className="block text-sm font-medium text-gray-700">
            Destination
          </label>
          <input
            type="text"
            id="destination"
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Paris, Tokyo, New York..."
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dateDepart" className="block text-sm font-medium text-gray-700">
              Date de départ
            </label>
            <input
              type="date"
              id="dateDepart"
              name="dateDepart"
              value={formData.dateDepart}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="dateRetour" className="block text-sm font-medium text-gray-700">
              Date de retour
            </label>
            <input
              type="date"
              id="dateRetour"
              name="dateRetour"
              value={formData.dateRetour}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="nombreVoyageurs" className="block text-sm font-medium text-gray-700">
            Nombre de voyageurs
          </label>
          <select
            id="nombreVoyageurs"
            name="nombreVoyageurs"
            value={formData.nombreVoyageurs}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes (optionnel)
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Ajoutez des notes ou des détails sur votre voyage..."
          />
        </div>
        
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer le voyage'}
          </button>
        </div>
      </form>
    </div>
  );
} 