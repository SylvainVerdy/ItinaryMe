import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MarkerIcon } from './icons';

// Supprime l'icône par défaut pour éviter le problème de chemin d'accès
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Interface pour une position géographique
interface GeoPosition {
  lat: number;
  lng: number;
}

// Interface pour une étape de l'itinéraire
interface TripLocation {
  id: string;
  name: string;
  position: GeoPosition;
  date?: string;
  description?: string;
  category?: string; // hôtel, restaurant, visite, etc.
}

// Propriétés du composant
interface TripMapProps {
  locations: TripLocation[];
  destination: string;
  defaultCenter?: GeoPosition;
  defaultZoom?: number;
  interactive?: boolean;
  height?: string;
}

const TripMap: React.FC<TripMapProps> = ({
  locations,
  destination,
  defaultCenter,
  defaultZoom = 10,
  interactive = true,
  height = '500px'
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Si une carte existe déjà, la supprimer
    if (mapRef.current) {
      mapRef.current.remove();
    }

    // Initialiser la carte
    const map = L.map(mapContainerRef.current, {
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    });
    mapRef.current = map;

    // Ajouter le fond de carte OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Détermine le centre et les limites de la carte
    if (locations.length > 0) {
      // Créer des marqueurs pour chaque lieu
      const markers: L.Marker[] = [];
      const markerIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        shadowSize: [41, 41]
      });

      // Créer une ligne reliant les différentes étapes
      const pathPoints: L.LatLngExpression[] = locations.map(loc => [loc.position.lat, loc.position.lng]);
      if (pathPoints.length > 1) {
        const polyline = L.polyline(pathPoints, { color: '#3B82F6', weight: 3, opacity: 0.7 }).addTo(map);
      }

      // Ajouter les marqueurs
      locations.forEach((location, index) => {
        const marker = L.marker([location.position.lat, location.position.lng], { 
          icon: markerIcon,
          title: location.name
        }).addTo(map);
        
        // Ajouter une popup avec les informations
        const popupContent = `
          <div class="font-medium">${location.name}</div>
          ${location.date ? `<div class="text-sm text-gray-600">${location.date}</div>` : ''}
          ${location.description ? `<p class="text-sm mt-1">${location.description}</p>` : ''}
        `;
        marker.bindPopup(popupContent);
        
        markers.push(marker);
      });
      
      // Adapter la vue pour inclure tous les marqueurs
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    } else if (defaultCenter) {
      // Si aucun lieu n'est défini mais qu'un centre par défaut est fourni
      map.setView([defaultCenter.lat, defaultCenter.lng], defaultZoom);
    } else {
      // Position par défaut centrée sur la France
      map.setView([46.603354, 1.888334], 5);
    }

    // Nettoyage lors du démontage du composant
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [locations, defaultCenter, defaultZoom, interactive, destination]);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Itinéraire: {destination}</h2>
        <p className="text-sm text-gray-500">{locations.length} étapes</p>
      </div>
      <div 
        ref={mapContainerRef} 
        style={{ height }}
        className="w-full"
      />
    </div>
  );
};

export default TripMap; 