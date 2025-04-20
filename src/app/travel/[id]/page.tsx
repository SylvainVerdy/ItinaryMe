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
              <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] overflow-hidden mb-8">
                <div className="h-48 md:h-64 bg-gradient-to-r from-blue-500 to-purple-600 relative">
                  {imageData ? (
                    <img 
                      src={imageData} 
                      alt={travel.destination} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <MapPin size={48} />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <div className="flex items-center justify-between">
                      <h1 className="text-2xl md:text-3xl font-medium text-white">
                        {travel.destination}
                      </h1>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowEditImage(!showEditImage)}
                          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                          title="Modifier l'image et les liens"
                        >
                          <Image size={20} className="text-white" />
                        </button>
                        <button 
                          onClick={toggleFavorite}
                          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                          title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                        >
                          <Star 
                            size={20} 
                            className={`${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-white'}`} 
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex flex-wrap gap-6 mb-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="text-blue-500" size={20} />
                      <div>
                        <div className="text-sm text-gray-500">Dates</div>
                        <div className="font-medium">
                          {new Date(travel.dateDepart).toLocaleDateString('fr-FR')} - {new Date(travel.dateRetour).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      
                      <div className="ml-2">
                        <EditTripDates 
                          tripId={travel.id}
                          currentStartDate={travel.dateDepart || travel.startDate}
                          currentEndDate={travel.dateRetour || travel.endDate}
                          onUpdate={() => refreshTravelData()}
                        />
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
                  
                  {/* Bouton de suppression du voyage */}
                  <div className="flex justify-end mb-6">
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                      <span>Supprimer ce voyage</span>
                    </button>
                  </div>
                  
                  {travel.links && travel.links.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                        <LinkIcon size={18} className="text-blue-500" />
                        <span>Liens utiles</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {travel.links.map(link => (
                          <a 
                            key={link.id} 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 border border-[#e6e0d4] rounded-lg hover:bg-[#f8f5ec] transition-colors"
                          >
                            <LinkIcon size={16} className="text-blue-500 flex-shrink-0" />
                            <div className="overflow-hidden">
                              <div className="font-medium text-sm">{link.title}</div>
                              <div className="text-xs text-gray-500 truncate">{link.url}</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Éditeur de notes */}
                  {showEditNotes && (
                    <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6 mb-8">
                      <h3 className="text-xl font-medium text-gray-800 mb-6 flex items-center gap-2">
                        <FileText size={20} className="text-blue-500" />
                        <span>Notes de voyage pour {travel.destination}</span>
                      </h3>
                      
                      <p className="text-sm text-gray-600 mb-4">
                        Ajoutez vos notes, idées et réflexions sur ce voyage. Ces notes seront également disponibles dans la section Documents.
                      </p>
                      
                      <div className="border border-[#e6e0d4] rounded-lg overflow-hidden">
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full p-4 min-h-[300px] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                          placeholder="Écrivez vos notes ici..."
                        />
                      </div>
                      
                      <div className="mt-4 flex justify-between">
                        <button
                          onClick={() => {
                            const params = new URLSearchParams(window.location.search);
                            if (params.get('editNotes') === 'true') {
                              router.push(`/travel/${travelId}`);
                            } else {
                              setShowEditNotes(false);
                            }
                          }}
                          className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                        >
                          Annuler
                        </button>
                        
                        <button 
                          onClick={saveNotes}
                          disabled={isSavingNotes}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                          {isSavingNotes ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              <span>Enregistrement...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} />
                              <span>Enregistrer les notes</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Affichage des notes si elles existent et que l'éditeur n'est pas ouvert */}
                  {!showEditNotes && (
                    <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6 mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-medium text-gray-800 flex items-center gap-2">
                          <FileText size={20} className="text-blue-500" />
                          <span>Notes de voyage</span>
                        </h3>
                        
                        <button
                          onClick={() => setShowEditNotes(true)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center gap-1"
                        >
                          <FileEdit size={14} />
                          <span>Modifier</span>
                        </button>
                      </div>
                      
                      <div className="border-t border-[#e6e0d4] pt-4">
                        <div className="prose max-w-none">
                          <p className="whitespace-pre-wrap">{travel.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Affichage des notes stockées dans la collection "notes" */}
                  <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-medium text-gray-800 flex items-center gap-2">
                        <MessageSquare size={20} className="text-blue-500" />
                        <span>Notes liées au voyage</span>
                      </h3>
                    </div>
                    
                    <TravelNotes 
                      tripId={travelId} 
                      onAddNote={(content) => {
                        toast({
                          title: "Note ajoutée",
                          description: "Votre note a été ajoutée avec succès.",
                          variant: "default",
                        });
                      }}
                      onGenerateNote={(content) => {
                        toast({
                          title: "Note générée",
                          description: "Une note a été générée par l'IA.",
                          variant: "default",
                        });
                      }}
                    />
                  </div>

                  {/* Après le composant TravelNotes, ajouter le calendrier */}
                  <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-medium text-gray-800 flex items-center gap-2">
                        <Calendar size={20} className="text-blue-500" />
                        <span>Calendrier du voyage</span>
                      </h3>
                    </div>
                    
                    <ClientOnly>
                      <TravelCalendar
                        startDate={travel.dateDepart}
                        endDate={travel.dateRetour}
                        events={calendarEvents}
                        onEventAdd={handleAddCalendarEvent}
                        onEventUpdate={handleUpdateCalendarEvent}
                        onEventDelete={handleDeleteCalendarEvent}
                      />
                    </ClientOnly>
                  </div>

                  {/* Affichage de la carte d'itinéraire */}
                  <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-medium text-gray-800 flex items-center gap-2">
                        <MapPin size={20} className="text-blue-500" />
                        <span>Carte d'itinéraire</span>
                      </h3>
                      
                      {/* Bouton temporaire pour ajouter un événement test */}
                      <button 
                        onClick={async () => {
                          if (!travelId) return;
                          
                          // Créer un événement test avec des coordonnées
                          const testEvent: Omit<TravelEvent, 'id' | 'tripId'> = {
                            title: "Événement test " + new Date().toLocaleTimeString(),
                            description: "Cet événement a été créé pour tester la synchronisation",
                            start: new Date(),
                            end: new Date(new Date().getTime() + 2 * 60 * 60 * 1000), // +2 heures
                            allDay: false,
                            coordinates: {
                              lat: 48.856614,
                              lng: 2.352222
                            },
                            location: "Paris, France",
                            eventType: "visit",
                            color: "#FF5252"
                          };
                          
                          try {
                            // Ajouter l'événement test
                            await handleAddCalendarEvent(testEvent);
                            
                            toast({
                              title: "Événement test créé",
                              description: "Un événement test a été ajouté. Cliquez sur 'Sync Planning' pour le voir sur la carte.",
                              variant: "default",
                            });
                          } catch (error) {
                            console.error("Erreur lors de la création de l'événement test:", error);
                          }
                        }}
                        className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium flex items-center gap-1"
                      >
                        Ajouter événement test
                      </button>
                    </div>
                    
                    <ClientOnly>
                      <ItineraryMap 
                        ref={mapRef}
                        points={mapPoints}
                        startDate={travel.dateDepart}
                        endDate={travel.dateRetour}
                        height="500px"
                        onMapClick={handleMapClick}
                        planningEvents={calendarEvents.map(event => ({
                          ...event,
                          start: event.start instanceof Date ? event.start : new Date(event.start),
                          end: event.end instanceof Date ? event.end : new Date(event.end)
                        }))}
                        syncWithPlanning={true}
                        showOnlyCalendarEvents={true}
                        onEventDelete={handleDeleteCalendarEvent}
                      />
                    </ClientOnly>
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