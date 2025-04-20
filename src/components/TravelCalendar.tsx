"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { addDays, format, isSameDay, startOfDay, endOfDay, differenceInDays, startOfHour, addHours, isWithinInterval, isToday, isBefore, isAfter, parseISO, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, MapPin, Navigation, Bed, Utensils, Ticket, ExternalLink, ArrowLeft, ArrowRight, PlusCircle, X, Edit, Trash } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { GeoPoint } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { MapPoint, TravelEvent } from '@/lib/types';

// Type pour assurer la compatibilité entre les interfaces
type Coordinates = {
  lat: number;
  lng: number;
};

// Composant TimePicker temporaire
function TimePicker({ date, setDate }: { date: Date, setDate: (date: Date) => void }) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hoursStr, minutesStr] = e.target.value.split(':');
    const newDate = new Date(date);
    newDate.setHours(parseInt(hoursStr), parseInt(minutesStr));
    setDate(newDate);
  };
  
  return (
    <Input
      type="time"
      value={`${hours}:${minutes}`}
      onChange={handleTimeChange}
    />
  );
}

// Fonction utilitaire pour convertir les types de coordonnées
const convertCoordinates = (coords: GeoPoint | Coordinates | undefined): Coordinates | undefined => {
  if (!coords) return undefined;
  
  if ('latitude' in coords) {
    return {
      lat: coords.latitude,
      lng: coords.longitude
    };
  }
  return coords;
};

// Map des types d'événements pour assurer la compatibilité
const mapEventType = (type?: string): TravelEvent['eventType'] => {
  if (!type) return 'activity';
  
  // Convertir lodging en accommodation si nécessaire
  if (type === 'lodging') return 'accommodation';
  if (type === 'accommodation') return 'accommodation';
  if (type === 'transport') return 'transport';
  if (type === 'food') return 'food';
  if (type === 'activity') return 'activity';
  
  return 'other';
};

// Fonction pour convertir accommodation en lodging pour l'interface utilisateur
const formatEventTypeForUI = (type?: string): string => {
  if (type === 'accommodation') return 'lodging';
  return type || 'activity';
};

interface TravelCalendarProps {
  startDate: string | Date;
  endDate: string | Date;
  events?: TravelEvent[];
  onEventAdd?: (event: Omit<TravelEvent, 'id'>) => void;
  onEventUpdate?: (event: TravelEvent) => void;
  onEventDelete?: (eventId: string) => void;
  onEventSelect?: (event: TravelEvent) => void;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  linkedMapRef?: React.RefObject<any>;
}

export default function TravelCalendar({ 
  startDate, 
  endDate, 
  events = [], 
  onEventAdd,
  onEventUpdate,
  onEventDelete,
  onEventSelect,
  selectedDate: externalSelectedDate,
  onDateSelect,
  linkedMapRef
}: TravelCalendarProps) {
  // Type pour l'eventType utilisé en interne dans le formulaire
  type UIEventType = 'activity' | 'transport' | 'lodging' | 'food' | 'other';

  // Convertir les dates si elles sont des chaînes de caractères
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  
  const [selectedDate, setSelectedDate] = useState<Date>(externalSelectedDate || start);
  const [displayMode, setDisplayMode] = useState<'day' | 'trip'>('trip');
  const [showEventForm, setShowEventForm] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [eventForm, setEventForm] = useState<{
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    description: string;
    location: string;
    color: string;
    coordinates?: Coordinates;
    noteId?: string;
    eventType: UIEventType;
    hideOnMap: boolean;
  }>({
    id: '',
    title: '',
    start: new Date(),
    end: new Date(),
    allDay: false,
    description: '',
    location: '',
    color: '#3788d8',
    eventType: 'activity',
    hideOnMap: false,
  });
  const [editing, setEditing] = useState<TravelEvent | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{address: string, lat: number, lng: number}>>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const addressSearchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Ajouter les coordonnées du centre de la carte
  const [centerMapCoordinates, setCenterMapCoordinates] = useState<{lat: number, lng: number}>({
    lat: 46.603354, 
    lng: 1.888334 // Centre de la France par défaut
  });
  
  // Mettre à jour la date sélectionnée si elle est modifiée via les props
  useEffect(() => {
    if (externalSelectedDate) {
      setSelectedDate(externalSelectedDate);
    }
  }, [externalSelectedDate]);
  
  // Initialiser la carte si linkedMapRef existe
  useEffect(() => {
    if (linkedMapRef?.current && eventForm.coordinates) {
      // Simuler le centrage de la carte sur les coordonnées de l'événement
      console.log("Centrage de la carte sur:", eventForm.coordinates);
      if (linkedMapRef.current.panTo) {
        // Convertir en format compatible
        const coords = convertCoordinates(eventForm.coordinates);
        if (coords) {
          linkedMapRef.current.panTo(coords.lat, coords.lng);
        }
      }
    }
  }, [showLocationPicker, linkedMapRef, eventForm.coordinates]);
  
  // Calculer le nombre de jours du voyage
  const tripDays = differenceInDays(end, start) + 1;
  
  // Générer les jours du voyage
  const days = Array.from({ length: tripDays }, (_, i) => {
    const date = addDays(start, i);
    return {
      date,
      dayNumber: i + 1,
      formattedDate: format(date, 'EEEE d MMMM', { locale: fr }),
      events: events.filter(event => 
        event.allDay 
          ? isSameDay(event.start, date)
          : isSameDay(event.start, date) || isSameDay(event.end, date) || 
            (event.start < date && event.end > date)
      )
    };
  });
  
  // Générer les heures pour l'affichage quotidien
  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    return {
      hour,
      formatted: format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')
    };
  });

  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
    
    if (onDateSelect) {
      onDateSelect(date);
    }
    
    setDisplayMode('day');
  };
  
  const handleAddEvent = () => {
    const defaultStartTime = displayMode === 'day' 
      ? startOfHour(addHours(startOfDay(selectedDate), 9)) // 9h du matin par défaut
      : startOfDay(start);
      
    const defaultEndTime = displayMode === 'day'
      ? addHours(defaultStartTime, 1) // Durée d'une heure par défaut
      : endOfDay(start);
    
    setEventForm({
      id: uuidv4(),
      title: '',
      start: defaultStartTime,
      end: defaultEndTime,
      allDay: displayMode !== 'day',
      description: '',
      location: '',
      color: '#3788d8',
      coordinates: undefined,
      eventType: 'activity',
      hideOnMap: false
    });
    
    setShowEventForm(true);
  };
  
  const editEvent = (event: TravelEvent) => {
    const uiEventType = formatEventTypeForUI(event.eventType) as UIEventType;
    
    // Convertir les coordonnées et le type d'événement au format interne
    setEventForm({
      id: event.id,
      title: event.title,
      start: event.start instanceof Date ? event.start : new Date(event.start),
      end: event.end instanceof Date ? event.end : new Date(event.end),
      allDay: event.allDay || false,
      description: event.description || '',
      location: event.location || '',
      color: event.color || '#3788d8',
      coordinates: convertCoordinates(event.coordinates as any),
      eventType: uiEventType,
      hideOnMap: event.hideOnMap || false
    });
    setEditing(event);
    setShowEventForm(true);
  };
  
  const handleSaveEvent = () => {
    // Convertir le type d'événement au format attendu par l'API
    const apiEventType = mapEventType(eventForm.eventType);
    
    // Préparer des coordonnées sûres pour l'API
    const apiCoordinates = eventForm.coordinates ? {
      lat: eventForm.coordinates.lat,
      lng: eventForm.coordinates.lng
    } : undefined;
    
    if (editing) {
      // Mettre à jour un événement existant
      onEventUpdate?.({
        ...editing,
        title: eventForm.title,
        start: eventForm.start,
        end: eventForm.end,
        allDay: eventForm.allDay,
        description: eventForm.description,
        location: eventForm.location,
        color: eventForm.color,
        coordinates: apiCoordinates,
        eventType: apiEventType,
        hideOnMap: eventForm.hideOnMap
      });
    } else {
      // Ajouter un nouvel événement
      onEventAdd?.({
        title: eventForm.title,
        start: eventForm.start,
        end: eventForm.end,
        allDay: eventForm.allDay,
        description: eventForm.description,
        location: eventForm.location,
        color: eventForm.color,
        coordinates: apiCoordinates,
        eventType: apiEventType,
        hideOnMap: eventForm.hideOnMap
      });
    }
    
    setShowEventForm(false);
    setEditing(null);
  };
  
  const handleDeleteEvent = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      onEventDelete?.(id);
    }
  };
  
  const formatTimeRange = (event: TravelEvent) => {
    if (event.allDay) return 'Toute la journée';
    return `${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}`;
  };

  const getEventTypeIcon = (eventType?: string) => {
    const type = formatEventTypeForUI(eventType);
    switch (type) {
      case 'activity':
        return <Ticket size={16} className="text-pink-500" />;
      case 'transport':
        return <Navigation size={16} className="text-green-500" />;
      case 'lodging':
        return <Bed size={16} className="text-purple-500" />;
      case 'food':
        return <Utensils size={16} className="text-orange-500" />;
      case 'other':
        return <ExternalLink size={16} className="text-gray-500" />;
      default:
        return <ExternalLink size={16} className="text-gray-500" />;
    }
  };

  const handleSetLocation = (coordinates: {lat: number, lng: number}) => {
    setEventForm({
      ...eventForm,
      coordinates: {
        lat: coordinates.lat,
        lng: coordinates.lng
      }
    });
    setShowLocationPicker(false);
  };
  
  // Fonction pour rechercher des adresses réelles
  const searchAddresses = async (query: string): Promise<{id: string, text: string, coordinates: {lat: number, lng: number}}[]> => {
    if (!query || query.trim() === '') return [];
    
    try {
      // Utiliser le service Nominatim d'OpenStreetMap pour la recherche d'adresses
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la recherche d\'adresses');
      }
      
      const data = await response.json();
      
      // Transformer les résultats en format attendu
      return data.map((item: any) => ({
        id: item.place_id.toString(),
        text: item.display_name,
        coordinates: {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        }
      }));
    } catch (error) {
      console.error('Erreur lors de la recherche d\'adresses:', error);
      // Fallback sur des suggestions simulées en cas d'erreur
      return [
        { id: '1', text: 'Paris, France', coordinates: { lat: 48.8566, lng: 2.3522 } },
        { id: '2', text: 'Lyon, France', coordinates: { lat: 45.7578, lng: 4.8320 } },
        { id: '3', text: 'Marseille, France', coordinates: { lat: 43.2965, lng: 5.3698 } }
      ].filter(item => item.text.toLowerCase().includes(query.toLowerCase()));
    }
  };
  
  const handleAddressSearch = async (query: string) => {
    try {
      setSearchingAddress(true);
      const results = await searchAddresses(query);
      
      // Transformer les résultats au format attendu par le composant
      const suggestions = results.map(result => ({
        address: result.text,
        lat: result.coordinates.lat,
        lng: result.coordinates.lng
      }));
      
      setAddressSuggestions(suggestions);
    } catch (error) {
      console.error("Erreur lors de la recherche d'adresses:", error);
    } finally {
      setSearchingAddress(false);
    }
  };
  
  // Fonction pour afficher le sélecteur de position sur la carte
  const handleShowLocationPicker = () => {
    // Vérifier si la référence à la carte existe
    if (!linkedMapRef?.current) {
      toast({
        title: "Erreur",
        description: "La carte n'est pas disponible. Veuillez recharger la page.",
        variant: "destructive"
      });
      return;
    }
    
    // Définir les coordonnées de départ (soit celles de l'événement, soit celles du voyage)
    const initialCoordinates = eventForm.coordinates || centerMapCoordinates;
    
    // Afficher le dialogue de sélection de position
    setShowLocationPicker(true);
    
    // Utiliser la fonction panTo de la carte pour centrer sur les coordonnées initiales
    setTimeout(() => {
      if (linkedMapRef.current && initialCoordinates) {
        try {
          // Utiliser la méthode panTo qui est exposée via useImperativeHandle dans ItineraryMap
          linkedMapRef.current.panTo(initialCoordinates.lat, initialCoordinates.lng);
          
          // Mettre à jour l'état local pour le suivi des coordonnées sélectionnées
          setEventForm(prev => ({
            ...prev,
            coordinates: {
              lat: 48.8566, // Paris par défaut
              lng: 2.3522
            }
          }));
        } catch (error) {
          console.error("Erreur lors du centrage de la carte:", error);
          toast({
            title: "Erreur",
            description: "Impossible de centrer la carte sur la position sélectionnée.",
            variant: "destructive"
          });
        }
      }
    }, 300); // Délai pour permettre au dialogue de s'ouvrir
  };
  
  // Rendu de l'interface d'édition d'événement
  const renderEventEditor = () => {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {editing ? 'Modifier l\'événement' : 'Ajouter un événement'}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => {
                setShowEventForm(false);
                setEditing(null);
              }}>
                <X size={18} />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Titre</Label>
                <Input 
                  id="title" 
                  value={eventForm.title} 
                  onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                  placeholder="Nom de l'événement"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventType">Type</Label>
                  <Select 
                    value={eventForm.eventType} 
                    onValueChange={(value) => setEventForm({
                      ...eventForm, 
                      eventType: value as UIEventType
                    })}
                  >
                    <SelectTrigger id="eventType">
                      <SelectValue placeholder="Type d'événement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activity">Activité</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="lodging">Hébergement</SelectItem>
                      <SelectItem value="food">Restauration</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="color">Couleur</Label>
                  <Input 
                    id="color" 
                    type="color" 
                    value={eventForm.color} 
                    onChange={(e) => setEventForm({...eventForm, color: e.target.value})}
                    className="h-10"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="allDay" 
                  checked={eventForm.allDay}
                  onCheckedChange={(checked) => setEventForm({
                    ...eventForm, 
                    allDay: checked === true
                  })}
                />
                <Label htmlFor="allDay">Journée entière</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date de début</Label>
                  <CustomDatePicker value={eventForm.start} onChange={(date) => setEventForm({...eventForm, start: date})} />
                </div>
                
                {!eventForm.allDay && (
                  <div>
                    <Label>Heure de début</Label>
                    <TimePicker date={eventForm.start} setDate={(date) => setEventForm({...eventForm, start: date})} />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date de fin</Label>
                  <CustomDatePicker value={eventForm.end} onChange={(date) => setEventForm({...eventForm, end: date})} />
                </div>
                
                {!eventForm.allDay && (
                  <div>
                    <Label>Heure de fin</Label>
                    <TimePicker date={eventForm.end} setDate={(date) => setEventForm({...eventForm, end: date})} />
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  value={eventForm.description} 
                  onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                  placeholder="Description de l'événement"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="location">Lieu</Label>
                <div className="flex gap-2">
                  <Input 
                    id="location" 
                    value={eventForm.location} 
                    onChange={(e) => {
                      setEventForm({...eventForm, location: e.target.value});
                      handleAddressSearch(e.target.value);
                    }}
                    placeholder="Adresse ou lieu"
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    title="Sélectionner sur la carte"
                    onClick={handleShowLocationPicker}
                  >
                    <MapPin size={18} />
                  </Button>
                </div>
                
                {addressSuggestions.length > 0 && (
                  <div className="mt-2 bg-white shadow rounded-md overflow-hidden border">
                    {addressSuggestions.map((suggestion, index) => (
                      <div 
                        key={index}
                        className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => {
                          setEventForm({
                            ...eventForm,
                            location: suggestion.address,
                            coordinates: {
                              lat: suggestion.lat,
                              lng: suggestion.lng
                            }
                          });
                          setAddressSuggestions([]);
                        }}
                      >
                        {suggestion.address}
                      </div>
                    ))}
                  </div>
                )}
                
                {searchingAddress && (
                  <div className="mt-2 text-sm text-gray-500">
                    Recherche en cours...
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="hideOnMap" 
                  checked={eventForm.hideOnMap}
                  onCheckedChange={(checked) => setEventForm({
                    ...eventForm, 
                    hideOnMap: checked === true
                  })}
                />
                <Label htmlFor="hideOnMap">Ne pas afficher sur la carte</Label>
              </div>
              
              <div className="flex gap-2 justify-end mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowEventForm(false);
                    setEditing(null);
                  }}
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleSaveEvent}
                  disabled={!eventForm.title.trim()}
                >
                  {editing ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };
  
  const mapPointFromEvent = (event: TravelEvent): MapPoint | null => {
    if (!event.coordinates || event.hideOnMap) return null;
    
    const coords = convertCoordinates(event.coordinates as any);
    if (!coords) return null;
    
    // Mapper le type d'événement au format attendu par MapPoint
    const mapPointType = mapEventType(event.eventType) as MapPoint['type'];
    
    return {
      id: event.id,
      lat: coords.lat,
      lng: coords.lng,
      title: event.title,
      description: event.description || '',
      type: mapPointType,
      color: event.color || '#3788d8',
      day: format(event.start instanceof Date ? event.start : new Date(event.start), 'yyyy-MM-dd'),
      order: 0
    };
  };
  
  // Formatage de la date pour l'affichage
  const formatDate = (date: Date): string => {
    return format(date, 'dd MMMM yyyy', { locale: fr });
  };

  // Formatage de l'heure pour l'affichage
  const formatTime = (date: Date): string => {
    return format(date, 'HH:mm', { locale: fr });
  };

  // Création d'un composant wrapper pour DatePicker
  const CustomDatePicker = ({ value, onChange }: { value: Date, onChange: (date: Date) => void }) => {
    // Utiliser le composant DatePicker de ui avec les bonnes props
    // Cette implémentation dépendra de comment DatePicker est défini dans ui/date-picker.tsx
    // Pour l'instant on utilise une solution simple
    return (
      <Input
        type="date"
        value={format(value, 'yyyy-MM-dd')}
        onChange={(e) => {
          if (e.target.value) {
            const newDate = new Date(e.target.value);
            newDate.setHours(value.getHours(), value.getMinutes());
            onChange(newDate);
          }
        }}
      />
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Calendrier du voyage</h3>
        
        <div className="flex gap-2">
          <button
            onClick={() => setDisplayMode('trip')}
            className={`px-3 py-1 rounded-md text-sm ${
              displayMode === 'trip' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Vue d'ensemble
          </button>
          <button
            onClick={() => setDisplayMode('day')}
            className={`px-3 py-1 rounded-md text-sm ${
              displayMode === 'day' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Vue journalière
          </button>
          <button
            onClick={handleAddEvent}
            className="px-3 py-1 rounded-md text-sm bg-green-600 text-white hover:bg-green-700"
          >
            + Ajouter
          </button>
        </div>
      </div>
      
      {displayMode === 'trip' ? (
        /* Vue d'ensemble du voyage */
        <div className="space-y-4">
          {days.map((day) => (
            <div 
              key={day.dayNumber} 
              className={`border rounded-lg overflow-hidden ${
                isSameDay(day.date, selectedDate) 
                  ? 'bg-blue-50 border-blue-300' 
                  : 'bg-gray-50 hover:shadow-md transition-shadow'
              } cursor-pointer`}
              onClick={() => handleDaySelect(day.date)}
            >
              <div className={`px-4 py-2 border-b ${
                isSameDay(day.date, selectedDate) ? 'bg-blue-100' : 'bg-blue-100'
              }`}>
                <div className="font-medium">Jour {day.dayNumber} - {day.formattedDate}</div>
              </div>
              
              <div className="p-4">
                {day.events.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">Aucun événement</p>
                ) : (
                  <ul className="space-y-2">
                    {day.events.map((event) => (
                      <li 
                        key={event.id} 
                        className={`flex items-start p-2 rounded-md bg-white border ${event.hideOnMap ? 'border-dashed border-gray-300' : 'border-gray-200'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          editEvent(event);
                        }}
                      >
                        <div className="mr-2 flex items-center">
                          <div 
                            className={`w-3 h-3 rounded-full ${event.hideOnMap ? 'opacity-50' : ''}`}
                            style={{backgroundColor: event.color || '#3788d8'}}
                          ></div>
                          <div className="ml-2">
                            {getEventTypeIcon(event.eventType)}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium ${event.hideOnMap ? 'text-gray-500' : ''}`}>
                            {event.title}
                            {event.hideOnMap && (
                              <span className="ml-2 text-xs bg-gray-200 px-1 py-0.5 rounded text-gray-500">
                                masqué sur la carte
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatTimeRange(event)}
                            {event.location && <div>{event.location}</div>}
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          {event.coordinates && (
                            <div 
                              className={`p-1 rounded-full ${event.hideOnMap ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 hover:bg-blue-200 text-blue-600'} cursor-pointer`}
                              title={event.hideOnMap ? "Masqué sur la carte" : "Voir sur la carte"}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (linkedMapRef?.current?.panTo && event.coordinates) {
                                  linkedMapRef.current.panTo(event.coordinates.lat, event.coordinates.lng);
                                }
                              }}
                            >
                              <MapPin size={14} />
                            </div>
                          )}
                          <div 
                            className="p-1 rounded-full bg-red-100 hover:bg-red-200 text-red-600 cursor-pointer"
                            title="Supprimer l'événement"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(event.id);
                            }}
                          >
                            <Trash size={14} />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Vue journalière */
        <div>
          <div className="flex justify-between items-center mb-4">
            <button 
              className="p-1 rounded-md hover:bg-gray-100"
              onClick={() => {
                const prevDay = addDays(selectedDate, -1);
                if (prevDay >= start && prevDay <= end) {
                  setSelectedDate(prevDay);
                  if (onDateSelect) {
                    onDateSelect(prevDay);
                  }
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            
            <h4 className="text-lg font-medium">
              {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </h4>
            
            <button 
              className="p-1 rounded-md hover:bg-gray-100"
              onClick={() => {
                const nextDay = addDays(selectedDate, 1);
                if (nextDay >= start && nextDay <= end) {
                  setSelectedDate(nextDay);
                  if (onDateSelect) {
                    onDateSelect(nextDay);
                  }
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="grid grid-cols-[60px_1fr] border-b">
              <div className="p-2 font-medium text-center border-r text-gray-500">Heure</div>
              <div className="p-2 font-medium">Activité</div>
            </div>
            
            {hours.map(({ hour, formatted }) => {
              const hourEvents = events.filter(event => {
                if (event.allDay) return false;
                
                const eventStart = new Date(event.start);
                const eventEnd = new Date(event.end);
                const hourStart = new Date(selectedDate).setHours(hour, 0, 0, 0);
                const hourEnd = new Date(selectedDate).setHours(hour, 59, 59, 999);
                
                return (
                  (eventStart.getTime() <= hourEnd && eventEnd.getTime() >= hourStart) &&
                  (isSameDay(eventStart, selectedDate) || isSameDay(eventEnd, selectedDate))
                );
              });
              
              return (
                <div key={hour} className="grid grid-cols-[60px_1fr] border-b min-h-[60px] hover:bg-gray-50">
                  <div className="p-2 text-center border-r text-sm text-gray-500">{formatted}</div>
                  <div className="p-2 relative">
                    {hourEvents.map(event => (
                      <div 
                        key={event.id}
                        className={`absolute rounded-md p-1 overflow-hidden text-sm ${event.hideOnMap ? 'opacity-50' : 'opacity-90'}`}
                        style={{
                          backgroundColor: event.color || '#3788d8',
                          color: 'white',
                          top: '4px',
                          left: '8px',
                          right: '8px',
                          height: 'calc(100% - 8px)'
                        }}
                        onClick={() => editEvent(event)}
                      >
                        <div className="font-medium flex items-center gap-1">
                          {getEventTypeIcon(event.eventType)}
                          <span className={event.hideOnMap ? 'text-gray-500' : ''}>{event.title}</span>
                          {event.hideOnMap && (
                            <span className="ml-auto text-xs bg-white/20 px-1 rounded">
                              masqué
                            </span>
                          )}
                          <div className="ml-auto flex space-x-1">
                            <button
                              className="p-1 rounded-full bg-white/30 hover:bg-white/50 text-white"
                              title="Supprimer l'événement"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvent(event.id);
                              }}
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        </div>
                        <div>{format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}</div>
                        {event.location && <div className="text-white/80 text-xs">{event.location}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Événements sur toute la journée */}
          <div className="mt-4">
            <h5 className="font-medium mb-2">Événements sur toute la journée</h5>
            <div className="space-y-2">
              {events
                .filter(event => event.allDay && isSameDay(event.start, selectedDate))
                .map(event => (
                  <div 
                    key={event.id}
                    className={`p-3 rounded-md border ${event.hideOnMap ? 'border-dashed' : ''}`}
                    style={{
                      borderLeftColor: event.color || '#3788d8',
                      borderLeftWidth: '4px'
                    }}
                    onClick={() => editEvent(event)}
                  >
                    <div className="font-medium flex items-center gap-1">
                      {getEventTypeIcon(event.eventType)}
                      <span className={event.hideOnMap ? 'text-gray-500' : ''}>{event.title}</span>
                      {event.hideOnMap && (
                        <span className="ml-2 text-xs bg-gray-200 px-1 py-0.5 rounded text-gray-500">
                          masqué sur la carte
                        </span>
                      )}
                    </div>
                    {event.location && <div className="text-sm text-gray-600">{event.location}</div>}
                    {event.description && <div className="text-sm mt-1">{event.description}</div>}
                  </div>
                ))}
              
              {events.filter(event => event.allDay && isSameDay(event.start, selectedDate)).length === 0 && (
                <p className="text-gray-500 text-sm italic">Aucun événement sur toute la journée</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Formulaire d'ajout/modification d'événement */}
      {showEventForm && renderEventEditor()}

      {/* Sélecteur de position sur la carte */}
      {showLocationPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-xl">
            <h3 className="text-lg font-medium mb-4">
              Sélectionner une position
            </h3>
            
            <div className="mb-4">
              <div className="flex">
                <input
                  type="text"
                  className="w-full p-2 border rounded-l-md"
                  placeholder="Rechercher un lieu..."
                  value={editing?.location || eventForm.location || ''}
                  onChange={(e) => {
                    const address = e.target.value;
                    
                    if (editing) {
                      setEditing({...editing, location: address});
                    } else {
                      setEventForm({...eventForm, location: address});
                    }
                    
                    if (address.length > 3) {
                      // Rechercher l'adresse après un court délai
                      if (addressSearchTimeout.current) {
                        clearTimeout(addressSearchTimeout.current);
                      }
                      
                      addressSearchTimeout.current = setTimeout(() => {
                        handleAddressSearch(address);
                      }, 500);
                    }
                  }}
                />
                <button 
                  className="px-3 py-2 bg-blue-600 text-white border border-l-0 rounded-r-md hover:bg-blue-700"
                  onClick={async () => {
                    const address = editing?.location || eventForm.location;
                    if (address) {
                      await handleAddressSearch(address);
                    }
                  }}
                >
                  Rechercher
                </button>
              </div>
              
              {/* Afficher les suggestions d'adresses */}
              {addressSuggestions.length > 0 && (
                <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                  {addressSuggestions.map((suggestion, index) => (
                    <div 
                      key={index}
                      className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => {
                        setEventForm({
                          ...eventForm,
                          location: suggestion.address,
                          coordinates: {
                            lat: suggestion.lat,
                            lng: suggestion.lng
                          }
                        });
                        setAddressSuggestions([]);
                      }}
                    >
                      {suggestion.address}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Utilisez le champ de recherche ci-dessus pour trouver un lieu ou cliquez directement sur le point dans la carte ci-dessous où se situe votre événement.
            </p>
            
            <div className="h-64 border rounded-md mb-4 bg-gray-100 flex items-center justify-center">
              <p className="text-gray-500">
                Carte interactive (intégration à implémenter)
              </p>
            </div>
            
            <div className="mt-6 flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                onClick={() => setShowLocationPicker(false)}
              >
                Annuler
              </button>
              
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => {
                  if (editing) {
                    handleSetLocation({
                      lat: 48.8566, // Paris par défaut
                      lng: 2.3522
                    });
                  } else {
                    setEventForm({
                      ...eventForm,
                      coordinates: {
                        lat: 48.8566, // Paris par défaut
                        lng: 2.3522
                      }
                    });
                  }
                  setShowLocationPicker(false);
                }}
              >
                Sélectionner (Paris par défaut)
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Afficher l'éditeur d'événement si nécessaire */}
      {editing && renderEventEditor()}
    </div>
  );
} 