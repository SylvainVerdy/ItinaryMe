"use client";

import { useState, useEffect } from 'react';
import { addDays, format, isSameDay, startOfDay, endOfDay, differenceInDays, startOfHour, addHours } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TravelEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  description?: string;
  location?: string;
  color?: string;
}

interface TravelCalendarProps {
  startDate: string | Date;
  endDate: string | Date;
  events?: TravelEvent[];
  onEventAdd?: (event: Omit<TravelEvent, 'id'>) => void;
  onEventUpdate?: (event: TravelEvent) => void;
  onEventDelete?: (eventId: string) => void;
}

export default function TravelCalendar({ 
  startDate, 
  endDate, 
  events = [], 
  onEventAdd,
  onEventUpdate,
  onEventDelete
}: TravelCalendarProps) {
  // Convertir les dates si elles sont des chaînes de caractères
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  
  const [selectedDate, setSelectedDate] = useState<Date>(start);
  const [displayMode, setDisplayMode] = useState<'day' | 'trip'>('trip');
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState<Omit<TravelEvent, 'id'>>({
    title: '',
    start: new Date(),
    end: new Date(),
    allDay: true
  });
  const [editingEvent, setEditingEvent] = useState<TravelEvent | null>(null);
  
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
      location: ''
    });
    
    setShowEventForm(true);
  };
  
  const handleEditEvent = (event: TravelEvent) => {
    setEditingEvent(event);
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
      allDay: true
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
              className="border rounded-lg overflow-hidden bg-gray-50 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleDaySelect(day.date)}
            >
              <div className="bg-blue-100 px-4 py-2 border-b">
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
                        <div className="mr-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{backgroundColor: event.color || '#3B82F6'}}
                          ></div>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{event.title}</div>
                          <div className="text-sm text-gray-600">
                            {formatTimeRange(event)}
                            {event.location && <div>{event.location}</div>}
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
                  isSameDay(eventStart, selectedDate) || isSameDay(eventEnd, selectedDate)
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
                        <div className="font-medium">{event.title}</div>
                        <div>{format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}</div>
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
                    <div className="font-medium">{event.title}</div>
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
                <input
                  type="text"
                  className="w-full p-2 border rounded-md"
                  value={editingEvent?.location || newEvent.location || ''}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                />
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
    </div>
  );
} 