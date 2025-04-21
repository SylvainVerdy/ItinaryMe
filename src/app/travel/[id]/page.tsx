"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { travelService, TravelPlan } from '@/services/travelService';
import { LogoutButton } from '@/components/LogoutButton';
import Link from 'next/link';
import { Star, Image, Calendar, Users, LinkIcon, FileText, FileEdit, CheckCircle, Loader2, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MapPin } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import EditTravelImage from './edit-image';
import { EditTripDates } from '@/components/EditTripDates';
import TravelNotes from '@/components/TravelNotes';
import ItineraryMap, { ItineraryMapHandle } from '@/components/ItineraryMap';
import * as React from 'react';
import TravelCalendar from '@/components/TravelCalendar';
import { calendarService } from '@/services/calendarService';
import { integrationService } from '@/services/integrationService';
import { v4 as uuidv4 } from 'uuid';
import { MapPoint, TravelEvent, Note } from '@/lib/types';
import ClientOnly from '@/components/ClientOnly';

export default function TravelDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const travelId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { toast } = useToast();
  
  const [travel, setTravel] = useState<TravelPlan | null>(null);
  const [loadingTravel, setLoadingTravel] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showEditImage, setShowEditImage] = useState(false);
  const [showEditNotes, setShowEditNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<TravelEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const mapRef = useRef<ItineraryMapHandle>(null);
  const [shouldEditNotes, setShouldEditNotes] = useState(false);
  
  // Vérifier le paramètre editNotes dans l'URL - sécurisé pour SSR
  useEffect(() => {
    // Ne pas accéder à window lors du rendu côté serveur
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const editNotesParam = params.get('editNotes') === 'true';
      if (editNotesParam) {
        setShowEditNotes(true);
      }
      setShouldEditNotes(editNotesParam);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    
    if (!travelId) {
      setError("ID de voyage non valide");
      setLoadingTravel(false);
      return;
    }
    
    const fetchTravelDetails = async () => {
      try {
        setLoadingTravel(true);
        const travelData = await travelService.getTravelById(travelId);
        
        if (!travelData) {
          setError("Ce voyage n'existe pas.");
          return;
        }
        
        if (travelData.userId !== user?.uid) {
          setError("Vous n'avez pas accès à ce voyage.");
          return;
        }
        
        setTravel(travelData);
        setIsFavorite(travelData.isFavorite || false);
        
        // Initialiser les notes
        if (travelData.notes) {
          setNotes(travelData.notes);
        }
        
        // Tenter de récupérer l'image depuis la collection 'images'
        try {
          if (travelData.imageId) {
            console.log("Récupération de l'image depuis la collection 'images'...");
            const imageDoc = await getDoc(doc(db, 'images', travelData.imageId));
            
            if (imageDoc.exists()) {
              console.log("Image trouvée dans la collection 'images'");
              const imageData = imageDoc.data();
              setImageData(imageData.base64Data);
            } else {
              console.log("L'image n'existe pas dans la collection 'images'");
              // Fallback vers l'URL si disponible
              setImageData(travelData.imageUrl || null);
            }
          } else {
            // Aucun ID d'image, utiliser l'URL si disponible
            setImageData(travelData.imageUrl || null);
          }
        } catch (imgError) {
          console.error("Erreur lors de la récupération de l'image:", imgError);
          // Fallback vers l'URL si disponible
          setImageData(travelData.imageUrl || null);
        }
        
      } catch (error) {
        console.error("Erreur lors de la récupération du voyage:", error);
        setError("Une erreur est survenue lors du chargement du voyage.");
      } finally {
        setLoadingTravel(false);
      }
    };
    
    fetchTravelDetails();
  }, [travelId, user, loading, router]);
  
  useEffect(() => {
    // Charger les événements du calendrier
    const fetchCalendarEvents = async () => {
      if (!travelId) return;
      
      try {
        setLoadingEvents(true);
        const events = await calendarService.getEventsForTrip(travelId);
        console.log("Événements du calendrier chargés:", events);
        setCalendarEvents(events);
      } catch (error) {
        console.error("Erreur lors du chargement des événements du calendrier:", error);
      } finally {
        setLoadingEvents(false);
      }
    };
    
    if (travel) {
      fetchCalendarEvents();
    }
  }, [travelId, travel]);
  
  useEffect(() => {
    // Charger les points sur la carte
    const fetchMapPoints = async () => {
      if (!travelId || !calendarEvents.length) return;
      
      try {
        // Extraire les points de la carte à partir des événements du calendrier
        const points = await integrationService.extractMapPointsFromEvents(
          calendarEvents.map(event => ({
            ...event,
            start: new Date(event.start),
            end: new Date(event.end)
          })) as TravelEvent[]
        );
        setMapPoints(points);
      } catch (error) {
        console.error("Erreur lors du chargement des points sur la carte:", error);
      }
    };
    
    if (!loadingEvents) {
      fetchMapPoints();
    }
  }, [travelId, calendarEvents, loadingEvents]);
  
  // Synchroniser les notes avec le calendrier et la carte lors de l'initialisation
  useEffect(() => {
    const syncNotesWithComponents = async () => {
      if (!travelId || loadingTravel || !user) return;
      
      try {
        // Récupérer toutes les notes
        const q = query(
          collection(db, 'notes'),
          where('tripId', '==', travelId),
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const notesData: Note[] = querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as Note));
        
        if (notesData.length > 0) {
          // Synchroniser les notes avec le calendrier et la carte
          await integrationService.syncNotesWithCalendarAndMap(travelId, notesData);
          
          // Rafraîchir les événements du calendrier
          const updatedEvents = await calendarService.getEventsForTrip(travelId);
          setCalendarEvents(updatedEvents);
        }
      } catch (error) {
        console.error("Erreur lors de la synchronisation des notes:", error);
      }
    };
    
    syncNotesWithComponents();
  }, [travelId, loadingTravel, user]);
  
  const handleDelete = async () => {
    if (!travel || !confirm("Êtes-vous sûr de vouloir supprimer ce voyage ?")) {
      return;
    }
    
    try {
      await travelService.deleteTravel(travel.id);
      router.push('/dashboard');
    } catch (error) {
      console.error("Erreur lors de la suppression du voyage:", error);
      setError("Une erreur est survenue lors de la suppression du voyage.");
    }
  };
  
  const toggleFavorite = async () => {
    try {
      const newStatus = !isFavorite;
      
      await updateDoc(doc(db, 'travels', travelId), {
        isFavorite: newStatus
      });
      
      setIsFavorite(newStatus);
      
      toast({
        title: newStatus ? "Ajouté aux favoris" : "Retiré des favoris",
        description: newStatus 
          ? "Ce voyage a été ajouté à vos favoris." 
          : "Ce voyage a été retiré de vos favoris.",
        variant: "default",
      });
    } catch (err) {
      console.error("Erreur lors de la mise à jour du statut favori:", err);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut favori.",
        variant: "destructive",
      });
    }
  };
  
  // Rafraîchir les données du voyage
  const refreshTravelData = async () => {
    try {
      const docRef = doc(db, 'travels', travelId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const travelData = { 
          id: docSnap.id, 
          ...docSnap.data() 
        };
        setTravel(travelData);
        setIsFavorite(travelData.isFavorite || false);
        
        // Rafraîchir aussi l'image
        if (travelData.imageId) {
          const imageDoc = await getDoc(doc(db, 'images', travelData.imageId));
          if (imageDoc.exists()) {
            setImageData(imageDoc.data().base64Data);
          } else {
            setImageData(travelData.imageUrl || null);
          }
        } else {
          setImageData(travelData.imageUrl || null);
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'actualisation des données:", error);
    }
  };
  
  // Sauvegarder les notes
  const saveNotes = async () => {
    if (isSavingNotes) return;
    
    try {
      setIsSavingNotes(true);
      
      await updateDoc(doc(db, 'travels', travelId), {
        notes: notes,
        updatedAt: serverTimestamp()
      });
      
      toast({
        title: "Notes enregistrées",
        description: "Vos notes ont été enregistrées avec succès.",
        variant: "default",
      });
      
      // Fermer l'éditeur de notes si ouvert via URL
      const params = new URLSearchParams(window.location.search);
      if (params.get('editNotes') === 'true') {
        // Rediriger vers la même page sans le paramètre editNotes
        router.push(`/travel/${travelId}`);
      }
      
      // Mettre à jour les données du voyage localement
      if (travel) {
        setTravel({
          ...travel,
          notes: notes
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des notes:", error);
      
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement des notes.",
        variant: "destructive",
      });
    } finally {
      setIsSavingNotes(false);
    }
  };
  
  // Gestionnaires d'événements du calendrier
  const handleAddCalendarEvent = async (event: Omit<TravelEvent, 'id' | 'tripId'>) => {
    if (!travelId) return;
    
    try {
      const eventId = await calendarService.addEvent(travelId, event);
      
      if (eventId) {
        // Ajouter l'événement à la liste locale
        const newEvent = { id: eventId, tripId: travelId, ...event };
        setCalendarEvents(prev => [...prev, newEvent]);
        
        // Si l'événement a des coordonnées, ajouter un point sur la carte
        if (event.coordinates && mapRef.current) {
          const pointId = mapRef.current.addPoint({
            lat: event.coordinates.lat,
            lng: event.coordinates.lng,
            title: event.title,
            description: event.description || '',
            type: event.eventType || 'visit',
            color: event.color,
            day: new Date(event.start).getDate()
          });
          
          // Lier l'événement au point sur la carte
          await integrationService.linkEventToMapPoint(travelId, eventId, pointId);
        }
        
        toast({
          title: "Événement ajouté",
          description: "L'événement a été ajouté au calendrier.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'événement:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ajout de l'événement.",
        variant: "destructive",
      });
    }
  };
  
  const handleUpdateCalendarEvent = async (event: TravelEvent) => {
    try {
      const success = await calendarService.updateEvent(event);
      
      if (success) {
        // Mettre à jour l'événement dans la liste locale
        setCalendarEvents(prev => 
          prev.map(e => e.id === event.id ? event : e)
        );
        
        toast({
          title: "Événement mis à jour",
          description: "L'événement a été mis à jour avec succès.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'événement:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour de l'événement.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteCalendarEvent = async (eventId: string) => {
    try {
      const success = await calendarService.deleteEvent(eventId);
      
      if (success) {
        // Supprimer l'événement de la liste locale
        setCalendarEvents(prev => 
          prev.filter(e => e.id !== eventId)
        );
        
        toast({
          title: "Événement supprimé",
          description: "L'événement a été supprimé avec succès.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de l'événement:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression de l'événement.",
        variant: "destructive",
      });
    }
  };
  
  // Gestionnaire pour les clics sur la carte
  const handleMapClick = async (lat: number, lng: number) => {
    if (!mapRef.current) return;
    
    // Ouvrir une boîte de dialogue pour créer un nouvel événement avec ces coordonnées
    const title = prompt("Titre de l'événement:");
    if (!title) return;
    
    const type = prompt("Type d'événement (visit, transport, accommodation, food, activity, other):", "visit");
    const validTypes = ['visit', 'transport', 'accommodation', 'food', 'activity', 'other'];
    const eventType = validTypes.includes(type || '') ? type : 'visit';
    
    // Créer l'événement dans le calendrier
    const start = new Date();
    const end = new Date();
    end.setHours(end.getHours() + 1);
    
    const newEvent: Omit<TravelEvent, 'id' | 'tripId'> = {
      title,
      start,
      end,
      allDay: false,
      eventType: eventType as any,
      coordinates: { lat, lng },
      location: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`
    };
    
    await handleAddCalendarEvent(newEvent);
  };
  
  if (loading || loadingTravel) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          Retour au tableau de bord
        </Link>
      </div>
    );
  }
  
  if (!travel) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-[#f8f5ec]">
      <Navbar />
      
      <main className="pt-24 px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center mb-6">
            <Link 
              href="/dashboard" 
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Dashboard
            </Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-sm text-gray-700">Voyage</span>
          </div>
          
          {loading || loadingTravel ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : travel ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{travel.destination}</h1>
                <div className="flex space-x-2">
                  <button
                    onClick={toggleFavorite}
                    className="text-yellow-500 hover:text-yellow-600"
                  >
                    <Star className={isFavorite ? "fill-current" : ""} />
                  </button>
                  <button
                    onClick={() => router.push('/travels')}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded-md"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleDelete}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="md:col-span-2">
                  <div className="bg-white rounded-lg shadow p-6 mb-6 relative">
                    <div className="absolute top-4 right-4 flex space-x-2">
                      <button
                        onClick={() => setShowEditImage(true)}
                        className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"
                        title="Modifier l'image"
                      >
                        <FileEdit className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="h-64 bg-gray-100 mb-4 rounded-lg overflow-hidden flex items-center justify-center">
                      {imageData ? (
                        <img
                          src={imageData}
                          alt={travel.destination}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <Image className="h-12 w-12 mb-2" />
                          <p>Aucune image disponible</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mb-4">
                      <EditTripDates 
                        tripId={travelId} 
                        startDate={travel.dateDepart} 
                        endDate={travel.dateRetour}
                        onUpdate={(startDate, endDate) => {
                          if (travel) {
                            setTravel({
                              ...travel,
                              dateDepart: startDate,
                              dateRetour: endDate
                            });
                          }
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center mb-4">
                      <Users className="mr-2 h-5 w-5 text-gray-500" />
                      <span>{travel.nombreVoyageurs} {travel.nombreVoyageurs > 1 ? 'personnes' : 'personne'}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Link
                        href={`/travel/${travelId}/calendar`}
                        className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full hover:bg-blue-200"
                      >
                        <Calendar className="mr-1 h-4 w-4" />
                        Calendrier
                      </Link>
                      
                      <Link
                        href={`/travel/${travelId}/map`}
                        className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full hover:bg-green-200"
                      >
                        <MapPin className="mr-1 h-4 w-4" />
                        Carte
                      </Link>
                      
                      <Link
                        href={`/chat?travelId=${travelId}`}
                        className="flex items-center bg-purple-100 text-purple-800 px-3 py-1 rounded-full hover:bg-purple-200"
                      >
                        <MessageSquare className="mr-1 h-4 w-4" />
                        Assistant IA
                      </Link>
                      
                      <Link
                        href={`/travel/${travelId}/budget`}
                        className="flex items-center bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 h-4 w-4">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                          <path d="M12 18V6"/>
                        </svg>
                        Budget
                      </Link>
                      
                      <Link
                        href={`/travel/${travelId}/notes`}
                        className="flex items-center bg-teal-100 text-teal-800 px-3 py-1 rounded-full hover:bg-teal-200"
                      >
                        <FileText className="mr-1 h-4 w-4" />
                        Notes
                      </Link>
                      
                      <Link
                        href={`/travel/${travelId}/links`}
                        className="flex items-center bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full hover:bg-indigo-200"
                      >
                        <LinkIcon className="mr-1 h-4 w-4" />
                        Liens
                      </Link>
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-1">
                  <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4">Détails du voyage</h2>
                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="text-blue-500" size={20} />
                        <div>
                          <div className="text-sm text-gray-500">Dates</div>
                          <div className="font-medium">
                            {new Date(travel.dateDepart).toLocaleDateString('fr-FR')} - {new Date(travel.dateRetour).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="text-blue-500" size={20} />
                        <div>
                          <div className="text-sm text-gray-500">Voyageurs</div>
                          <div className="font-medium">{travel.nombreVoyageurs} {travel.nombreVoyageurs > 1 ? 'personnes' : 'personne'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {showEditImage && (
                <EditTravelImage 
                  travelId={travelId} 
                  currentImageUrl={imageData || undefined} 
                  currentLinks={travel.links || []}
                  onUpdate={refreshTravelData} 
                />
              )}
            </>
          ) : (
            <div className="bg-red-50 p-4 rounded-lg text-red-700">
              Voyage non trouvé ou vous n'avez pas les permissions pour y accéder.
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 