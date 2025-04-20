import React from 'react';
import { BasicTravelInfo } from '../ai/flows/interpret-travel-request';

interface TripSummaryProps {
  travelInfo: BasicTravelInfo;
}

const TripSummary: React.FC<TripSummaryProps> = ({ travelInfo }) => {
  return (
    <div className="bg-blue-50 p-5 rounded-lg border border-blue-200">
      <h2 className="text-xl font-semibold mb-4">Résumé du voyage</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium text-gray-700">Destination</h3>
          <p className="text-lg">{travelInfo.destination || 'Non spécifiée'}</p>
        </div>
        
        <div>
          <h3 className="font-medium text-gray-700">Dates</h3>
          <p className="text-lg">
            {travelInfo.startDate && travelInfo.endDate 
              ? `Du ${formatDate(travelInfo.startDate)} au ${formatDate(travelInfo.endDate)}`
              : 'Non spécifiées'}
          </p>
        </div>
        
        <div>
          <h3 className="font-medium text-gray-700">Nombre de voyageurs</h3>
          <p className="text-lg">{travelInfo.numPeople || 'Non spécifié'}</p>
        </div>
        
        <div>
          <h3 className="font-medium text-gray-700">Budget</h3>
          <p className="text-lg">{travelInfo.budget || 'Non spécifié'}</p>
        </div>
      </div>
      
      {travelInfo.preferences && (
        <div className="mt-4">
          <h3 className="font-medium text-gray-700">Préférences</h3>
          <p className="text-lg">{travelInfo.preferences}</p>
        </div>
      )}
      
      {travelInfo.additionalInfo && (
        <div className="mt-4">
          <h3 className="font-medium text-gray-700">Informations supplémentaires</h3>
          <p className="text-lg">{travelInfo.additionalInfo}</p>
        </div>
      )}
    </div>
  );
};

// Fonction pour formater les dates en format français
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  } catch (e) {
    return dateString; // En cas d'erreur, renvoyer la chaîne originale
  }
}

export default TripSummary; 