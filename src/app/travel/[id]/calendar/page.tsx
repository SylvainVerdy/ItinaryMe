"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { travelService } from '@/services/travelService';
import { calendarService } from '@/services/calendarService';
import TravelCalendar from '@/components/TravelCalendar';
import { TravelEvent } from '@/lib/types';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Loader2, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const travelId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [travel, setTravel] = useState<any>(null);
  const [events, setEvents] = useState<TravelEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchTravelAndEvents = async () => {
      if (authLoading || !user) return;
      
      // Si travelId est undefined, rediriger vers la page des voyages
      if (!travelId) {
        router.push('/travels');
        return;
      }
      
      try {
        setLoading(true);
        
        // Récupérer les détails du voyage
        const travelData = await travelService.getTravelById(travelId);
        
        if (!travelData) {
          setError("Ce voyage n'existe pas.");
          return;
        }
        
        if (travelData.userId !== user.uid) {
          setError("Vous n'avez pas accès à ce voyage.");
          return;
        }
        
        setTravel(travelData);
        
        // Charger les événements du calendrier
        const calendarEvents = await calendarService.getEventsForTrip(travelId);
        setEvents(calendarEvents.map(event => ({
          ...event,
          start: event.start instanceof Date ? event.start : new Date(event.start),
          end: event.end instanceof Date ? event.end : new Date(event.end)
        })));
        
      } catch (error) {
        console.error("Erreur lors du chargement:", error);
        setError("Une erreur est survenue lors du chargement des données.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTravelAndEvents();
  }, [travelId, user, authLoading, router]);
  
  // Si travelId est undefined, afficher un message d'erreur
  if (!travelId) {
    return (
      <div className="min-h-screen bg-[#f8f5ec]">
        <Navbar />
        <main className="container mx-auto pt-24 pb-16 px-4">
          <div className="bg-red-50 p-4 rounded-lg text-red-700">
            ID de voyage invalide. Redirection...
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  const handleAddEvent = async (event: Omit<TravelEvent, 'id' | 'tripId'>) => {
    try {
      const eventId = await calendarService.addEvent({
        ...event,
        tripId: travelId
      });
      
      if (eventId) {
        // Recharger les événements
        const updatedEvents = await calendarService.getEventsForTrip(travelId);
        setEvents(updatedEvents.map(event => ({
          ...event,
          start: event.start instanceof Date ? event.start : new Date(event.start),
          end: event.end instanceof Date ? event.end : new Date(event.end)
        })));
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'événement:", error);
    }
  };
  
  const handleUpdateEvent = async (event: TravelEvent) => {
    if (!event.tripId) {
      event.tripId = travelId; // Ajouter tripId si manquant
    }
    
    try {
      const success = await calendarService.updateEvent(event);
      
      if (success) {
        // Recharger les événements
        const updatedEvents = await calendarService.getEventsForTrip(travelId);
        setEvents(updatedEvents.map(event => ({
          ...event,
          start: event.start instanceof Date ? event.start : new Date(event.start),
          end: event.end instanceof Date ? event.end : new Date(event.end)
        })));
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'événement:", error);
    }
  };
  
  const handleDeleteEvent = async (eventId: string) => {
    try {
      const success = await calendarService.deleteEvent(eventId);
      
      if (success) {
        // Mettre à jour l'état local
        setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de l'événement:", error);
    }
  };
  
  return (
    <div className="min-h-screen bg-[#f8f5ec]">
      <Navbar />
      
      <main className="container mx-auto pt-24 pb-16 px-4">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/travel/${travelId}`}
            className="p-1.5 rounded-md hover:bg-[#f0ece3] transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-600" />
          </Link>
          <div className="flex-grow">
            <h1 className="text-2xl font-bold">
              {loading ? 'Chargement...' : travel?.destination}
            </h1>
            {travel && (
              <p className="text-sm text-gray-600">
                Du {new Date(travel.dateDepart).toLocaleDateString('fr-FR')} au {new Date(travel.dateRetour).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-lg text-red-700">
            {error}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-medium text-gray-800 flex items-center">
                <CalendarIcon className="mr-2 h-5 w-5 text-blue-500" />
                Calendrier du voyage
              </h2>
              <Link href={`/travel/${travelId}`}>
                <Button variant="outline" size="sm">
                  Retour au voyage
                </Button>
              </Link>
            </div>
            
            <TravelCalendar
              startDate={travel.dateDepart}
              endDate={travel.dateRetour}
              events={events}
              onEventAdd={handleAddEvent}
              onEventUpdate={handleUpdateEvent}
              onEventDelete={handleDeleteEvent}
            />
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
} 