"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo, useCallback } from 'react';
import { MapPin, Navigation, Bed, Utensils, Ticket, ExternalLink, Move, Calendar, RefreshCw, Edit, Trash } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Button } from './ui/button';
import toast from 'react-hot-toast';
import { MapPoint, TravelEvent } from '@/lib/types';

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
  showOnlyCalendarEvents?: boolean;
  onEventDelete?: (eventId: string) => void;
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
  syncWithPlanning = false,
  showOnlyCalendarEvents = false,
  onEventDelete
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
  const [debugMode, setDebugMode] = useState(false);
  const [filterOnlyCalendarEvents, setFilterOnlyCalendarEvents] = useState(showOnlyCalendarEvents);
  
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

  // Mettre à jour l'état local si la prop change
  useEffect(() => {
    setFilterOnlyCalendarEvents(showOnlyCalendarEvents);
  }, [showOnlyCalendarEvents]);

  // Fonction pour vérifier si un jour est dans la plage de voyage
  const isDayInTravelRange = (day: number | string): boolean => {
    if (typeof day === 'string') {
      day = parseInt(day);
    }
    // En mode debug, afficher tous les points
    if (debugMode) return true;
    
    // Si pas de dates définies, afficher tous les points
    if (!startDate || !endDate) return true;
    
    // En cas de jour non défini ou jour 0, toujours afficher le point
    if (!day || day <= 0) return true;
    
    try {
      // Obtenir les dates de début et fin exactes du voyage
      const travelStartDate = new Date(startDate);
      travelStartDate.setHours(0, 0, 0, 0); // Début de la journée
      travelStartDate.setDate(travelStartDate.getDate() - 2); // Ajouter 2 jours de marge
      
      const travelEndDate = new Date(endDate);
      travelEndDate.setHours(23, 59, 59, 999); // Fin de la journée
      travelEndDate.setDate(travelEndDate.getDate() + 2); // Ajouter 2 jours de marge
      
      // Calculer la date correspondant à ce jour
      const dayDate = new Date(travelStartDate);
      dayDate.setDate(dayDate.getDate() + (day - 1));
      dayDate.setHours(12, 0, 0, 0); // Midi
      
      // Vérifier si le jour est dans la plage du voyage (avec marge)
      const isInRange = dayDate >= travelStartDate && dayDate <= travelEndDate;
      
      // En mode debug, afficher des informations détaillées
      if (debugMode) {
        console.log(`Jour ${day} (${dayDate.toLocaleDateString()}): ${isInRange ? 'Dans la plage' : 'Hors plage'}`);
        console.log(`- Plage du voyage: ${travelStartDate.toLocaleDateString()} - ${travelEndDate.toLocaleDateString()}`);
      }
      
      return isInRange;
    } catch (error) {
      console.error("Erreur lors du calcul des dates pour le filtrage:", error);
      return true; // En cas d'erreur, afficher le point par défaut
    }
  };
  
  // Filtrer les points à afficher sur la carte
  const filteredMapPoints = useMemo(() => {
    // Même en mode debug, respecter certains filtres de base
    return mapPoints.filter(point => {
      const day = point.day || 0;
      
      // Si point de test (ajouté manuellement) ou non lié à un événement, conserver en mode debug
      if (debugMode && (point.id.startsWith('test-') || !point.id.startsWith('event-'))) {
        return true;
      }
      
      // Toujours filtrer les points explicitement cachés
      if (point.hideOnMap) {
        return false;
      }

      // Filtre pour n'afficher que les points liés au calendrier
      if (filterOnlyCalendarEvents) {
        // Si le point n'a pas d'ID commençant par "event-", il n'est pas lié au calendrier
        if (!point.id.startsWith('event-')) {
          return false;
        }
        
        // Vérifier si l'événement correspondant existe toujours dans planningEvents
        const eventId = point.id.replace('event-', '');
        const event = planningEvents.find(event => event.id === eventId);
        
        if (!event) {
          return false;
        }
        
        // Vérifier si l'événement est marqué comme caché sur la carte
        if (event.hideOnMap) {
          return false;
        }
      }
      
      // Pour tous les autres points, appliquer le filtrage normal
      return isDayInTravelRange(day);
    });
  }, [mapPoints, startDate, endDate, debugMode, filterOnlyCalendarEvents, planningEvents]);
  
  // Grouper les points par jour
  const pointsByDay = useMemo(() => {
    return filteredMapPoints.reduce((acc: Record<string, MapPoint[]>, point) => {
      const day = point.day?.toString() || "0";
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(point);
      return acc;
    }, {});
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

  // Améliorer la manière dont on crée les icônes personnalisées
  const createCustomIcon = (type?: string, color?: string, order?: number, isActiveMoving?: boolean) => {
    // Utiliser une couleur par défaut basée sur le type
    let defaultColor = '#3B82F6'; // Bleu par défaut
    
    switch(type) {
      case 'visit': defaultColor = '#4CAF50'; break; // Vert
      case 'transport': defaultColor = '#2196F3'; break; // Bleu
      case 'accommodation': defaultColor = '#9C27B0'; break; // Violet
      case 'food': defaultColor = '#FF9800'; break; // Orange
      case 'activity': defaultColor = '#F44336'; break; // Rouge
    }
    
    const finalColor = color || defaultColor;
    
    // Créer un HTML pour l'icône avec une ombre plus prononcée et une meilleure visibilité
    const iconHtml = `
      <div style="
        display: flex; 
        align-items: center; 
        justify-content: center; 
        width: 36px; 
        height: 36px; 
        background-color: ${finalColor}; 
        border-radius: 50%; 
        color: white;
        font-weight: bold;
        font-size: 16px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.4);
        border: 3px solid white;
        ${isActiveMoving ? 'animation: pulse 1.5s infinite;' : ''}
      ">
        ${order !== undefined && order >= 0 ? (order + 1) : '•'}
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
    
    // Créer une icône plus grande et centrée correctement
    return L.divIcon({
      html: iconHtml,
      className: 'custom-div-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
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
  const handleMapClickInMoveMode = (e: L.LeafletMouseEvent | number, lngParam?: number) => {
    // Si e est un événement, extraire lat/lng
    let lat: number, lng: number;
    
    if (typeof e === 'number' && typeof lngParam === 'number') {
      // Cas où on reçoit directement lat, lng
      lat = e;
      lng = lngParam;
    } else if (e && typeof e !== 'number') {
      // Cas où on reçoit un événement LeafletMouseEvent
      lat = e.latlng.lat;
      lng = e.latlng.lng;
    } else {
      return; // Données invalides
    }
    
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

  // Fonction manuelle pour synchroniser avec le planning
  const syncWithTravelPlanning = () => {
    // Afficher tous les événements disponibles pour le débogage, y compris les coordonnées brutes
    console.log("TOUS LES ÉVÉNEMENTS DU PLANNING:", planningEvents);
    planningEvents.forEach((event, index) => {
      console.log(`Événement #${index+1}: "${event.title}"`);
      console.log(`- ID: ${event.id}`);
      console.log(`- Date début: ${event.start ? new Date(event.start).toLocaleString() : "non définie"}`);
      console.log(`- Date fin: ${event.end ? new Date(event.end).toLocaleString() : "non définie"}`);
      console.log(`- Jour: ${event.day || "non défini"}`);
      console.log(`- Coordonnées:`, event.coordinates);
      if (event.coordinates) {
        console.log(`  - lat: ${event.coordinates.lat} (type: ${typeof event.coordinates.lat})`);
        console.log(`  - lng: ${event.coordinates.lng} (type: ${typeof event.coordinates.lng})`);
        
        // Vérifier si les coordonnées sont des chaînes qui peuvent être converties en nombres
        if (typeof event.coordinates.lat === 'string') {
          console.log(`  - lat convertie: ${parseFloat(event.coordinates.lat)}`);
        }
        if (typeof event.coordinates.lng === 'string') {
          console.log(`  - lng convertie: ${parseFloat(event.coordinates.lng)}`);
        }
      }
      console.log(`- Description: ${event.description || "aucune"}`);
      console.log(`- Type: ${event.eventType || "non défini"}`);
      console.log(`- Location: ${event.location || "non définie"}`);
      console.log(`- Masqué sur la carte: ${event.hideOnMap ? "Oui" : "Non"}`);
      console.log("-------------------");
    });

    if (planningEvents.length > 0) {
      console.log('Synchronisation avec', planningEvents.length, 'événements du planning');
      
      // Vérifier les dates du voyage
      console.log("Dates du voyage:", { 
        startDate: startDate ? new Date(startDate).toLocaleString() : "non définie", 
        endDate: endDate ? new Date(endDate).toLocaleString() : "non définie" 
      });
      
      // Créer un tableau pour stocker tous les points
      const newPoints: MapPoint[] = [];
      
      // Conserver les points non liés aux événements
      const nonEventPoints = mapPoints.filter(p => !p.id.startsWith('event-'));
      newPoints.push(...nonEventPoints);
      
      // Filtrer les événements masqués
      const visibleEvents = planningEvents.filter(event => !event.hideOnMap);
      console.log(`${visibleEvents.length}/${planningEvents.length} événements visibles (non masqués)`);
      
      // IMPORTANT: Récupérer TOUS les événements avec des coordonnées valides sans filtrage de date
      // Nous assouplirons au maximum les critères pour voir tous les événements possibles
      const eventsWithCoordinates = visibleEvents.filter(event => {
        // Vérifier si l'événement a des coordonnées qui peuvent être utilisées
        let hasValidCoordinates = false;
        
        if (event.coordinates) {
          // Tenter de convertir les coordonnées en nombres valides
          const lat = typeof event.coordinates.lat === 'string' 
            ? parseFloat(event.coordinates.lat) 
            : event.coordinates.lat;
          
          const lng = typeof event.coordinates.lng === 'string' 
            ? parseFloat(event.coordinates.lng) 
            : event.coordinates.lng;
          
          hasValidCoordinates = !isNaN(Number(lat)) && !isNaN(Number(lng));
          
          if (!hasValidCoordinates) {
            console.log(`Événement "${event.title}" ignoré: coordonnées invalides:`, event.coordinates);
          }
        } else {
          // Si l'événement a une localisation mais pas de coordonnées, essayer de géocoder
          if (event.location && event.location.trim() !== '') {
            console.log(`Événement "${event.title}" a une localisation sans coordonnées: ${event.location}`);
            // Note: Le géocodage est asynchrone et ne peut pas être fait ici directement
            // Mais on pourrait ajouter une fonctionnalité pour géocoder automatiquement
          } else {
            console.log(`Événement "${event.title}" ignoré: pas de coordonnées ni de localisation`);
          }
        }
        
        return hasValidCoordinates;
      });
      
      console.log(`${eventsWithCoordinates.length}/${visibleEvents.length} événements visibles (non masqués)`);
      
      // Si aucun événement n'a de coordonnées valides
      if (eventsWithCoordinates.length === 0) {
        toast.error("Aucun événement n'a de coordonnées géographiques valides", {
          icon: '📍',
          duration: 4000
        });
        return;
      }
      
      // Créer des points pour tous les événements avec des coordonnées valides
      const eventPoints = eventsWithCoordinates.map((event, index) => {
        // Déterminer le jour (utiliser une valeur par défaut de 1 si non défini)
        let eventDay = event.day || 1;
        
        // Si l'événement a une date et que le voyage a une date de début, calculer le jour
        if (event.start && startDate) {
          try {
            const eventDate = new Date(event.start);
            const travelStartDate = new Date(startDate);
            
            // Calculer le nombre de jours depuis le début du voyage
            const diffTime = eventDate.getTime() - travelStartDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            
            // Utiliser le jour calculé uniquement s'il est positif
            if (diffDays >= 0) {
              eventDay = diffDays + 1; // Le jour 1 est le premier jour
            }
            
            console.log(`Jour calculé pour "${event.title}": ${eventDay}`);
          } catch (e) {
            console.warn(`Erreur de calcul de date pour l'événement "${event.title}"`, e);
          }
        }
        
        // S'assurer que le jour est au moins 1
        if (eventDay < 1) eventDay = 1;
        
        // Convertir les coordonnées en nombres
        let lat: number;
        let lng: number;
        
        try {
          // Convertir explicitement les coordonnées en nombres
          lat = typeof event.coordinates!.lat === 'string' 
            ? parseFloat(event.coordinates!.lat) 
            : Number(event.coordinates!.lat);
          
          lng = typeof event.coordinates!.lng === 'string' 
            ? parseFloat(event.coordinates!.lng) 
            : Number(event.coordinates!.lng);
          
          // Vérifier que les conversions sont valides
          if (isNaN(lat) || isNaN(lng)) {
            console.error(`Coordonnées invalides pour l'événement "${event.title}"`, event.coordinates);
            // Utiliser des coordonnées par défaut pour Paris
            lat = 48.8566;
            lng = 2.3522;
          }
        } catch (e) {
          console.error(`Erreur lors de la conversion des coordonnées pour "${event.title}"`, e);
          // Utiliser des coordonnées par défaut pour Paris
          lat = 48.8566;
          lng = 2.3522;
        }
        
        // Déterminer le type de point
        let pointType: MapPoint['type'] = 'other';
        
        // Utiliser d'abord eventType s'il est défini
        if (event.eventType && ['visit', 'transport', 'accommodation', 'food', 'activity', 'other'].includes(event.eventType)) {
          pointType = event.eventType as MapPoint['type'];
        } else {
          // Sinon, déterminer le type en fonction du titre/description
          pointType = determinePointType(event);
        }
        
        // Créer le point
        const newPoint: MapPoint = {
          id: `event-${event.id}`,
          lat,
          lng,
          title: event.title,
          description: event.description || '',
          type: pointType,
          color: event.color || '#3B82F6',
          day: eventDay,
          order: index,
          hideOnMap: event.hideOnMap
        };
        
        console.log(`Point créé pour "${event.title}":`, newPoint);
        return newPoint;
      });
      
      console.log("Points créés:", eventPoints);
      
      // Ajouter tous les points d'événements aux points existants
      newPoints.push(...eventPoints);
      
      // Mettre à jour les points sur la carte
      setMapPoints(newPoints);
      setLastSyncTime(new Date());
      
      // Informer l'utilisateur
      toast.success(`${eventPoints.length} points du planning ajoutés à la carte`, {
        duration: 3000
      });
      
      // Centrer la carte sur les points
      if (eventPoints.length > 0 && mapInstance.current) {
        try {
          // Ajouter tous les points à un tableau de coordonnées pour créer les limites
          const coordinates = eventPoints.map(p => [p.lat, p.lng]);
          
          // S'assurer que toutes les coordonnées sont valides
          const validCoordinates = coordinates.filter(
            coord => !isNaN(coord[0]) && !isNaN(coord[1])
          );
          
          if (validCoordinates.length > 0) {
            // Créer les limites et ajuster la vue
            const bounds = L.latLngBounds(validCoordinates as [number, number][]);
            mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
          } else {
            console.warn("Impossible de centrer la carte: pas de coordonnées valides");
          }
        } catch (e) {
          console.error("Erreur lors du centrage de la carte", e);
        }
      }
    } else {
      toast.error("Aucun événement disponible dans le planning", {
        duration: 3000
      });
    }
  };

  // Fonction pour déterminer le type de point en fonction de l'événement
  const determinePointType = (event: TravelEvent): MapPoint['type'] => {
    const title = event.title.toLowerCase();
    
    if (title.includes('vol') || title.includes('train') || title.includes('bus') || 
        title.includes('transport') || title.includes('airport') || title.includes('gare')) {
      return 'transport';
    }
    
    if (title.includes('hôtel') || title.includes('hotel') || title.includes('airbnb') || 
        title.includes('logement') || title.includes('appartement') || title.includes('chambre')) {
      return 'accommodation';
    }
    
    if (title.includes('restaurant') || title.includes('café') || title.includes('bar') || 
        title.includes('dîner') || title.includes('déjeuner') || title.includes('petit-déjeuner')) {
      return 'food';
    }
    
    return 'activity';
  };

  // Ajouter des points de test
  const addTestPoints = () => {
    const newPoints: MapPoint[] = [
      {
        id: `point-${Date.now()}-1`,
        lat: 48.8566,
        lng: 2.3522,
        title: 'Tour Eiffel',
        description: 'Visite de la Tour Eiffel',
        type: 'activity',
        day: 1,
        order: 0
      },
      {
        id: `point-${Date.now()}-2`,
        lat: 48.8606,
        lng: 2.3376,
        title: 'Arc de Triomphe',
        description: 'Visite de l\'Arc de Triomphe',
        type: 'activity',
        day: 1,
        order: 1
      },
      {
        id: `point-${Date.now()}-3`,
        lat: 48.8861,
        lng: 2.3418,
        title: 'Montmartre',
        description: 'Promenade à Montmartre',
        type: 'activity',
        day: 2,
        order: 0
      },
      {
        id: `point-${Date.now()}-4`,
        lat: 48.8611,
        lng: 2.3364,
        title: 'Hôtel Paris',
        description: 'Nuit à l\'hôtel',
        type: 'accommodation',
        day: 1,
        order: 2
      },
      {
        id: `point-${Date.now()}-5`,
        lat: 48.8738,
        lng: 2.2950,
        title: 'Restaurant Le Duplex',
        description: 'Dîner gastronomique',
        type: 'food',
        day: 2,
        order: 1
      },
    ];
    
    setMapPoints(prev => [...prev, ...newPoints]);
    toast.success('Points de test ajoutés avec succès !');
  };

  // Fonction pour activer/désactiver le mode debug
  const toggleDebugMode = () => {
    const newDebugMode = !debugMode;
    setDebugMode(newDebugMode);
    
    if (newDebugMode) {
      toast.success("Mode debug activé avec filtrage de base", {
        icon: '🛠️',
        duration: 2000
      });
    } else {
      toast.success("Mode debug désactivé", {
        icon: '🛠️',
        duration: 2000
      });
    }
  };

  // Ajouter un bouton pour activer/désactiver le filtre
  const toggleCalendarFilter = () => {
    setFilterOnlyCalendarEvents(prev => !prev);
  };

  // Ajouter un point correspondant à l'événement
  const addEventPoint = (event: TravelEvent) => {
    if (!event.coordinates) return null;
    
    const newPoint: Omit<MapPoint, 'id'> = {
      lat: event.coordinates.lat,
      lng: event.coordinates.lng,
      title: event.title,
      description: event.description || '',
      type: event.eventType || 'activity',
      day: event.noteId || "0", // Utiliser noteId comme jour
      order: 0
    };
    // ... existing code ...
  };

  // Fonction pour attribuer une couleur en fonction du type de point
  const getPointColor = (type: string = 'activity'): string => {
    switch(type) {
      case 'activity':
        return '#FF9900'; // Orange
      case 'transport':
        return '#3498db'; // Bleu
      case 'accommodation':
        return '#1abc9c'; // Vert
      case 'food':
        return '#e74c3c'; // Rouge
      default:
        return '#9b59b6'; // Violet
    }
  };

  const createMarker = (point: MapPoint, onClick?: () => void) => {
    // Définir l'icône en fonction du type
    let markerColor = getPointColor(point.type);
    // ... existing code ...
  };

  // Créer les Points d'intérêt au clic
  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    if (!onMapClick) return;
    
    const { lat, lng } = e.latlng;
    onMapClick(lat, lng);
  }, [onMapClick]);

  const getPointTypeIcon = (type?: string) => {
    switch(type) {
      case 'activity':
        return <Ticket className="h-4 w-4" />;
      case 'transport':
        return <Navigation className="h-4 w-4" />;
      case 'accommodation':
        return <Bed className="h-4 w-4" />;
      case 'food':
        return <Utensils className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
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
          {filteredMapPoints.length === 0 && mapPoints.length > 0 && (
            <div className="flex items-center text-amber-500 bg-amber-50 px-3 py-1 rounded-md text-sm mr-2">
              <span>⚠️</span> Points filtrés par date
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
              console.log("Bouton Sync Planning cliqué");
              syncWithTravelPlanning();
            }}
            title="Synchroniser avec le planning"
          >
            <RefreshCw size={14} className="mr-1" /> Sync Planning
          </Button>
          
          <Button 
            variant={debugMode ? "default" : "outline"}
            className="px-3 py-1 text-sm"
            onClick={toggleDebugMode}
            title="Activer/désactiver le mode debug"
          >
            {debugMode ? "Désactiver Debug" : "Debug"}
          </Button>
          
          <Button 
            variant="outline"
            className="px-3 py-1 text-sm"
            onClick={addTestPoints}
            title="Ajouter des points de test"
          >
            🔍 Points Test
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
          
          <Button
            variant="outline"
            size="sm"
            onClick={toggleCalendarFilter}
            className={`flex items-center gap-1 ${filterOnlyCalendarEvents ? 'bg-blue-100' : ''}`}
            title={filterOnlyCalendarEvents ? "Afficher tous les points" : "Afficher uniquement les événements du calendrier"}
          >
            <Calendar size={16} />
            {filterOnlyCalendarEvents ? "Filtré" : "Tous"}
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
            
            /* Style pour améliorer la visibilité des marqueurs */
            .custom-div-icon {
              filter: drop-shadow(0px 3px 3px rgba(0,0,0,0.3));
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
                <p className="text-sm text-gray-600 mb-2">
                  Aucun point n'est affiché sur la carte. Vérifiez que vos événements ont des coordonnées géographiques
                  et sont dans les dates du voyage.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    className="text-xs"
                    size="sm"
                    onClick={syncWithTravelPlanning}
                  >
                    <RefreshCw size={14} className="mr-1" /> Synchroniser
                  </Button>
                  <Button
                    className="text-xs"
                    size="sm"
                    onClick={() => setDebugMode(true)}
                  >
                    🛠️ Mode Debug
                  </Button>
                </div>
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
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {editMode && (
                          <>
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
                          </>
                        )}
                        
                        {/* Bouton de suppression, visible même en dehors du mode édition */}
                        {point.id.startsWith('event-') && onEventDelete && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs col-span-2 mt-1"
                            onClick={() => {
                              const eventId = point.id.replace('event-', '');
                              if (confirm(`Voulez-vous vraiment supprimer cet événement "${point.title}" ?`)) {
                                // Supprimer l'événement via la fonction du composant parent
                                onEventDelete(eventId);
                                // Fermer la popup
                                mapInstance.current?.closePopup();
                                toast.success("Événement supprimé avec succès");
                              }
                            }}
                          >
                            Supprimer cet événement
                          </Button>
                        )}
                      </div>
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
              onClick={handleMapClickInMoveMode}
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
                          if (editingPoint.id.startsWith('event-') && onEventDelete) {
                            if (confirm(`Voulez-vous vraiment supprimer l'événement "${editingPoint.title}" ?`)) {
                              const eventId = editingPoint.id.replace('event-', '');
                              onEventDelete(eventId);
                              setEditingPoint(null);
                              toast.success("Événement supprimé avec succès");
                            }
                          } else {
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
                // Liste des événements du calendrier
                <div className="bg-white rounded-lg border p-3 mb-4">
                  <h4 className="font-medium text-blue-600 mb-2">Événements sur la carte</h4>
                  
                  {filteredMapPoints.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">Aucun événement visible sur la carte</p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {filteredMapPoints.map((point) => (
                        <div
                          key={point.id}
                          className="p-2 border rounded-md hover:bg-gray-50 transition cursor-pointer"
                          onClick={() => {
                            mapInstance.current?.setView([point.lat, point.lng], 14);
                            setSelectedPoint(point);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-1">
                                {getPointTypeIcon(point.type)}
                                <span>{point.title}</span>
                              </div>
                              {point.description && (
                                <p className="text-xs text-gray-600 mt-1 truncate">{point.description}</p>
                              )}
                              {point.day && (
                                <div className="text-xs text-gray-500 mt-1">Jour {point.day}</div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                className="p-1 rounded hover:bg-gray-200"
                                title="Centrer sur la carte"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  mapInstance.current?.setView([point.lat, point.lng], 14);
                                }}
                              >
                                <MapPin size={14} className="text-blue-500" />
                              </button>
                              <button
                                className="p-1 rounded hover:bg-gray-200"
                                title="Modifier"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPoint(point);
                                }}
                              >
                                <Edit size={14} className="text-gray-500" />
                              </button>
                              {point.id.startsWith('event-') && onEventDelete && (
                                <button
                                  className="p-1 rounded hover:bg-red-100"
                                  title="Supprimer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Voulez-vous vraiment supprimer l'événement "${point.title}" ?`)) {
                                      const eventId = point.id.replace('event-', '');
                                      onEventDelete(eventId);
                                      toast.success("Événement supprimé avec succès");
                                    }
                                  }}
                                >
                                  <Trash size={14} className="text-red-500" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                // En mode debug, afficher tous les jours
                if (debugMode) return day > 0;
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
          {Object.keys(pointsByDay).filter(dayStr => debugMode ? parseInt(dayStr) > 0 : isDayInTravelRange(parseInt(dayStr))).length === 0 && (
            <div className="text-gray-500 text-sm italic">
              {debugMode 
                ? "Aucun point sur la carte. Cliquez sur 'Points Test' pour ajouter des exemples." 
                : "Aucun point à afficher dans les dates du voyage"}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ItineraryMap.displayName = 'ItineraryMap';

export default ItineraryMap;
