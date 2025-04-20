"use client";

import { useEffect, useRef, useState } from 'react';
import { extractPointsFromNotes } from '@/lib/extractItinerary';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';

// Import dynamique de la carte pour éviter l'erreur "window is not defined"
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  )
});

interface ItineraryMapProps {
  notes: string;
  destination: string;
  height?: string;
}

export default function ItineraryMap({ notes, destination, height = '400px' }: ItineraryMapProps) {
  const [points, setPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Extraire les points d'itinéraire des notes
    const fetchPoints = async () => {
      try {
        const extractedPoints = await extractPointsFromNotes(notes, destination);
        setPoints(extractedPoints);
      } catch (error) {
        console.error("Erreur lors de l'extraction des points:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPoints();
  }, [notes, destination]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Itinéraire: {destination}</h3>
          {!loading && <p className="text-sm text-gray-500">{points.length} points d'intérêt</p>}
        </div>
      </div>
      
      <div style={{ height }} className="w-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <MapComponent points={points} />
        )}
      </div>
    </div>
  );
}
