import React, { useState } from 'react';
import { TravelItinerary, ItineraryDay, ItineraryActivity } from '../ai/flows/generate-itinerary';

interface TripItineraryProps {
  itinerary: TravelItinerary;
}

const TripItinerary: React.FC<TripItineraryProps> = ({ itinerary }) => {
  const [selectedDay, setSelectedDay] = useState<number>(1);

  // Trouver le jour sélectionné
  const currentDay = itinerary.days.find(day => day.day === selectedDay) || itinerary.days[0];

  // Dictionnaire des icônes pour les catégories d'activités
  const categoryIcons: Record<string, string> = {
    food: '🍽️',
    sightseeing: '🏛️',
    culture: '🎭',
    nature: '🌿',
    shopping: '🛍️',
    relaxation: '🧘',
    transport: '🚗'
  };

  // Formatter un montant monétaire
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: itinerary.budget.currency || 'EUR'
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* En-tête de l'itinéraire */}
      <div className="bg-blue-600 text-white p-6 rounded-t-lg">
        <h1 className="text-2xl font-bold">{itinerary.destination}</h1>
        <p className="text-lg">
          Du {formatDate(itinerary.startDate)} au {formatDate(itinerary.endDate)}
        </p>
        <p className="mt-2">{itinerary.summary}</p>
      </div>

      {/* Navigation des jours */}
      <div className="p-4 border-b overflow-x-auto">
        <div className="flex space-x-2">
          {itinerary.days.map(day => (
            <button
              key={day.day}
              onClick={() => setSelectedDay(day.day)}
              className={`px-4 py-2 rounded-md font-medium transition ${
                selectedDay === day.day
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Jour {day.day}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu du jour sélectionné */}
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">
            Jour {currentDay.day} - {formatDate(currentDay.date)}
          </h2>
        </div>

        {/* Activités du jour */}
        <div className="space-y-4 mb-6">
          {currentDay.activities.map((activity, index) => (
            <ActivityCard key={index} activity={activity} />
          ))}
        </div>

        {/* Hébergement */}
        {currentDay.accommodation && (
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h3 className="text-lg font-semibold flex items-center">
              <span className="mr-2">🏨</span> Hébergement
            </h3>
            <p className="font-medium mt-1">{currentDay.accommodation.name}</p>
            <p className="text-gray-700 mt-1">{currentDay.accommodation.description}</p>
          </div>
        )}
      </div>

      {/* Informations complémentaires */}
      <div className="p-6 bg-gray-50 rounded-b-lg">
        {/* Budget */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Budget estimé</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded-md shadow-sm">
              <p className="text-gray-500">Transport</p>
              <p className="font-semibold">{formatCurrency(itinerary.budget.transportation)}</p>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <p className="text-gray-500">Hébergement</p>
              <p className="font-semibold">{formatCurrency(itinerary.budget.accommodation)}</p>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <p className="text-gray-500">Activités</p>
              <p className="font-semibold">{formatCurrency(itinerary.budget.activities)}</p>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <p className="text-gray-500">Nourriture</p>
              <p className="font-semibold">{formatCurrency(itinerary.budget.food)}</p>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm col-span-2 md:col-span-1">
              <p className="text-gray-500">Total</p>
              <p className="font-semibold text-blue-600">{formatCurrency(itinerary.budget.total)}</p>
            </div>
          </div>
        </div>

        {/* Conseils de voyage */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Conseils de voyage</h3>
          <ul className="list-disc pl-5 space-y-1">
            {itinerary.tips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// Sous-composant pour afficher une activité
const ActivityCard: React.FC<{ activity: ItineraryActivity }> = ({ activity }) => {
  // Icônes pour les catégories d'activités
  const categoryIcons: Record<string, string> = {
    food: '🍽️',
    sightseeing: '🏛️',
    culture: '🎭',
    nature: '🌿',
    shopping: '🛍️',
    relaxation: '🧘',
    transport: '🚗'
  };

  const icon = activity.category ? categoryIcons[activity.category] || '📌' : '📌';

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center mb-2">
        <span className="mr-2 text-xl">{icon}</span>
        <div>
          <span className="text-sm font-medium text-gray-500">{activity.time}</span>
          <h4 className="font-semibold">{activity.title}</h4>
        </div>
        {activity.duration && (
          <span className="ml-auto px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {activity.duration}
          </span>
        )}
      </div>
      <p className="text-gray-700 mb-2">{activity.description}</p>
      {activity.location && (
        <div className="text-sm text-gray-500 flex items-center">
          <span className="mr-1">📍</span> {activity.location}
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

export default TripItinerary; 