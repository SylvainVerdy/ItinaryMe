import React, { useState } from 'react';
import { useTrip } from '../hooks/useTrip';
import TripForm from './TripForm';
import TripSummary from './TripSummary';
import TripItinerary from './TripItinerary';
import LoadingIndicator from './LoadingIndicator';

const TripPlanner: React.FC = () => {
  const [message, setMessage] = useState('');
  const { 
    loading, 
    error, 
    travelInfo, 
    itinerary,
    step,
    analyzeMessage,
    confirmTravelInfo,
    generateTravelItinerary,
    reset
  } = useTrip();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      await analyzeMessage(message);
    }
  };

  const handleConfirm = () => {
    confirmTravelInfo();
  };

  const handleGenerate = async () => {
    await generateTravelItinerary();
  };

  const handleReset = () => {
    reset();
    setMessage('');
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Planificateur de Voyage ItinaryMe</h1>
      
      {step === 'idle' && (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="mb-4">
            <label htmlFor="message" className="block mb-2 font-medium">
              Décrivez votre voyage
            </label>
            <textarea
              id="message"
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Exemple: Je souhaite visiter Paris du 15 au 20 juin avec ma famille. Nous aimons l'art et la gastronomie."
            />
          </div>
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            Analyser ma demande
          </button>
        </form>
      )}

      {loading && <LoadingIndicator message={step === 'analyzing' ? "Analyse de votre demande..." : "Génération de votre itinéraire..."} />}

      {error && <div className="p-4 mb-6 text-red-700 bg-red-100 rounded-md">{error}</div>}

      {travelInfo && step === 'analyzing' && (
        <div className="mb-8">
          <TripSummary travelInfo={travelInfo} />
          <div className="mt-4 flex space-x-3">
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Confirmer ces informations
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Recommencer
            </button>
          </div>
        </div>
      )}

      {step === 'confirmed' && (
        <div className="mb-8">
          <TripSummary travelInfo={travelInfo!} />
          <div className="mt-4">
            <button
              onClick={handleGenerate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-3"
            >
              Générer mon itinéraire
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Recommencer
            </button>
          </div>
        </div>
      )}

      {itinerary && step === 'completed' && (
        <div>
          <TripItinerary itinerary={itinerary} />
          <button
            onClick={handleReset}
            className="mt-6 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Planifier un nouveau voyage
          </button>
        </div>
      )}
    </div>
  );
};

export default TripPlanner; 