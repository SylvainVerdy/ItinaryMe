"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { addDays, format, isSameDay, startOfDay, endOfDay, differenceInDays, startOfHour, addHours, isWithinInterval, isToday, isBefore, isAfter, parseISO, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, MapPin, Navigation, Bed, Utensils, Ticket, ExternalLink, ArrowLeft, ArrowRight, PlusCircle, X, Edit, Trash, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from 'lucide-react';
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
import dynamic from 'next/dynamic';
import { EventClickArg, EventDropArg, DateSelectArg } from '@fullcalendar/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Importer ClientCalendar de manière dynamique avec ssr: false
const ClientCalendar = dynamic(() => import('./ClientCalendar'), { 
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64 w-full bg-gray-50 rounded-md">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      <span className="ml-3 text-gray-600">Chargement du calendrier...</span>
    </div>
  )
});

// Importer les plugins aussi avec dynamic pour éviter les problèmes de SSR
const plugins = [];

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

// Type pour assurer la compatibilité entre les interfaces
type Coordinates = {
  lat: number;
  lng: number;
};

// Type pour EventResizeDoneArg qui n'est pas exporté directement par @fullcalendar/core
interface EventResizeDoneArg {
  event: any;
  oldEvent?: any;
  delta?: any;
  revert: () => void;
}

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
  const [displayMode, setDisplayMode] = useState<'day' | 'trip' | 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth' | 'listWeek'>('dayGridMonth');
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

  // Supprimer l'adaptateur et restaurer l'ancien handleDaySelect
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
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200">
          <div className="p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-medium text-gray-800 flex items-center gap-2">
                {editing ? (
                  <>
                    <Edit size={20} className="text-blue-500" />
                    <span>Modifier l'événement</span>
                  </>
                ) : (
                  <>
                    <PlusCircle size={20} className="text-green-500" />
                    <span>Ajouter un événement</span>
                  </>
                )}
              </h3>
              <Button variant="ghost" size="icon" className="hover:bg-gray-100 rounded-full" onClick={() => {
                setShowEventForm(false);
                setEditing(null);
              }}>
                <X size={18} />
              </Button>
            </div>
            
            <div className="space-y-5">
              <div>
                <Label htmlFor="title" className="text-gray-700 font-medium">Titre</Label>
                <Input 
                  id="title" 
                  value={eventForm.title} 
                  onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                  placeholder="Nom de l'événement"
                  className="mt-1.5 border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventType" className="text-gray-700 font-medium">Type</Label>
                  <Select 
                    value={eventForm.eventType} 
                    onValueChange={(value) => setEventForm({
                      ...eventForm, 
                      eventType: value as UIEventType
                    })}
                  >
                    <SelectTrigger id="eventType" className="mt-1.5 border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
                      <SelectValue placeholder="Type d'événement" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-1">
                        <SelectItem value="activity" className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Ticket size={16} className="text-pink-500" />
                            <span>Activité</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="transport" className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Navigation size={16} className="text-green-500" />
                            <span>Transport</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="lodging" className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Bed size={16} className="text-purple-500" />
                            <span>Hébergement</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="food" className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Utensils size={16} className="text-orange-500" />
                            <span>Restauration</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="other" className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <ExternalLink size={16} className="text-gray-500" />
                            <span>Autre</span>
                          </div>
                        </SelectItem>
                      </div>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="color" className="text-gray-700 font-medium">Couleur</Label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input 
                      id="color" 
                      type="color" 
                      value={eventForm.color} 
                      onChange={(e) => setEventForm({...eventForm, color: e.target.value})}
                      className="h-10 w-full rounded-md border border-gray-300 cursor-pointer"
                    />
                    <div className="border rounded-md border-gray-300 w-10 h-10" style={{ backgroundColor: eventForm.color }}></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md border border-gray-200">
                <Checkbox 
                  id="allDay" 
                  checked={eventForm.allDay}
                  onCheckedChange={(checked) => setEventForm({
                    ...eventForm, 
                    allDay: checked === true
                  })}
                  className="border-gray-400 data-[state=checked]:bg-blue-500"
                />
                <Label htmlFor="allDay" className="font-medium cursor-pointer">Journée entière</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 font-medium">Date de début</Label>
                  <CustomDatePicker 
                    value={eventForm.start} 
                    onChange={(date) => setEventForm({...eventForm, start: date})} 
                  />
                </div>
                
                {!eventForm.allDay && (
                  <div>
                    <Label className="text-gray-700 font-medium">Heure de début</Label>
                    <TimePicker 
                      date={eventForm.start} 
                      setDate={(date) => setEventForm({...eventForm, start: date})}
                    />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 font-medium">Date de fin</Label>
                  <CustomDatePicker 
                    value={eventForm.end} 
                    onChange={(date) => setEventForm({...eventForm, end: date})}
                  />
                </div>
                
                {!eventForm.allDay && (
                  <div>
                    <Label className="text-gray-700 font-medium">Heure de fin</Label>
                    <TimePicker 
                      date={eventForm.end} 
                      setDate={(date) => setEventForm({...eventForm, end: date})}
                    />
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="description" className="text-gray-700 font-medium">Description</Label>
                <Textarea 
                  id="description" 
                  value={eventForm.description} 
                  onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                  placeholder="Description de l'événement"
                  rows={3}
                  className="mt-1.5 border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              
              <div>
                <Label htmlFor="location" className="text-gray-700 font-medium">Lieu</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input 
                    id="location" 
                    value={eventForm.location} 
                    onChange={(e) => {
                      setEventForm({...eventForm, location: e.target.value});
                      handleAddressSearch(e.target.value);
                    }}
                    placeholder="Adresse ou lieu"
                    className="flex-1 border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    title="Sélectionner sur la carte"
                    onClick={handleShowLocationPicker}
                    className="border-gray-300 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <MapPin size={18} />
                  </Button>
                </div>
                
                {addressSuggestions.length > 0 && (
                  <div className="mt-2 bg-white shadow rounded-md overflow-hidden border">
                    {addressSuggestions.map((suggestion, index) => (
                      <div 
                        key={index}
                        className="p-2 hover:bg-blue-50 cursor-pointer text-sm transition-colors"
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
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                          <span>{suggestion.address}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {searchingAddress && (
                  <div className="mt-2 text-sm text-gray-500 flex items-center">
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    Recherche en cours...
                  </div>
                )}
                
                {eventForm.coordinates && (
                  <div className="mt-2 bg-blue-50 text-blue-700 text-sm p-2 rounded-md flex items-center">
                    <MapPin size={14} className="mr-1.5" />
                    <span className="flex-1">
                      Lat: {eventForm.coordinates.lat.toFixed(6)}, Lng: {eventForm.coordinates.lng.toFixed(6)}
                    </span>
                    <button 
                      className="text-red-500 hover:text-red-700 p-1"
                      onClick={() => setEventForm({...eventForm, coordinates: undefined})}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md border border-gray-200">
                <Checkbox 
                  id="hideOnMap" 
                  checked={eventForm.hideOnMap}
                  onCheckedChange={(checked) => setEventForm({
                    ...eventForm, 
                    hideOnMap: checked === true
                  })}
                  className="border-gray-400 data-[state=checked]:bg-blue-500"
                />
                <Label htmlFor="hideOnMap" className="font-medium cursor-pointer">Ne pas afficher sur la carte</Label>
              </div>
              
              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowEventForm(false);
                    setEditing(null);
                  }}
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleSaveEvent}
                  disabled={!eventForm.title.trim()}
                  className={editing ? "bg-blue-500 hover:bg-blue-600" : "bg-green-500 hover:bg-green-600"}
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
    <div className="w-full h-full p-4 bg-white rounded-lg shadow-md">
      <div className="flex flex-col space-y-6">
        {/* Barre d'outils du calendrier */}
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setDisplayMode('trip')}
              variant="outline"
              size="sm"
              className="p-2 rounded-full"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setDisplayMode('day')}
              variant="outline"
              size="sm"
              className="p-2 rounded-full"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setSelectedDate(new Date())}
              variant="outline"
              size="sm"
              className="ml-2 text-sm font-medium"
            >
              Aujourd'hui
            </Button>
            <h2 className="text-xl font-semibold text-gray-800 ml-4">
              {displayMode === 'trip' ? 'Vue d\'ensemble' : format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setDisplayMode('timeGridDay')}
              variant={displayMode === 'timeGridDay' ? 'default' : 'outline'}
              size="sm"
              className="text-sm font-medium"
            >
              Jour
            </Button>
            <Button
              onClick={() => setDisplayMode('timeGridWeek')}
              variant={displayMode === 'timeGridWeek' ? 'default' : 'outline'}
              size="sm"
              className="text-sm font-medium"
            >
              Semaine
            </Button>
            <Button
              onClick={() => setDisplayMode('dayGridMonth')}
              variant={displayMode === 'dayGridMonth' ? 'default' : 'outline'}
              size="sm"
              className="text-sm font-medium"
            >
              Mois
            </Button>
            <Button
              onClick={() => setDisplayMode('listWeek')}
              variant={displayMode === 'listWeek' ? 'default' : 'outline'}
              size="sm"
              className="text-sm font-medium"
            >
              Liste
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleAddEvent}
              variant="default"
              className="gap-1 items-center"
              size="sm"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Ajouter un événement</span>
            </Button>
          </div>
        </div>

        {/* Calendrier */}
        <div className="calendar-container flex-grow overflow-auto">
          <ClientCalendar
            events={events}
            selectedDate={selectedDate}
            displayMode={displayMode}
            locale={fr}
            onDateSelect={handleDaySelect}
            onEventClick={editEvent}
          />
        </div>
      </div>

      {/* Modal ajout/édition événement */}
      <Dialog open={showEventForm} onOpenChange={setShowEventForm}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {editing ? "Modifier l'événement" : "Ajouter un événement"}
            </DialogTitle>
            <DialogDescription>
              {editing 
                ? 'Modifiez les détails de votre événement'
                : 'Ajoutez les détails de votre nouvel événement'}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4 py-2" onSubmit={(e) => {
            e.preventDefault();
            handleSaveEvent();
          }}>
            <div>
              <Label htmlFor="title" className="text-gray-700 font-medium">Titre</Label>
              <Input
                id="title"
                value={eventForm.title || ''}
                onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                placeholder="Titre de l'événement"
                className="w-full mt-1.5"
                required
              />
            </div>
            
            <div className="flex items-center gap-2 my-3">
              <Checkbox
                id="allDay"
                checked={eventForm.allDay || false}
                onCheckedChange={(checked) => 
                  setEventForm({...eventForm, allDay: checked === true})
                }
              />
              <Label htmlFor="allDay" className="cursor-pointer">Journée entière</Label>
            </div>
            
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700 font-medium">Date de début</Label>
                    <CustomDatePicker 
                      value={eventForm.start} 
                      onChange={(date) => setEventForm({...eventForm, start: date})} 
                    />
                  </div>
                  
                  {!eventForm.allDay && (
                    <div>
                      <Label className="text-gray-700 font-medium">Heure de début</Label>
                      <TimePicker 
                        date={eventForm.start} 
                        setDate={(date) => setEventForm({...eventForm, start: date})}
                      />
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700 font-medium">Date de fin</Label>
                    <CustomDatePicker 
                      value={eventForm.end} 
                      onChange={(date) => setEventForm({...eventForm, end: date})}
                    />
                  </div>
                  
                  {!eventForm.allDay && (
                    <div>
                      <Label className="text-gray-700 font-medium">Heure de fin</Label>
                      <TimePicker 
                        date={eventForm.end} 
                        setDate={(date) => setEventForm({...eventForm, end: date})}
                      />
                    </div>
                  )}
                </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-gray-700 font-medium">Description</Label>
              <Textarea
                id="description"
                value={eventForm.description || ''}
                onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                placeholder="Description de l'événement"
                className="w-full mt-1.5 min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="location" className="text-gray-700 font-medium">Lieu</Label>
              <Input
                id="location"
                value={eventForm.location || ''}
                onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                placeholder="Lieu de l'événement"
                className="w-full mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="color" className="text-gray-700 font-medium">Couleur</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['#3788d8', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEventForm({...eventForm, color})}
                    className={`w-6 h-6 rounded-full transition-all ${
                      eventForm.color === color 
                        ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' 
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              {editing && (
                <Button 
                  onClick={() => {
                    handleDeleteEvent(editing.id);
                    setShowEventForm(false);
                  }} 
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="gap-1"
                >
                  <Trash size={16} />
                  <span>Supprimer</span>
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button 
                  onClick={() => setShowEventForm(false)} 
                  type="button"
                  variant="outline"
                >
                  Annuler
                </Button>
                <Button type="submit">
                  {editing ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
    </div>
  );
} 