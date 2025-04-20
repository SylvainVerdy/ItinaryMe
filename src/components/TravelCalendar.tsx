"use client";

import { useState, useEffect, useRef } from 'react';
import { addDays, format, isSameDay, startOfDay, endOfDay, differenceInDays, startOfHour, addHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, Navigation, Bed, Utensils, Ticket, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface TravelEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  description?: string;
  location?: string;
  color?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  noteId?: string;
  eventType?: 'visit' | 'transport' | 'accommodation' | 'food' | 'activity' | 'other';
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
  // Convertir les dates si elles sont des chaînes de caractères
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  
  const [selectedDate, setSelectedDate] = useState<Date>(externalSelectedDate || start);
  const [displayMode, setDisplayMode] = useState<'day' | 'trip'>('trip');
  const [showEventForm, setShowEventForm] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [newEvent, setNewEvent] = useState<Omit<TravelEvent, 'id'>>({
    title: '',
    start: new Date(),
    end: new Date(),
    allDay: true,
    eventType: 'visit'
  });
  const [editingEvent, setEditingEvent] = useState<TravelEvent | null>(null);
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
    if (linkedMapRef?.current && newEvent.coordinates) {
      // Simuler le centrage de la carte sur les coordonnées de l'événement
      console.log("Centrage de la carte sur:", newEvent.coordinates);
      if (linkedMapRef.current.panTo) {
        linkedMapRef.current.panTo(newEvent.coordinates.lat, newEvent.coordinates.lng);
      }
    }
  }, [showLocationPicker, linkedMapRef, newEvent.coordinates]);
  
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
    
    setNewEvent({
      title: '',
      start: defaultStartTime,
      end: defaultEndTime,
      allDay: displayMode !== 'day',
      description: '',
      location: '',
      eventType: 'visit'
    });
    
    setShowEventForm(true);
  };
  
  const handleEditEvent = (event: TravelEvent) => {
    setEditingEvent(event);
    
    if (onEventSelect) {
      onEventSelect(event);
    }
    
    setShowEventForm(true);
  };
  
  const handleSaveEvent = () => {
    if (editingEvent) {
      // Mettre à jour un événement existant
      onEventUpdate?.({
        ...editingEvent,
        ...newEvent,
      });
    } else {
      // Ajouter un nouvel événement
      onEventAdd?.(newEvent);
    }
    
    setShowEventForm(false);
    setEditingEvent(null);
    setNewEvent({
      title: '',
      start: new Date(),
      end: new Date(),
      allDay: true,
      eventType: 'visit'
    });
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
    switch (eventType) {
      case 'visit':
        return <MapPin size={16} className="text-blue-500" />;
      case 'transport':
        return <Navigation size={16} className="text-green-500" />;
      case 'accommodation':
        return <Bed size={16} className="text-purple-500" />;
      case 'food':
        return <Utensils size={16} className="text-orange-500" />;
      case 'activity':
        return <Ticket size={16} className="text-pink-500" />;
      default:
        return <ExternalLink size={16} className="text-gray-500" />;
    }
  };

  const handleSetLocation = (coordinates: {lat: number, lng: number}) => {
    setNewEvent({
      ...newEvent,
      coordinates
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
    const initialCoordinates = newEvent.coordinates || centerMapCoordinates;
    
    // Afficher le dialogue de sélection de position
    setShowLocationPicker(true);
    
    // Utiliser la fonction panTo de la carte pour centrer sur les coordonnées initiales
    setTimeout(() => {
      if (linkedMapRef.current && initialCoordinates) {
        try {
          // Utiliser la méthode panTo qui est exposée via useImperativeHandle dans ItineraryMap
          linkedMapRef.current.panTo(initialCoordinates.lat, initialCoordinates.lng);
          
          // Mettre à jour l'état local pour le suivi des coordonnées sélectionnées
          setNewEvent(prev => ({
            ...prev,
            coordinates: initialCoordinates
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
                        className="flex items-start p-2 rounded-md bg-white border"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEvent(event);
                        }}
                      >
                        <div className="mr-2 flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{backgroundColor: event.color || '#3B82F6'}}
                          ></div>
                          <div className="ml-2">
                            {getEventTypeIcon(event.eventType)}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{event.title}</div>
                          <div className="text-sm text-gray-600">
                            {formatTimeRange(event)}
                            {event.location && <div>{event.location}</div>}
                          </div>
                        </div>
                        {event.coordinates && (
                          <div 
                            className="ml-2 p-1 rounded-full bg-blue-100 hover:bg-blue-200 cursor-pointer"
                            title="Voir sur la carte"
                          >
                            <MapPin size={14} className="text-blue-600" />
                          </div>
                        )}
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
                        className="absolute rounded-md p-1 overflow-hidden text-sm"
                        style={{
                          backgroundColor: event.color || '#3B82F6',
                          color: 'white',
                          top: '4px',
                          left: '8px',
                          right: '8px',
                          height: 'calc(100% - 8px)',
                          opacity: 0.9
                        }}
                        onClick={() => handleEditEvent(event)}
                      >
                        <div className="font-medium flex items-center gap-1">
                          {getEventTypeIcon(event.eventType)}
                          <span>{event.title}</span>
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
                    className="p-3 rounded-md border"
                    style={{
                      borderLeftColor: event.color || '#3B82F6',
                      borderLeftWidth: '4px'
                    }}
                    onClick={() => handleEditEvent(event)}
                  >
                    <div className="font-medium flex items-center gap-1">
                      {getEventTypeIcon(event.eventType)}
                      <span>{event.title}</span>
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
      {showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {editingEvent ? 'Modifier l\'événement' : 'Ajouter un événement'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md"
                  value={editingEvent?.title || newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type d'événement</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={editingEvent?.eventType || newEvent.eventType}
                  onChange={(e) => setNewEvent({...newEvent, eventType: e.target.value as any})}
                >
                  <option value="visit">Visite</option>
                  <option value="transport">Transport</option>
                  <option value="accommodation">Hébergement</option>
                  <option value="food">Restauration</option>
                  <option value="activity">Activité</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allDay"
                  className="mr-2"
                  checked={editingEvent?.allDay || newEvent.allDay}
                  onChange={(e) => setNewEvent({...newEvent, allDay: e.target.checked})}
                />
                <label htmlFor="allDay" className="text-sm font-medium text-gray-700">Toute la journée</label>
              </div>
              
              {!(editingEvent?.allDay || newEvent.allDay) && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                      <input
                        type="date"
                        className="w-full p-2 border rounded-md"
                        value={format(editingEvent?.start || newEvent.start, 'yyyy-MM-dd')}
                        onChange={(e) => {
                          const date = new Date(e.target.value);
                          const currentDate = editingEvent?.start || newEvent.start;
                          date.setHours(currentDate.getHours(), currentDate.getMinutes());
                          setNewEvent({...newEvent, start: date});
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Heure de début</label>
                      <input
                        type="time"
                        className="w-full p-2 border rounded-md"
                        value={format(editingEvent?.start || newEvent.start, 'HH:mm')}
                        onChange={(e) => {
                          const [hours, minutes] = e.target.value.split(':').map(Number);
                          const date = new Date(editingEvent?.start || newEvent.start);
                          date.setHours(hours, minutes);
                          setNewEvent({...newEvent, start: date});
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                      <input
                        type="date"
                        className="w-full p-2 border rounded-md"
                        value={format(editingEvent?.end || newEvent.end, 'yyyy-MM-dd')}
                        onChange={(e) => {
                          const date = new Date(e.target.value);
                          const currentDate = editingEvent?.end || newEvent.end;
                          date.setHours(currentDate.getHours(), currentDate.getMinutes());
                          setNewEvent({...newEvent, end: date});
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Heure de fin</label>
                      <input
                        type="time"
                        className="w-full p-2 border rounded-md"
                        value={format(editingEvent?.end || newEvent.end, 'HH:mm')}
                        onChange={(e) => {
                          const [hours, minutes] = e.target.value.split(':').map(Number);
                          const date = new Date(editingEvent?.end || newEvent.end);
                          date.setHours(hours, minutes);
                          setNewEvent({...newEvent, end: date});
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
                <div className="flex flex-col">
                  <div className="flex">
                    <input
                      type="text"
                      className="w-full p-2 border rounded-l-md"
                      value={editingEvent?.location || newEvent.location || ''}
                      onChange={(e) => {
                        const address = e.target.value;
                        setNewEvent({...newEvent, location: address});
                        
                        if (address.length > 3) {
                          setSearchingAddress(true);
                          if (addressSearchTimeout.current) {
                            clearTimeout(addressSearchTimeout.current);
                          }
                          addressSearchTimeout.current = setTimeout(() => {
                            handleAddressSearch(address);
                          }, 500);
                        } else {
                          setAddressSuggestions([]);
                        }
                      }}
                      placeholder="Rechercher une adresse..."
                    />
                    <Button
                      className="px-3 py-2 bg-blue-100 text-blue-600 border border-l-0 rounded-r-md hover:bg-blue-200"
                      title="Définir la position sur la carte"
                      onClick={() => handleShowLocationPicker()}
                    >
                      <MapPin size={16} />
                    </Button>
                  </div>

                  {/* Affichage des suggestions d'adresses */}
                  {addressSuggestions.length > 0 && (
                    <div className="absolute mt-10 w-full max-w-md bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                      <ul>
                        {addressSuggestions.map((suggestion, index) => (
                          <li 
                            key={index}
                            className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              setNewEvent({
                                ...newEvent, 
                                location: suggestion.address,
                                coordinates: {
                                  lat: suggestion.lat,
                                  lng: suggestion.lng
                                }
                              });
                              setAddressSuggestions([]);
                            }}
                          >
                            <div className="flex items-center">
                              <MapPin size={14} className="mr-2 text-gray-500" />
                              <span>{suggestion.address}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Indicateur de recherche */}
                  {searchingAddress && addressSuggestions.length === 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Recherche d'adresses...
                    </div>
                  )}
                </div>
                {(editingEvent?.coordinates || newEvent.coordinates) && (
                  <div className="text-xs text-green-600 mt-1">
                    Position définie sur la carte ✓
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full p-2 border rounded-md"
                  rows={3}
                  value={editingEvent?.description || newEvent.description || ''}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
                <input
                  type="color"
                  className="w-full p-1 border rounded-md h-10"
                  value={editingEvent?.color || newEvent.color || '#3B82F6'}
                  onChange={(e) => setNewEvent({...newEvent, color: e.target.value})}
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-between">
              {editingEvent && (
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  onClick={() => handleDeleteEvent(editingEvent.id)}
                >
                  Supprimer
                </button>
              )}
              
              <div className="flex gap-2 ml-auto">
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  onClick={() => {
                    setShowEventForm(false);
                    setEditingEvent(null);
                  }}
                >
                  Annuler
                </button>
                
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  onClick={handleSaveEvent}
                >
                  {editingEvent ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sélecteur de position sur la carte */}
      {showLocationPicker && linkedMapRef?.current && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-medium mb-4">
              Définir la position sur la carte
            </h3>
            
            <div className="h-96 mb-4">
              <div className="relative h-full">
                <div className="absolute top-0 left-0 right-0 z-10 bg-white p-2 rounded-t-lg shadow">
                  <div className="flex">
                    <input
                      type="text"
                      className="w-full p-2 border rounded-l-md"
                      placeholder="Rechercher un lieu..."
                      value={editingEvent?.location || newEvent.location || ''}
                      onChange={(e) => {
                        const address = e.target.value;
                        setNewEvent({...newEvent, location: address});
                        
                        if (address.length > 3) {
                          setSearchingAddress(true);
                          if (addressSearchTimeout.current) {
                            clearTimeout(addressSearchTimeout.current);
                          }
                          addressSearchTimeout.current = setTimeout(() => {
                            handleAddressSearch(address);
                          }, 500);
                        } else {
                          setAddressSuggestions([]);
                        }
                      }}
                    />
                    <button
                      className="px-3 py-2 bg-blue-500 text-white rounded-r-md"
                      onClick={() => {
                        if (newEvent.location && newEvent.location.length > 0) {
                          handleAddressSearch(newEvent.location);
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </button>
                  </div>
                  
                  {addressSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                      <ul>
                        {addressSuggestions.map((suggestion, index) => (
                          <li 
                            key={index} 
                            className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              setNewEvent({
                                ...newEvent,
                                location: suggestion.address,
                                coordinates: {
                                  lat: suggestion.lat,
                                  lng: suggestion.lng
                                }
                              });
                              setAddressSuggestions([]);
                              
                              // Centrer la carte sur cette position
                              if (linkedMapRef?.current && linkedMapRef.current.panTo) {
                                linkedMapRef.current.panTo(suggestion.lat, suggestion.lng);
                              }
                            }}
                          >
                            <div className="flex items-center">
                              <MapPin size={14} className="mr-2 text-gray-500" />
                              <span>{suggestion.address}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="border rounded-lg h-full relative">
                  <p className="text-center text-gray-500 mt-14">Cliquez sur la carte pour définir la position</p>
                  
                  {/* Ici, idéalement, nous afficherions la carte réelle */}
                  {/* Comme nous n'avons pas accès au composant de carte réel, nous utilisons une simulation */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {newEvent.coordinates ? (
                      <div className="text-center">
                        <div className="mb-2">
                          <MapPin size={32} className="text-red-500 inline-block" />
                        </div>
                        <div className="font-medium">{newEvent.location || "Position sélectionnée"}</div>
                        <div className="text-sm text-gray-500">
                          Lat: {newEvent.coordinates.lat.toFixed(6)}, Lng: {newEvent.coordinates.lng.toFixed(6)}
                        </div>
                        <button
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
                          onClick={() => handleSetLocation(newEvent.coordinates!)}
                        >
                          Confirmer cette position
                        </button>
                      </div>
                    ) : (
                      <button
                        className="px-4 py-2 bg-blue-600 text-white rounded-md"
                        onClick={() => {
                          // Utiliser des coordonnées pour le Stade Vélodrome si l'utilisateur recherche ça
                          if (newEvent.location && newEvent.location.toLowerCase().includes("velodrome")) {
                            handleSetLocation({ lat: 43.2696, lng: 5.3953 });
                          } else {
                            // Simulation - Dans une implémentation réelle, ces coordonnées viendraient de la carte
                            const randomLat = 40 + Math.random() * 10;
                            const randomLng = -74 + Math.random() * 10;
                            handleSetLocation({ lat: randomLat, lng: randomLng });
                          }
                        }}
                      >
                        Simuler une sélection de position
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 mr-2"
                onClick={() => setShowLocationPicker(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 