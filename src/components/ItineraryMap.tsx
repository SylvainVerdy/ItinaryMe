"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { MapPin, Navigation, Bed, Utensils, Ticket, ExternalLink, Move, Calendar, RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

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
  planningEvents?: TravelEvent[];
  syncWithPlanning?: boolean;
}

interface TravelEvent {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  allDay: boolean;
  description?: string;
  location?: string;
  color?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  day?: number;
}

export interface ItineraryMapHandle {
  panTo: (lat: number, lng: number) => void;
  addPoint: (point: Omit<MapPoint, 'id'>) => string;
  updatePoint: (id: string, point: Partial<MapPoint>) => void;
  removePoint: (id: string) => void;
  clearPoints: () => void;
  getCoordinates: (address: string) => Promise<{lat: number, lng: number} | null>;
  getCurrentLocation: () => Promise<{lat: number, lng: number} | null>;
  syncWithPlanning: () => void;
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
  onRef,
  onMoveMode
}: { 
  center?: [number, number], 
  onClick?: (lat: number, lng: number) => void,
  onRef?: (map: L.Map) => void,
  onMoveMode?: boolean
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
      if (onClick && !onMoveMode) {
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
  showDirections = true,
  planningEvents = [],
  syncWithPlanning = false
}, ref) => {
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([46.603354, 1.888334]); // Centre de la France par défaut
  const mapInstance = useRef<L.Map | null>(null);
  const pointsRef = useRef<MapPoint[]>([]);
  const [moveMode, setMoveMode] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const mapClickTimeout = useRef<NodeJS.Timeout | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingPoint, setEditingPoint] = useState<MapPoint | null>(null);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [manualLat, setManualLat] = useState<number>(0);
  const [manualLng, setManualLng] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
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
    },
    syncWithPlanning: () => {
      syncWithTravelPlanning();
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

  // Fonction pour vérifier si un jour est dans la plage du voyage
  const isDayInTravelRange = (day: number): boolean => {
    // Vérifier si le jour est valide
    if (day <= 0) return false;
    
    // Si des dates de voyage sont spécifiées, vérifier si ce jour est dans la plage
    if (startDate && endDate) {
      const travelStartDate = new Date(startDate);
      const travelEndDate = new Date(endDate);
      
      // Étendre la plage d'un jour avant et après pour plus de tolérance
      travelStartDate.setDate(travelStartDate.getDate() - 1);
      travelEndDate.setDate(travelEndDate.getDate() + 1);
      
      // Calculer la date correspondant à ce jour
      const dayDate = new Date(travelStartDate);
      dayDate.setDate(travelStartDate.getDate() + day - 1);
      
      // Déboguer les dates
      console.log(`Vérification jour ${day}, date: ${dayDate.toISOString()}, dans plage: ${travelStartDate.toISOString()} - ${travelEndDate.toISOString()}`);
      
      // Ne garder que les jours dans la plage de dates du voyage
      return dayDate >= travelStartDate && dayDate <= travelEndDate;
    }
    
    return true;
  };
  
  // Filtrer les points à afficher sur la carte
  const filteredMapPoints = useMemo(() => {
    // Si pas de dates définies, montrer tous les points
    if (!startDate || !endDate) {
      console.log('Pas de dates de voyage définies, affichage de tous les points:', mapPoints.length);
      return mapPoints;
    }
    
    const filtered = mapPoints.filter(point => {
      // Si aucun jour n'est défini pour ce point, l'afficher quand même
      if (!point.day) return true;
      
      return isDayInTravelRange(point.day);
    });
    
    console.log(`Filtrage des points: ${filtered.length}/${mapPoints.length} points conservés`);
    return filtered;
  }, [mapPoints, startDate, endDate]);
  
  // Organiser les points par jour
  const pointsByDay = useMemo(() => {
    return filteredMapPoints.reduce((acc, point) => {
      const day = point.day || 0;
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(point);
      return acc;
    }, {} as Record<number, MapPoint[]>);
  }, [filteredMapPoints]);

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
  const createCustomIcon = (type?: string, color?: string, order?: number, isActiveMoving?: boolean) => {
    const iconHtml = `
      <div style="
        display: flex; 
        align-items: center; 
        justify-content: center; 
        width: 30px; 
        height: 30px; 
        background-color: ${color || '#3B82F6'}; 
        border-radius: 50%; 
        color: white;
        font-weight: bold;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        ${isActiveMoving ? 'border: 3px solid #fbbf24; animation: pulse 1.5s infinite;' : ''}
      ">
        ${order !== undefined && order >= 0 ? (order + 1) : getIconForType(type)}
      </div>
      ${isActiveMoving ? `
      <style>
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      </style>` : ''}
    `;
    
    return L.divIcon({
      html: iconHtml,
      className: 'custom-div-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  };

  // Fonction pour réorganiser les points
  const movePointUp = (pointId: string, day: number) => {
    const dayPoints = [...(pointsByDay[day] || [])];
    const pointIndex = dayPoints.findIndex(p => p.id === pointId);
    
    if (pointIndex > 0) {
      // Échanger avec le point précédent
      const temp = dayPoints[pointIndex].order;
      dayPoints[pointIndex].order = dayPoints[pointIndex - 1].order;
      dayPoints[pointIndex - 1].order = temp;
      
      // Mettre à jour tous les points de ce jour
      const updatedPoints = [...mapPoints];
      dayPoints.forEach(point => {
        const index = updatedPoints.findIndex(p => p.id === point.id);
        if (index !== -1) {
          updatedPoints[index] = {...point};
        }
      });
      
      setMapPoints(updatedPoints);
    }
  };
  
  const movePointDown = (pointId: string, day: number) => {
    const dayPoints = [...(pointsByDay[day] || [])];
    const pointIndex = dayPoints.findIndex(p => p.id === pointId);
    
    if (pointIndex < dayPoints.length - 1) {
      // Échanger avec le point suivant
      const temp = dayPoints[pointIndex].order;
      dayPoints[pointIndex].order = dayPoints[pointIndex + 1].order;
      dayPoints[pointIndex + 1].order = temp;
      
      // Mettre à jour tous les points de ce jour
      const updatedPoints = [...mapPoints];
      dayPoints.forEach(point => {
        const index = updatedPoints.findIndex(p => p.id === point.id);
        if (index !== -1) {
          updatedPoints[index] = {...point};
        }
      });
      
      setMapPoints(updatedPoints);
    }
  };

  // Fonction pour mettre à jour un point
  const updatePointDetails = (pointId: string, updates: Partial<MapPoint>) => {
    const updatedPoints = mapPoints.map(point => 
      point.id === pointId ? { ...point, ...updates } : point
    );
    setMapPoints(updatedPoints);
    setEditingPoint(prev => prev && prev.id === pointId ? { ...prev, ...updates } : prev);
  };

  // Fonction pour déplacer un point
  const movePoint = (pointId: string, newLat: number, newLng: number) => {
    const updatedPoints = mapPoints.map(point => 
      point.id === pointId 
        ? { ...point, lat: newLat, lng: newLng } 
        : point
    );
    setMapPoints(updatedPoints);
    
    // Mise à jour du point en édition s'il est concerné
    if (editingPoint && editingPoint.id === pointId) {
      setEditingPoint({
        ...editingPoint,
        lat: newLat,
        lng: newLng
      });
    }
    
    setMoveMode(false);
    setMoveTarget(null);
  };

  // Cette fonction est appelée lorsqu'un marqueur est déplacé (drag and drop)
  const handleMarkerDragEnd = (pointId: string, e: L.DragEndEvent) => {
    const marker = e.target;
    const position = marker.getLatLng();
    movePoint(pointId, position.lat, position.lng);
  };

  // Activer le mode de déplacement du point
  const enableMoveMode = (pointId: string) => {
    if (mapInstance.current) {
      const point = mapPoints.find(p => p.id === pointId);
      if (point) {
        mapInstance.current.setView([point.lat, point.lng], 14);
        setMoveMode(true);
        setMoveTarget(pointId);
        setManualLat(point.lat);
        setManualLng(point.lng);
        
        toast.success("Mode repositionnement activé. Cliquez sur la carte pour déplacer le point ou ajustez les coordonnées manuellement.", {
          duration: 4000,
          icon: '📍'
        });
      }
    }
  };

  // Gérer le clic sur la carte quand on est en mode déplacement
  const handleMapClick = (lat: number, lng: number) => {
    if (moveMode && moveTarget) {
      // Utiliser un timeout pour éviter les doubles clics
      if (mapClickTimeout.current) {
        clearTimeout(mapClickTimeout.current);
      }
      
      mapClickTimeout.current = setTimeout(() => {
        movePoint(moveTarget, lat, lng);
        
        toast.success("Point repositionné avec succès !", {
          duration: 3000,
          icon: '✅'
        });
      }, 100);
    } else if (onMapClick) {
      onMapClick(lat, lng);
    }
  };

  // Synchroniser avec le planning
  useEffect(() => {
    if (syncWithPlanning && planningEvents.length > 0) {
      const mappedPoints: MapPoint[] = planningEvents
        .filter(event => event.coordinates) // Ne traiter que les événements avec des coordonnées
        .map((event, index) => {
          // Trouver si ce point existe déjà dans notre liste
          const existingPoint = mapPoints.find(p => p.id === `event-${event.id}`);
          
          // Déterminer le jour de l'événement
          const eventDay = event.day || (startDate && new Date(event.start) ? 
            Math.ceil((new Date(event.start).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1 : 
            1);
          
          return {
            id: existingPoint?.id || `event-${event.id}`,
            lat: event.coordinates!.lat,
            lng: event.coordinates!.lng,
            title: event.title,
            description: event.description || '',
            type: determinePointType(event),
            color: event.color || '#3B82F6',
            day: eventDay > 0 ? eventDay : 1,
            order: existingPoint?.order || index
          };
        });
      
      // Combiner les points existants (qui ne viennent pas du planning) avec les nouveaux
      const nonEventPoints = mapPoints.filter(p => !p.id.startsWith('event-'));
      setMapPoints([...nonEventPoints, ...mappedPoints]);
      setLastSyncTime(new Date());
      
      toast.success("Carte synchronisée avec le planning", {
        icon: '🔄',
        duration: 2000
      });
    }
  }, [syncWithPlanning, planningEvents, startDate]);

  // Fonction pour déterminer le type de point en fonction de l'événement
  const determinePointType = (event: TravelEvent): MapPoint['type'] => {
    const title = event.title.toLowerCase();
    const desc = (event.description || '').toLowerCase();
    
    if (title.includes('hotel') || title.includes('hébergement') || title.includes('logement') || 
        desc.includes('hotel') || desc.includes('hébergement') || desc.includes('logement') ||
        desc.includes('dormir')) {
      return 'accommodation';
    }
    
    if (title.includes('restaurant') || title.includes('dîner') || title.includes('déjeuner') || 
        title.includes('repas') || desc.includes('manger') || desc.includes('restaurant') ||
        desc.includes('repas')) {
      return 'food';
    }
    
    if (title.includes('vol') || title.includes('train') || title.includes('bus') || 
        title.includes('transfert') || title.includes('transport') ||
        desc.includes('transport') || desc.includes('trajet')) {
      return 'transport';
    }
    
    if (title.includes('visite') || title.includes('musée') || title.includes('monument') ||
        desc.includes('visite') || desc.includes('découverte')) {
      return 'visit';
    }
    
    if (title.includes('activité') || title.includes('excursion') || 
        desc.includes('activité') || desc.includes('excursion')) {
      return 'activity';
    }
    
    return 'visit'; // Par défaut
  };

  // Fonction manuelle pour synchroniser avec le planning
  const syncWithTravelPlanning = () => {
    if (planningEvents.length > 0) {
      // Déboguer les événements disponibles
      console.log('Synchronisation avec les événements du planning:', planningEvents.length);
      
      // Si pas de coordonnées dans les événements, afficher un message approprié
      const eventsWithCoordinates = planningEvents.filter(event => event.coordinates && 
        event.coordinates.lat && event.coordinates.lng);
      
      if (eventsWithCoordinates.length === 0) {
        toast.error("Aucun événement n'a de coordonnées géographiques. Ajoutez des lieux à vos événements.", {
          icon: '📍',
          duration: 4000
        });
        console.log("Problème: Aucun événement n'a de coordonnées", planningEvents);
        return;
      }
      
      const mappedPoints: MapPoint[] = eventsWithCoordinates
        .map((event, index) => {
          const existingPoint = mapPoints.find(p => p.id === `event-${event.id}`);
          
          // Déterminer le jour (en acceptant jour 0 si nécessaire)
          let eventDay = event.day || 0;
          
          // Si pas de jour mais des dates, calculer le jour
          if (!eventDay && startDate && event.start) {
            try {
              const eventStartDate = new Date(event.start);
              const travelStartDate = new Date(startDate);
              
              // Calculer le nombre de jours depuis le début du voyage
              const diffTime = Math.abs(eventStartDate.getTime() - travelStartDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              eventDay = diffDays + 1; // Premier jour = 1
              console.log(`Événement ${event.title} calculé comme jour ${eventDay}`);
            } catch (error) {
              console.warn("Erreur de calcul de date pour l'événement:", event, error);
              eventDay = 1; // Par défaut jour 1
            }
          }
          
          // Assurer un jour minimum de 1
          if (eventDay <= 0) eventDay = 1;
          
          // Déboguer la création du point
          console.log(`Création point depuis événement: "${event.title}" (jour ${eventDay})`, 
            event.coordinates);
          
          return {
            id: existingPoint?.id || `event-${event.id}`,
            lat: event.coordinates!.lat,
            lng: event.coordinates!.lng,
            title: event.title,
            description: event.description || '',
            type: determinePointType(event),
            color: event.color || '#3B82F6',
            day: eventDay,
            order: existingPoint?.order || index
          };
        });
      
      // Déboguer les points créés
      console.log('Points créés depuis les événements:', mappedPoints.length);
      
      // Toujours garder les points non-événement
      const nonEventPoints = mapPoints.filter(p => !p.id.startsWith('event-'));
      const updatedPoints = [...nonEventPoints, ...mappedPoints];
      
      // Mettre à jour les points sur la carte
      setMapPoints(updatedPoints);
      setLastSyncTime(new Date());
      
      // Informer l'utilisateur
      toast.success(`Carte mise à jour avec ${mappedPoints.length} points du planning`, {
        icon: '🔄',
        duration: 3000
      });
      
      // Actualiser le centre de la carte si des points existent
      if (mappedPoints.length > 0 && mapInstance.current) {
        // Calculer le centre des points pour un meilleur affichage
        const bounds = L.latLngBounds(mappedPoints.map(p => [p.lat, p.lng]));
        mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } else {
      toast.error("Aucun événement disponible dans le planning", {
        icon: '❌',
        duration: 3000
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 w-full">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium">Carte de l'itinéraire</h3>
        <div className="flex gap-2">
          {moveMode && (
            <div className="animate-pulse flex items-center text-amber-600 bg-amber-50 px-3 py-1 rounded-md text-sm mr-2">
              <Move size={14} className="mr-1" /> Mode repositionnement actif
            </div>
          )}
          {mapPoints.length === 0 && (
            <div className="flex items-center text-red-500 bg-red-50 px-3 py-1 rounded-md text-sm mr-2">
              <span>⚠️</span> Aucun point sur la carte
            </div>
          )}
          {lastSyncTime && (
            <div className="flex items-center text-gray-500 text-xs mr-2">
              <Calendar size={12} className="mr-1" /> 
              Synchronisé le {lastSyncTime.toLocaleDateString()} à {lastSyncTime.toLocaleTimeString()}
            </div>
          )}
          <Button 
            variant="outline"
            className="px-3 py-1 text-sm"
            onClick={() => {
              // Ajouter un callback explicite
              console.log("Bouton Sync Planning cliqué");
              syncWithTravelPlanning();
            }}
            title="Synchroniser avec le planning"
          >
            <RefreshCw size={14} className="mr-1" /> Sync Planning
          </Button>
          <Button 
            variant={editMode ? "default" : "outline"}
            className="px-3 py-1 text-sm"
            onClick={() => {
              setEditMode(!editMode);
              setMoveMode(false);
              setMoveTarget(null);
            }}
          >
            {editMode ? "Terminer l'édition" : "Modifier l'itinéraire"}
          </Button>
          <Button 
            variant="outline"
            className="px-3 py-1 text-sm"
            onClick={() => alert('Cette fonctionnalité utiliserait l\'API de directions dans une vraie application')}
          >
            Calculer itinéraire
          </Button>
        </div>
      </div>
      
      <div className="flex">
        <div style={{ height, width: editMode ? 'calc(100% - 300px)' : '100%', position: 'relative' }} className="relative overflow-hidden">
          <style jsx global>{`
            .leaflet-container {
              width: 100%;
              height: 100%;
              z-index: 0;
            }
            
            /* Style pour le curseur en mode déplacement */
            .move-mode {
              cursor: crosshair !important;
            }
          `}</style>
          <MapContainer 
            center={mapCenter} 
            zoom={6} 
            style={mapContainerStyle}
            className={`leaflet-container ${moveMode ? 'move-mode' : ''}`}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Message quand aucun point n'est présent */}
            {filteredMapPoints.length === 0 && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow-lg z-10 text-center">
                <div className="text-amber-600 font-bold mb-2">Carte vide</div>
                <p className="text-sm text-gray-600">
                  Aucun point n'est affiché sur la carte. Vérifiez que vos événements ont des coordonnées géographiques
                  et sont dans les dates du voyage.
                </p>
                <Button
                  className="mt-4 text-xs"
                  size="sm"
                  onClick={syncWithTravelPlanning}
                >
                  <RefreshCw size={14} className="mr-1" /> Synchroniser avec le planning
                </Button>
              </div>
            )}
            
            {/* Affichage des marqueurs pour chaque point */}
            {filteredMapPoints.map((point, index) => {
              // Trouver l'ordre dans les points du même jour
              const dayPoints = pointsByDay[point.day || 0] || [];
              const sortedDayPoints = [...dayPoints].sort((a, b) => (a.order || 0) - (b.order || 0));
              const orderInDay = sortedDayPoints.findIndex(p => p.id === point.id);
              
              // Déterminer si ce point est le point actif en mode déplacement
              const isActiveMovingPoint = moveMode && moveTarget === point.id;
              
              return (
                <Marker
                  key={point.id}
                  position={[point.lat, point.lng]}
                  icon={createCustomIcon(point.type, point.color, orderInDay, isActiveMovingPoint)}
                  draggable={editMode}
                  eventHandlers={{
                    click: () => {
                      if (!moveMode) {
                        setSelectedPoint(point);
                        if (editMode) {
                          setEditingPoint(point);
                          setShowEditPanel(true);
                        }
                        if (onPointSelect) onPointSelect(point.id);
                      } else if (moveMode && moveTarget === point.id) {
                        // Annuler le mode déplacement si on clique sur le même point
                        setMoveMode(false);
                        setMoveTarget(null);
                        toast.success("Mode repositionnement désactivé");
                      }
                    },
                    dragend: (e) => handleMarkerDragEnd(point.id, e)
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold">{point.title}</h3>
                      {point.description && <p className="text-sm mt-1">{point.description}</p>}
                      <div className="text-xs mt-1 text-gray-500">
                        <div>Lat: {point.lat.toFixed(6)}, Lng: {point.lng.toFixed(6)}</div>
                      </div>
                      {point.day !== undefined && (
                        <div className="text-xs mt-2 text-gray-500 flex items-center justify-between">
                          <span>Jour {point.day}</span>
                          <span>Étape {orderInDay + 1}</span>
                        </div>
                      )}
                      {editMode && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              setEditingPoint(point);
                              setShowEditPanel(true);
                            }}
                          >
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => enableMoveMode(point.id)}
                          >
                            Repositionner
                          </Button>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            
            {/* Tracé de l'itinéraire entre les points - Modifier pour utiliser pointsByDay filtré */}
            {showDirections && Object.entries(pointsByDay).map(([day, dayPoints]) => {
              const dayNum = parseInt(day);
              
              // Ne tracer que les jours dans la plage du voyage
              if (!isDayInTravelRange(dayNum) || dayPoints.length < 2) return null;
              
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
              onClick={handleMapClick}
              onMoveMode={moveMode}
            />
          </MapContainer>
        </div>
        
        {/* Panneau d'édition */}
        {editMode && (
          <div className="w-300 border-l border-gray-200 bg-gray-50 overflow-y-auto" style={{ height, width: '300px' }}>
            <div className="p-4">
              <h3 className="text-lg font-medium mb-4">Itinéraire</h3>
              
              {moveMode && moveTarget && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center text-amber-700 mb-2">
                    <Move size={16} className="mr-2" />
                    <strong>Mode repositionnement</strong>
                  </div>
                  <p className="text-sm text-amber-700 mb-2">
                    Cliquez sur la carte pour déplacer le point ou entrez les coordonnées manuellement ci-dessous.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-xs text-amber-800">Latitude</label>
                      <input 
                        type="number" 
                        className="w-full text-sm border border-amber-300 rounded p-1"
                        value={manualLat}
                        onChange={(e) => setManualLat(parseFloat(e.target.value))}
                        step="0.000001"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-amber-800">Longitude</label>
                      <input 
                        type="number" 
                        className="w-full text-sm border border-amber-300 rounded p-1"
                        value={manualLng} 
                        onChange={(e) => setManualLng(parseFloat(e.target.value))}
                        step="0.000001"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button 
                      size="sm" 
                      variant="default" 
                      onClick={() => {
                        if (moveTarget && !isNaN(manualLat) && !isNaN(manualLng)) {
                          movePoint(moveTarget, manualLat, manualLng);
                          toast("Le point a été repositionné avec succès");
                        } else {
                          toast("Veuillez entrer des coordonnées valides");
                        }
                      }}
                    >
                      Appliquer
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setMoveMode(false);
                        setMoveTarget(null);
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
              
              {editingPoint ? (
                <div className="bg-white rounded-lg border p-3 mb-4">
                  <h4 className="font-medium text-blue-600 mb-2">Éditer le point</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-md text-sm"
                        value={editingPoint.title}
                        onChange={(e) => updatePointDetails(editingPoint.id, { title: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        className="w-full p-2 border rounded-md text-sm"
                        rows={3}
                        value={editingPoint.description || ''}
                        onChange={(e) => updatePointDetails(editingPoint.id, { description: e.target.value })}
                      ></textarea>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                          <input
                            type="number"
                            step="0.000001"
                            className="w-full p-2 border rounded-md text-sm"
                            value={editingPoint.lat}
                            onChange={(e) => updatePointDetails(editingPoint.id, { lat: parseFloat(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                          <input
                            type="number"
                            step="0.000001"
                            className="w-full p-2 border rounded-md text-sm"
                            value={editingPoint.lng}
                            onChange={(e) => updatePointDetails(editingPoint.id, { lng: parseFloat(e.target.value) })}
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs flex items-center justify-center"
                        onClick={() => enableMoveMode(editingPoint.id)}
                      >
                        <Move size={14} className="mr-1" /> Repositionner sur la carte
                      </Button>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        className="w-full p-2 border rounded-md text-sm"
                        value={editingPoint.type || 'visit'}
                        onChange={(e) => updatePointDetails(editingPoint.id, { type: e.target.value as any })}
                      >
                        <option value="visit">Visite</option>
                        <option value="transport">Transport</option>
                        <option value="accommodation">Hébergement</option>
                        <option value="food">Restauration</option>
                        <option value="activity">Activité</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Jour</label>
                      <select
                        className="w-full p-2 border rounded-md text-sm"
                        value={editingPoint.day || 0}
                        onChange={(e) => updatePointDetails(editingPoint.id, { day: parseInt(e.target.value) })}
                      >
                        {Array.from({ length: 10 }, (_, i) => (
                          <option key={i} value={i}>Jour {i + 1}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
                      <input
                        type="color"
                        className="w-full p-1 border rounded-md h-10"
                        value={editingPoint.color || '#3B82F6'}
                        onChange={(e) => updatePointDetails(editingPoint.id, { color: e.target.value })}
                      />
                    </div>
                    
                    <div className="flex space-x-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setEditingPoint(null)}
                      >
                        Fermer
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          if (confirm("Êtes-vous sûr de vouloir supprimer ce point ?")) {
                            setMapPoints(prev => prev.filter(p => p.id !== editingPoint.id));
                            setEditingPoint(null);
                          }
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-4">Cliquez sur un point de la carte pour l'éditer</p>
              )}
              
              <h4 className="font-medium mb-2">Liste des étapes</h4>
              
              {Object.entries(pointsByDay).sort((a, b) => Number(a[0]) - Number(b[0])).map(([day, dayPoints]) => {
                if (Number(day) === 0) return null; // Ignorer les points sans jour assigné
                
                // Trier les points par ordre
                const sortedPoints = [...dayPoints].sort((a, b) => (a.order || 0) - (b.order || 0));
                
                return (
                  <div key={day} className="mb-4">
                    <h5 className="text-sm font-medium text-blue-600 mb-2">Jour {day}</h5>
                    <div className="space-y-2">
                      {sortedPoints.map((point, index) => (
                        <div 
                          key={point.id}
                          className={`flex items-center justify-between p-2 rounded-md border ${
                            editingPoint?.id === point.id ? 'bg-blue-50 border-blue-300' : 'bg-white'
                          }`}
                        >
                          <div 
                            className="flex items-center text-sm cursor-pointer flex-1"
                            onClick={() => {
                              setEditingPoint(point);
                              if (mapInstance.current) {
                                mapInstance.current.setView([point.lat, point.lng], 13);
                              }
                            }}
                          >
                            <div 
                              className="w-5 h-5 rounded-full mr-2 flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: point.color || '#3B82F6' }}
                            >
                              {index + 1}
                            </div>
                            <span className="truncate">{point.title}</span>
                          </div>
                          
                          <div className="flex space-x-1">
                            <button 
                              className="text-gray-500 hover:text-blue-500 disabled:opacity-30"
                              onClick={() => movePointUp(point.id, Number(day))}
                              disabled={index === 0}
                            >
                              ↑
                            </button>
                            <button 
                              className="text-gray-500 hover:text-blue-500 disabled:opacity-30"
                              onClick={() => movePointDown(point.id, Number(day))}
                              disabled={index === sortedPoints.length - 1}
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Légende de l'itinéraire - Utilise déjà pointsByDay filtré */}
      {!editMode && (
        <div className="p-4 border-t border-gray-200">
          <h4 className="text-sm font-medium mb-3">Légende</h4>
          <div className="space-y-4">
            {Object.keys(pointsByDay)
              .filter(dayStr => {
                const day = parseInt(dayStr);
                return isDayInTravelRange(day);
              })
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(dayStr => {
                const day = parseInt(dayStr);
                const dayColor = `hsl(${(day * 30) % 360}, 70%, 50%)`;
                
                // S'assurer que les points sont triés par ordre
                const sortedPoints = [...pointsByDay[day]]
                  .sort((a, b) => (a.order || 0) - (b.order || 0));
                  
                if (sortedPoints.length === 0) return null;
                
                return (
                  <div key={day} className="relative">
                    {/* Barre verticale colorée */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-full" 
                      style={{ backgroundColor: dayColor, height: '100%' }}
                    />
                    
                    {/* Jour */}
                    <div className="text-sm font-medium ml-4 mb-2">
                      Jour {day}
                    </div>
                    
                    {/* Points du jour */}
                    <div className="space-y-2 ml-4">
                      {sortedPoints.map((point, index) => (
                        <div 
                          key={point.id}
                          className={`flex items-center text-xs p-1 rounded-md cursor-pointer ${
                            selectedPointId === point.id ? 'bg-blue-50 font-medium' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            if (onPointSelect) onPointSelect(point.id);
                            if (mapInstance.current) {
                              mapInstance.current.setView([point.lat, point.lng], 13);
                            }
                          }}
                        >
                          {/* Point numéroté */}
                          <div 
                            className="w-5 h-5 rounded-full mr-2 flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: point.color || dayColor }}
                          >
                            {index + 1}
                          </div>
                          
                          {/* Titre du point */}
                          <span className="truncate">{point.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
          {Object.keys(pointsByDay).filter(dayStr => isDayInTravelRange(parseInt(dayStr))).length === 0 && (
            <div className="text-gray-500 text-sm italic">
              Aucun point à afficher dans les dates du voyage
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ItineraryMap.displayName = 'ItineraryMap';

export default ItineraryMap;
