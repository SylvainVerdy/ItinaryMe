"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { travelService, TravelPlan } from '@/services/travelService';
import Link from 'next/link';
import {
  Star, Image, Calendar, Users, LinkIcon, FileText,
  CheckCircle, Loader2, MapPin, ListChecks, MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import EditTravelImage from './edit-image';
import ItineraryView from '@/components/itinerary/ItineraryView';
import TripPlannerChat from '@/components/chat/TripPlannerChat';

type Tab = 'info' | 'itinerary' | 'notes' | 'assistant';

export default function TravelDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const travelId = params.id as string;
  const { toast } = useToast();

  const [travel, setTravel] = useState<TravelPlan | null>(null);
  const [loadingTravel, setLoadingTravel] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showEditImage, setShowEditImage] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('editNotes') === 'true') setActiveTab('notes');
  }, []);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }

    const fetchTravelDetails = async () => {
      if (!travelId || !user) return;
      try {
        setLoadingTravel(true);
        const travelData = await travelService.getTravelById(travelId);
        if (!travelData) { setError("Ce voyage n'existe pas."); return; }
        if (travelData.userId !== user.uid) { setError("Vous n'avez pas accès à ce voyage."); return; }

        setTravel(travelData);
        setIsFavorite(travelData.isFavorite || false);
        setNotes(travelData.notes || '');

        try {
          if (travelData.imageId) {
            const imageDoc = await getDoc(doc(db, 'images', travelData.imageId));
            setImageData(imageDoc.exists() ? imageDoc.data().base64Data : (travelData.imageUrl || null));
          } else {
            setImageData(travelData.imageUrl || null);
          }
        } catch {
          setImageData(travelData.imageUrl || null);
        }
      } catch {
        setError("Une erreur est survenue lors du chargement du voyage.");
      } finally {
        setLoadingTravel(false);
      }
    };

    fetchTravelDetails();
  }, [travelId, user, loading, router]);

  const handleDelete = async () => {
    if (!travel || !confirm("Êtes-vous sûr de vouloir supprimer ce voyage ?")) return;
    try {
      await travelService.deleteTravel(travel.id);
      router.push('/dashboard');
    } catch {
      setError("Une erreur est survenue lors de la suppression du voyage.");
    }
  };

  const toggleFavorite = async () => {
    try {
      const newStatus = !isFavorite;
      await updateDoc(doc(db, 'travels', travelId), { isFavorite: newStatus });
      setIsFavorite(newStatus);
      toast({
        title: newStatus ? "Ajouté aux favoris" : "Retiré des favoris",
        description: newStatus ? "Ce voyage a été ajouté à vos favoris." : "Ce voyage a été retiré de vos favoris.",
      });
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut favori.", variant: "destructive" });
    }
  };

  const refreshTravelData = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'travels', travelId));
      if (!docSnap.exists()) return;
      const data = { id: docSnap.id, ...docSnap.data() } as TravelPlan;
      setTravel(data);
      setIsFavorite(data.isFavorite || false);
      if (data.imageId) {
        const imageDoc = await getDoc(doc(db, 'images', data.imageId));
        setImageData(imageDoc.exists() ? imageDoc.data().base64Data : (data.imageUrl || null));
      } else {
        setImageData(data.imageUrl || null);
      }
    } catch { /* silent */ }
  };

  const saveNotes = async () => {
    if (isSavingNotes) return;
    try {
      setIsSavingNotes(true);
      await updateDoc(doc(db, 'travels', travelId), { notes, updatedAt: serverTimestamp() });
      toast({ title: "Notes enregistrées", description: "Vos notes ont été enregistrées avec succès." });
      if (travel) setTravel({ ...travel, notes });
    } catch {
      toast({ title: "Erreur", description: "Une erreur est survenue lors de l'enregistrement.", variant: "destructive" });
    } finally {
      setIsSavingNotes(false);
    }
  };

  if (loading || loadingTravel) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
        <Link href="/dashboard" className="text-blue-600 hover:underline">Retour au tableau de bord</Link>
      </div>
    );
  }

  if (!travel) return null;

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'info', label: 'Infos', icon: <MapPin size={15} /> },
    { key: 'itinerary', label: 'Itinéraire', icon: <ListChecks size={15} /> },
    { key: 'notes', label: 'Notes', icon: <FileText size={15} /> },
    { key: 'assistant', label: 'Assistant', icon: <MessageSquare size={15} /> },
  ];

  return (
    <div className="min-h-screen bg-[#f8f5ec]">
      <Navbar />

      <main className="pt-24 px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center mb-6">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Dashboard</Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-sm text-gray-700">{travel.destination}</span>
          </div>

          {/* Hero card */}
          <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] overflow-hidden mb-6">
            <div className="h-48 md:h-64 bg-gradient-to-r from-blue-500 to-purple-600 relative">
              {imageData ? (
                <img src={imageData} alt={travel.destination} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <MapPin size={48} />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl md:text-3xl font-medium text-white">{travel.destination}</h1>
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
                      <Star size={20} className={isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-white'} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Méta voyage */}
            <div className="px-6 py-4 flex flex-wrap gap-6 border-b border-[#e6e0d4]">
              <div className="flex items-center gap-2">
                <Calendar className="text-blue-500" size={18} />
                <div>
                  <div className="text-xs text-gray-500">Dates</div>
                  <div className="text-sm font-medium">
                    {new Date(travel.dateDepart).toLocaleDateString('fr-FR')} — {new Date(travel.dateRetour).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="text-blue-500" size={18} />
                <div>
                  <div className="text-xs text-gray-500">Voyageurs</div>
                  <div className="text-sm font-medium">{travel.nombreVoyageurs} {travel.nombreVoyageurs > 1 ? 'personnes' : 'personne'}</div>
                </div>
              </div>
            </div>

            {/* Onglets */}
            <div className="flex border-b border-[#e6e0d4] px-2">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contenu onglets */}
            <div className="p-6">
              {/* ONGLET INFO */}
              {activeTab === 'info' && (
                <div className="space-y-6">
                  {travel.links && travel.links.length > 0 && (
                    <div>
                      <h3 className="text-base font-medium mb-3 flex items-center gap-2">
                        <LinkIcon size={16} className="text-blue-500" />
                        Liens utiles
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {travel.links.map((link) => (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 border border-[#e6e0d4] rounded-lg hover:bg-[#f8f5ec] transition-colors"
                          >
                            <LinkIcon size={15} className="text-blue-500 flex-shrink-0" />
                            <div className="overflow-hidden">
                              <div className="font-medium text-sm">{link.title}</div>
                              <div className="text-xs text-gray-500 truncate">{link.url}</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suppression */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                      Supprimer ce voyage
                    </button>
                  </div>
                </div>
              )}

              {/* ONGLET ITINÉRAIRE */}
              {activeTab === 'itinerary' && (
                <ItineraryView
                  tripId={travelId}
                  tripStart={travel.dateDepart}
                  tripEnd={travel.dateRetour}
                />
              )}

              {/* ONGLET ASSISTANT */}
              {activeTab === 'assistant' && (
                <TripPlannerChat
                  tripContext={{
                    tripId: travelId,
                    destination: travel.destination,
                    startDate: travel.dateDepart,
                    endDate: travel.dateRetour,
                    travelers: travel.nombreVoyageurs,
                  }}
                />
              )}

              {/* ONGLET NOTES */}
              {activeTab === 'notes' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-medium flex items-center gap-2">
                      <FileText size={16} className="text-blue-500" />
                      Notes de voyage
                    </h3>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-4 min-h-[280px] border border-[#e6e0d4] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y text-sm"
                    placeholder="Écrivez vos notes ici..."
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={saveNotes}
                      disabled={isSavingNotes}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-60"
                    >
                      {isSavingNotes ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      Enregistrer
                    </button>
                  </div>
                </div>
              )}
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
