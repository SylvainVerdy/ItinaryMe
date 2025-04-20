"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { MapPin, Navigation, Bed, Utensils, Ticket, ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Button } from './ui/button';

// Styles pour la carte
const mapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden'
};

// Fonction pour corriger les icônes de Leaflet qui ne s'affichent pas correctement dans Next.js
const fixLeafletIcons = () => {
  // Supprimer le délai pour corriger le problème de chargement des icônes
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  
  // Redéfinir les URL des icônes standard
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
};

// Définir les types pour les événements de la carte
interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  type?: 'visit' | 'transport' | 'accommodation' | 'food' | 'activity' | 'other';
  color?: string;
  day?: number;
  order?: number;
}

interface ItineraryMapProps {
  points?: MapPoint[];
  startDate?: string | Date;
  endDate?: string | Date;
  onPointSelect?: (pointId: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  selectedPointId?: string;
  height?: string;
  showDirections?: boolean;
}

export interface ItineraryMapHandle {
  panTo: (lat: number, lng: number) => void;
  addPoint: (point: Omit<MapPoint, 'id'>) => string;
  updatePoint: (id: string, point: Partial<MapPoint>) => void;
  removePoint: (id: string) => void;
  clearPoints: () => void;
  getCoordinates: (address: string) => Promise<{lat: number, lng: number} | null>;
  getCurrentLocation: () => Promise<{lat: number, lng: number} | null>;
}

// Utiliser une API de géocodage réelle au lieu de la simulation
const geocodeAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
    
    if (!response.ok) {
      throw new Error('Erreur lors du géocodage de l\'adresse');
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
    console.error('Erreur de géocodage:', error);
    return null;
  }
};

// Composant pour contrôler le comportement de la carte
function MapController({ 
  center, 
  onClick, 
  onRef 
}: { 
  center?: [number, number], 
  onClick?: (lat: number, lng: number) => void,
  onRef?: (map: L.Map) => void
}) {
  const map = useMap();
  
  // Exposer la référence de la carte
  useEffect(() => {
    if (onRef) onRef(map);
  }, [map, onRef]);
  
  // Centrer la carte sur les coordonnées fournies
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  
  // Gérer les clics sur la carte
  useMapEvents({
    click(e) {
      if (onClick) {
        onClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  
  return null;
}

const ItineraryMap = forwardRef<ItineraryMapHandle, ItineraryMapProps>(({
  points = [],
  startDate,
  endDate,
  onPointSelect,
  onMapClick,
  selectedPointId,
  height = '500px',
  showDirections = true
}, ref) => {
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([46.603354, 1.888334]); // Centre de la France par défaut
  const mapInstance = useRef<L.Map | null>(null);
  const pointsRef = useRef<MapPoint[]>([]);
  
  // Fixer les icônes Leaflet au chargement
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  // Exposer les méthodes à travers la référence
  useImperativeHandle(ref, () => ({
    panTo: (lat: number, lng: number) => {
      if (mapInstance.current) {
        mapInstance.current.setView([lat, lng], 13);
        setMapCenter([lat, lng]);
      }
    },
    addPoint: (point: Omit<MapPoint, 'id'>) => {
      const id = `point-${Date.now()}`;
      const newPoint: MapPoint = { ...point, id };
      setMapPoints(prev => [...prev, newPoint]);
      return id;
    },
    updatePoint: (id: string, point: Partial<MapPoint>) => {
      setMapPoints(prev => 
        prev.map(p => p.id === id ? { ...p, ...point } : p)
      );
    },
    removePoint: (id: string) => {
      setMapPoints(prev => prev.filter(p => p.id !== id));
    },
    clearPoints: () => {
      setMapPoints([]);
    },
    getCoordinates: async (address: string) => {
      return await geocodeAddress(address);
    },
    getCurrentLocation: async () => {
      return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
            },
            (error) => {
              console.error('Erreur de géolocalisation:', error);
              reject(error);
            }
          );
        } else {
          console.error('La géolocalisation n\'est pas supportée par ce navigateur.');
          reject(new Error('Géolocalisation non supportée'));
        }
      });
    }
  }));

  // Effet pour mettre à jour les points lorsque les props changent
  useEffect(() => {
    setMapPoints(points);
  }, [points]);
  
  // Effet pour mettre à jour le point sélectionné
  useEffect(() => {
    if (selectedPointId) {
      const point = mapPoints.find(p => p.id === selectedPointId);
      if (point) {
        setSelectedPoint(point);
        setMapCenter([point.lat, point.lng]);
      }
    } else {
      setSelectedPoint(null);
    }
  }, [selectedPointId, mapPoints]);

  // Organiser les points par jour
  const pointsByDay = mapPoints.reduce((acc, point) => {
    const day = point.day || 0;
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(point);
    return acc;
  }, {} as Record<number, MapPoint[]>);

  // Trier les points par jour et par ordre
  Object.keys(pointsByDay).forEach(dayStr => {
    const day = parseInt(dayStr);
    pointsByDay[day].sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  const getIconForType = (type?: string) => {
    switch (type) {
      case 'visit':
        return <MapPin size={20} className="text-blue-500" />;
      case 'transport':
        return <Navigation size={20} className="text-green-500" />;
      case 'accommodation':
        return <Bed size={20} className="text-purple-500" />;
      case 'food':
        return <Utensils size={20} className="text-orange-500" />;
      case 'activity':
        return <Ticket size={20} className="text-pink-500" />;
      default:
        return <ExternalLink size={20} className="text-gray-500" />;
    }
  };

  // Créer des icônes personnalisées pour Leaflet
  const createCustomIcon = (type?: string, color?: string) => {
    return L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background-color: ${color || '#3B82F6'}; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.2);">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 ${type === 'transport' ? '<polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line>' : 
                   type === 'accommodation' ? '<path d="M2 9V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4"></path><path d="M2 11v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9"></path><path d="M5 15h14"></path>' : 
                   '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>'}
               </svg>
             </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 w-full">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium">Carte de l'itinéraire</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="px-3 py-1 text-sm"
            onClick={() => alert('Cette fonctionnalité utiliserait l\'API de directions dans une vraie application')}
          >
            Calculer itinéraire
          </Button>
        </div>
      </div>
      
      <div style={{ height, width: '100%', position: 'relative' }} className="relative overflow-hidden">
        <style jsx global>{`
          .leaflet-container {
            width: 100%;
            height: 100%;
            z-index: 0;
          }
        `}</style>
        <MapContainer 
          center={mapCenter} 
          zoom={6} 
          style={mapContainerStyle}
          className="leaflet-container"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Affichage des marqueurs pour chaque point */}
          {mapPoints.map((point) => (
            <Marker
              key={point.id}
              position={[point.lat, point.lng]}
              icon={createCustomIcon(point.type, point.color)}
              eventHandlers={{
                click: () => {
                  setSelectedPoint(point);
                  if (onPointSelect) onPointSelect(point.id);
                }
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold">{point.title}</h3>
                  {point.description && <p className="text-sm mt-1">{point.description}</p>}
                  {point.day !== undefined && <p className="text-xs mt-1 text-gray-500">Jour {point.day + 1}</p>}
                </div>
              </Popup>
            </Marker>
          ))}
          
          {/* Tracé de l'itinéraire entre les points */}
          {showDirections && Object.entries(pointsByDay).map(([day, dayPoints]) => {
            if (dayPoints.length < 2) return null;
            
            // Trier les points par ordre
            const sortedPoints = [...dayPoints].sort((a, b) => (a.order || 0) - (b.order || 0));
            const positions = sortedPoints.map(p => [p.lat, p.lng] as [number, number]);
            
            return (
              <Polyline
                key={`path-day-${day}`}
                positions={positions}
                color={`hsl(${Number(day) * 30 % 360}, 70%, 50%)`}
                weight={3}
                opacity={0.7}
              />
            );
          })}
          
          {/* Composant pour contrôler la carte */}
          <MapController 
            onRef={(m) => {
              mapInstance.current = m;
            }} 
            center={selectedPoint ? [selectedPoint.lat, selectedPoint.lng] : undefined}
            onClick={(lat, lng) => {
              if (onMapClick) onMapClick(lat, lng);
            }}
          />
        </MapContainer>
      </div>
      
      {/* Légende de l'itinéraire */}
      <div className="p-4">
        <h4 className="text-sm font-medium mb-2">Légende</h4>
        <div className="space-y-2">
          {Object.keys(pointsByDay).map(dayStr => {
            const day = parseInt(dayStr);
            if (day === 0) return null; // Ignorer les points sans jour assigné
            
            return (
              <div key={day} className="border-l-4 pl-2" style={{ borderColor: `hsl(${(day * 30) % 360}, 70%, 50%)` }}>
                <div className="text-sm font-medium">Jour {day}</div>
                <div className="space-y-1 mt-1">
                  {pointsByDay[day].map((point, index) => (
                    <div 
                      key={point.id}
                      className={`flex items-center text-xs p-1 rounded-md cursor-pointer ${
                        selectedPointId === point.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => onPointSelect && onPointSelect(point.id)}
                    >
                      <span className="w-5 h-5 flex items-center justify-center mr-1">
                        {getIconForType(point.type)}
                      </span>
                      <span>{index + 1}. {point.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

ItineraryMap.displayName = 'ItineraryMap';

export default ItineraryMap;
