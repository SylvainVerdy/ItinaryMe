"use client";

import React, { useEffect, useState } from 'react';
import { TravelEvent } from '@/lib/types';

interface ClientCalendarProps {
  events: any[];
  selectedDate: Date;
  displayMode: string;
  locale: any;
  onDateSelect: (date: Date) => void;
  onEventClick: (event: TravelEvent) => void;
}

export default function ClientCalendar({
  events,
  selectedDate,
  displayMode,
  locale,
  onDateSelect,
  onEventClick
}: ClientCalendarProps) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) {
    return (
      <div className="flex justify-center items-center h-64 w-full bg-gray-50 rounded-md">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Chargement du calendrier...</span>
      </div>
    );
  }
  
  // Convertir notre displayMode personnalisé en un mode compatible avec FullCalendar
  const getFullCalendarView = (mode: string): string => {
    switch (mode) {
      case 'trip':
        return 'dayGridMonth'; // Mode par défaut quand 'trip' est sélectionné
      case 'day':
        return 'timeGridDay';
      default:
        // Si c'est déjà un mode valide de FullCalendar, le retourner tel quel
        return mode;
    }
  };
  
  // Import dynamique des modules requis seulement côté client
  // Ces imports ne seront jamais exécutés côté serveur
  const FullCalendarComponent = () => {
    // Importer dynamiquement les modules nécessaires
    const FullCalendar = require('@fullcalendar/react').default;
    const dayGridPlugin = require('@fullcalendar/daygrid').default;
    const timeGridPlugin = require('@fullcalendar/timegrid').default;
    const interactionPlugin = require('@fullcalendar/interaction').default;
    const listPlugin = require('@fullcalendar/list').default;
    
    return (
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={getFullCalendarView(displayMode)}
        headerToolbar={false}
        locale={locale}
        firstDay={1}
        height="auto"
        events={events}
        initialDate={selectedDate}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        // Callbacks calendrier
        select={(arg: any) => onDateSelect(arg.start)}
        eventClick={(info: any) => {
          onEventClick(info.event);
        }}
        eventDrop={(info: any) => {
          // Handle event drop
        }}
        eventResize={(info: any) => {
          // Handle event resize
        }}
        // Personnalisation apparence
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false,
          hour12: false
        }}
        eventClassNames="rounded-md transition-all duration-200 hover:shadow-md"
        dayHeaderClassNames="font-medium text-gray-700"
        slotLabelClassNames="font-medium text-gray-600 text-sm"
        dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
        dayCellClassNames="hover:bg-gray-50 transition-colors"
        allDayClassNames="font-medium text-gray-700"
        nowIndicatorClassNames="border-red-500"
        slotLaneClassNames="border-gray-100"
      />
    );
  };
  
  // Wrapping dans un try-catch pour capturer les erreurs liées au navigateur
  try {
    return <FullCalendarComponent />;
  } catch (error) {
    console.error("Erreur lors du rendu du calendrier:", error);
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-500">
        Impossible de charger le calendrier. Veuillez rafraîchir la page.
      </div>
    );
  }
} 