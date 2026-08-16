"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { travelService, TravelPlan } from '@/services/travelService';
import Link from 'next/link';
import {
  Star, ImageIcon, Calendar, Users, LinkIcon, FileText,
  CheckCircle, Loader2, MapPin, ListChecks, MessageSquare,
  ChevronRight, Pencil, Trash2, AlertCircle, ExternalLink, CalendarClock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageLoader, PrimaryButton } from '@/components/layout/PageShell';
import EditTravelImage from './edit-image';
import ItineraryView from '@/components/itinerary/ItineraryView';
import TripPlannerChat from '@/components/chat/TripPlannerChat';
import { cn } from '@/lib/utils';

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
    return <PageLoader label="Chargement du voyage…" />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4 pt-16">
          <div className="w-full max-w-md rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
            <h1 className="font-display text-xl font-bold text-slate-900">{error}</h1>
            <PrimaryButton href="/dashboard" className="mt-6">
              Retour au tableau de bord
            </PrimaryButton>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!travel) return null;

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'info', label: 'Infos', icon: MapPin },
    { key: 'itinerary', label: 'Itinéraire', icon: ListChecks },
    { key: 'notes', label: 'Notes', icon: FileText },
    { key: 'assistant', label: 'Assistant', icon: MessageSquare },
  ];

  const start = new Date(travel.dateDepart);
  const end = new Date(travel.dateRetour);
  const nights =
    Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
      ? null
      : Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1">
        {/* En-tête immersif */}
        <section className="relative isolate overflow-hidden bg-brand-ink pt-16">
          <div className="absolute inset-0 -z-10">
            {imageData ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={imageData} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-brand-teal via-brand-deep to-brand-coral" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-brand-ink via-brand-ink/70 to-brand-ink/40" />
          </div>

          <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 lg:px-8">
            <nav className="mb-6 flex flex-wrap items-center gap-1 text-sm text-slate-400">
              <Link href="/dashboard" className="transition-colors hover:text-white">
                Tableau de bord
              </Link>
              <ChevronRight size={14} className="text-slate-600" />
              <span className="text-slate-200">{travel.destination}</span>
            </nav>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                  {travel.destination}
                </h1>

                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
                  <Meta icon={Calendar} label="Dates">
                    {start.toLocaleDateString('fr-FR')} — {end.toLocaleDateString('fr-FR')}
                  </Meta>
                  {nights !== null && (
                    <Meta icon={CalendarClock} label="Durée">
                      {nights} nuit{nights > 1 ? 's' : ''}
                    </Meta>
                  )}
                  <Meta icon={Users} label="Voyageurs">
                    {travel.nombreVoyageurs} {travel.nombreVoyageurs > 1 ? 'personnes' : 'personne'}
                  </Meta>
                </div>
              </div>

              <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                <IconAction
                  onClick={toggleFavorite}
                  title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  <Star
                    size={18}
                    className={isFavorite ? 'fill-amber-400 text-amber-400' : 'text-white'}
                  />
                </IconAction>
                <IconAction
                  onClick={() => setShowEditImage((open) => !open)}
                  title="Modifier l'image et les liens"
                >
                  <ImageIcon size={18} className="text-white" />
                </IconAction>
                <Link
                  href={`/travel/${travelId}/edit`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                >
                  <Pencil size={15} />
                  Modifier
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
          {/* Onglets */}
          <div className="sticky top-16 z-30 -mt-px overflow-x-auto border-b border-slate-200 bg-slate-50/95 backdrop-blur">
            <div className="flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex flex-shrink-0 items-center gap-2 border-b-2 px-4 py-4 text-sm font-semibold transition-colors',
                    activeTab === tab.key
                      ? 'border-brand-teal text-brand-teal'
                      : 'border-transparent text-slate-500 hover:text-slate-900',
                  )}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-8">
            {/* ONGLET INFO */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                    <LinkIcon size={17} className="text-brand-teal" />
                    Liens utiles
                  </h2>

                  {travel.links && travel.links.length > 0 ? (
                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {travel.links.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-brand-teal hover:bg-slate-50"
                        >
                          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50 text-brand-teal">
                            <LinkIcon size={15} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900">
                              {link.title}
                            </span>
                            <span className="block truncate text-xs text-slate-400">{link.url}</span>
                          </span>
                          <ExternalLink
                            size={15}
                            className="flex-shrink-0 text-slate-300 transition-colors group-hover:text-brand-teal"
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      Aucun lien pour l'instant. Utilisez le bouton image en haut de page pour en
                      ajouter.
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:border-red-500 hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 size={15} />
                    Supprimer ce voyage
                  </button>
                </div>
              </div>
            )}

            {/* ONGLET ITINÉRAIRE */}
            {activeTab === 'itinerary' && (
              <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
                <ItineraryView
                  tripId={travelId}
                  tripStart={travel.dateDepart}
                  tripEnd={travel.dateRetour}
                />
              </div>
            )}

            {/* ONGLET ASSISTANT */}
            {activeTab === 'assistant' && (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <TripPlannerChat
                  tripContext={{
                    tripId: travelId,
                    destination: travel.destination,
                    startDate: travel.dateDepart,
                    endDate: travel.dateRetour,
                    travelers: travel.nombreVoyageurs,
                  }}
                />
              </div>
            )}

            {/* ONGLET NOTES */}
            {activeTab === 'notes' && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                  <FileText size={17} className="text-brand-teal" />
                  Notes de voyage
                </h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-5 min-h-[280px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[15px] text-slate-800 outline-none transition focus:border-brand-teal focus:bg-white focus:ring-4 focus:ring-brand-teal/10"
                  placeholder="Adresses à tester, numéros utiles, idées de sorties…"
                />
                <div className="mt-4 flex justify-end">
                  <PrimaryButton onClick={saveNotes} disabled={isSavingNotes}>
                    {isSavingNotes ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <CheckCircle size={15} />
                    )}
                    Enregistrer
                  </PrimaryButton>
                </div>
              </div>
            )}
          </div>

          {showEditImage && (
            <div className="mt-6">
              <EditTravelImage
                travelId={travelId}
                currentImageUrl={imageData || undefined}
                currentLinks={travel.links || []}
                onUpdate={refreshTravelData}
              />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-brand-lagoon backdrop-blur">
        <Icon size={16} />
      </span>
      <span>
        <span className="block text-[11px] uppercase tracking-wider text-slate-400">{label}</span>
        <span className="block text-sm font-semibold text-white">{children}</span>
      </span>
    </div>
  );
}

function IconAction({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur transition hover:bg-white/20"
    >
      {children}
    </button>
  );
}
