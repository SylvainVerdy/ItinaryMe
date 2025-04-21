"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { travelService } from '@/services/travelService';
import { calendarService } from '@/services/calendarService';
import { integrationService } from '@/services/integrationService';
import ItineraryMap, { ItineraryMapHandle } from '@/components/ItineraryMap';
import { TravelEvent, MapPoint } from '@/lib/types';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Loader2, MapPin, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function MapPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const travelId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { toast } = useToast();
  
  const [travel, setTravel] = useState<any>(null);
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [events, setEvents] = useState<TravelEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<ItineraryMapHandle>(null);
  
  useEffect(() => {
    const fetchTravelAndMapData = async () => {
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
        
        // Convertir les dates string en objets Date
        const formattedEvents = calendarEvents.map(event => ({
          ...event,
          start: event.start instanceof Date ? event.start : new Date(event.start),
          end: event.end instanceof Date ? event.end : new Date(event.end)
        }));
        
        setEvents(formattedEvents);
        
        // Extraire les points de la carte à partir des événements
        if (integrationService.extractMapPointsFromEvents) {
          const points = await integrationService.extractMapPointsFromEvents(formattedEvents);
          setMapPoints(points);
        } else {
          console.warn("La méthode extractMapPointsFromEvents n'existe pas sur integrationService");
          setMapPoints([]);
        }
        
      } catch (error) {
        console.error("Erreur lors du chargement:", error);
        setError("Une erreur est survenue lors du chargement des données.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTravelAndMapData();
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
  
  const handleMapClick = async (lat: number, lng: number) => {
    try {
      // Demander le titre du nouveau point
      const title = prompt("Titre du point d'intérêt:", "");
      if (!title) return;
      
      // Créer un nouvel événement de calendrier
      const newEvent = {
        title,
        start: new Date(),
        end: new Date(new Date().getTime() + 2 * 60 * 60 * 1000), // +2 heures
        allDay: false,
        coordinates: { lat, lng },
        location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        tripId: travelId,
        eventType: 'visit' as const
      };
      
      const eventId = await calendarService.addEvent(newEvent);
      
      if (eventId) {
        toast({
          title: "Point ajouté",
          description: "Le point a été ajouté avec succès.",
          variant: "default",
        });
        
        // Recharger les événements et les points
        const updatedEvents = await calendarService.getEventsForTrip(travelId);
        const formattedEvents = updatedEvents.map(event => ({
          ...event,
          start: event.start instanceof Date ? event.start : new Date(event.start),
          end: event.end instanceof Date ? event.end : new Date(event.end)
        }));
        
        setEvents(formattedEvents);
        
        // Extraire les points de la carte à partir des événements
        if (integrationService.extractMapPointsFromEvents) {
          const points = await integrationService.extractMapPointsFromEvents(formattedEvents);
          setMapPoints(points);
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout du point:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le point.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteEvent = async (eventId: string) => {
    try {
      const success = await calendarService.deleteEvent(eventId);
      
      if (success) {
        toast({
          title: "Point supprimé",
          description: "Le point a été supprimé avec succès.",
          variant: "default",
        });
        
        // Mettre à jour l'état local
        setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
        
        // Mettre à jour les points de la carte
        const updatedEvents = events.filter(event => event.id !== eventId);
        
        if (integrationService.extractMapPointsFromEvents) {
          const points = await integrationService.extractMapPointsFromEvents(updatedEvents);
          setMapPoints(points);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de l'événement:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le point.",
        variant: "destructive",
      });
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
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5 text-green-500" />
                  Carte d'itinéraire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Visualisez votre itinéraire sur la carte. Cliquez sur la carte pour ajouter un nouveau point d'intérêt.
                </p>
                
                <ItineraryMap 
                  ref={mapRef}
                  points={mapPoints}
                  startDate={travel.dateDepart}
                  endDate={travel.dateRetour}
                  height="500px"
                  onMapClick={handleMapClick}
                  planningEvents={events}
                  syncWithPlanning={true}
                  showOnlyCalendarEvents={true}
                  onEventDelete={handleDeleteEvent}
                />
              </CardContent>
            </Card>
            
            <div className="flex justify-end">
              <Link href={`/travel/${travelId}`}>
                <Button variant="outline">
                  Retour au voyage
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
} 