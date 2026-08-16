"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock, MapPin, Star, Users } from 'lucide-react';
import {
  PageShell, PageHero, PageLoader, EmptyState, PrimaryButton,
} from '@/components/layout/PageShell';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';

interface TravelItem {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  numTravelers: number;
  createdAt: string;
  isFavorite: boolean;
  imageUrl?: string;
  notes?: string;
}

export default function FavoritesPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<TravelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        const q = query(
          collection(db, 'travels'),
          where('userId', '==', user.uid),
          where('isFavorite', '==', true)
        );
        
        const querySnapshot = await getDocs(q);
        const favoritesData: TravelItem[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          favoritesData.push({
            id: doc.id,
            destination: data.destination,
            startDate: data.dateDepart || data.startDate,
            endDate: data.dateRetour || data.endDate,
            numTravelers: data.nombreVoyageurs || data.numPeople || 1,
            createdAt: data.createdAt,
            isFavorite: true,
            imageUrl: data.imageUrl,
            notes: data.notes
          });
        });
        
        setFavorites(favoritesData);
      } catch (err) {
        console.error("Erreur lors du chargement des favoris:", err);
        setError("Impossible de charger vos voyages favoris");
      } finally {
        setLoading(false);
      }
    };
    
    fetchFavorites();
  }, [user]);
  
  const toggleFavorite = async (id: string) => {
    try {
      await updateDoc(doc(db, 'travels', id), {
        isFavorite: false
      });
      
      setFavorites(prev => prev.filter(fav => fav.id !== id));
      
      toast({
        title: "Retiré des favoris",
        description: "Ce voyage a été retiré de vos favoris.",
        variant: "default",
      });
    } catch (err) {
      console.error("Erreur lors de la mise à jour du favori:", err);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut favori.",
        variant: "destructive",
      });
    }
  };
  
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return `${start.toLocaleDateString('fr-FR')} - ${end.toLocaleDateString('fr-FR')}`;
  };
  
  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };
  
  if (loading) {
    return <PageLoader label="Chargement de vos favoris…" />;
  }

  return (
    <PageShell
      hero={
        <PageHero
          compact
          breadcrumb={[{ label: 'Tableau de bord', href: '/dashboard' }, { label: 'Favoris' }]}
          eyebrow="Favoris"
          title="Vos voyages favoris"
          subtitle="Les itinéraires que vous avez épinglés, prêts à être repris."
        />
      }
    >
      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
          {error}
        </div>
      ) : favorites.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Aucun voyage favori"
          description="Ouvrez un voyage et appuyez sur l'étoile pour le retrouver ici."
          action={<PrimaryButton href="/dashboard">Voir mes voyages</PrimaryButton>}
        />
      ) : (
        <>
          <p className="mb-6 text-sm text-slate-500">
            {favorites.length} voyage{favorites.length > 1 ? 's' : ''} en favori
            {favorites.length > 1 ? 's' : ''}
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((travel) => (
              <article
                key={travel.id}
                className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lift"
              >
                <div className="relative h-32 bg-gradient-to-br from-brand-teal to-brand-lagoon">
                  {travel.imageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={travel.imageUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />

                  <h2 className="absolute bottom-3 left-5 right-14 flex items-center gap-1.5 truncate font-display text-lg font-bold text-white">
                    <MapPin size={15} className="flex-shrink-0" />
                    <span className="truncate">{travel.destination}</span>
                  </h2>

                  <button
                    onClick={() => toggleFavorite(travel.id)}
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur transition hover:bg-white/30"
                    title="Retirer des favoris"
                    aria-label="Retirer des favoris"
                  >
                    <Star size={16} className="fill-amber-400 text-amber-400" />
                  </button>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="space-y-2 text-sm text-slate-500">
                    <p className="flex items-center gap-2">
                      <CalendarDays size={14} className="flex-shrink-0 text-slate-400" />
                      <span className="truncate">
                        {formatDateRange(travel.startDate, travel.endDate)}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock size={14} className="flex-shrink-0 text-slate-400" />
                      {calculateDuration(travel.startDate, travel.endDate)} jour
                      {calculateDuration(travel.startDate, travel.endDate) > 1 ? 's' : ''}
                    </p>
                    <p className="flex items-center gap-2">
                      <Users size={14} className="flex-shrink-0 text-slate-400" />
                      {travel.numTravelers} voyageur{travel.numTravelers > 1 ? 's' : ''}
                    </p>
                  </div>

                  <Link
                    href={`/travel/${travel.id}`}
                    className="mt-5 flex items-center gap-1.5 border-t border-slate-100 pt-4 text-sm font-semibold text-brand-teal"
                  >
                    Voir l'itinéraire
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
