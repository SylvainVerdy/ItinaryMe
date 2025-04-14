"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ArrowLeft, Calendar, MapPin, Users, Clock, Bookmark, Star } from 'lucide-react';
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
  
  return (
    <div className="min-h-screen bg-[#f8f5ec]">
      <Navbar />
      
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/dashboard"
              className="p-1.5 rounded-md hover:bg-[#f0ece3] transition-colors"
            >
              <ArrowLeft size={18} className="text-gray-600" />
            </Link>
            <h1 className="text-2xl font-medium text-gray-800">Mes voyages favoris</h1>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-lg text-red-700">
              {error}
            </div>
          ) : (
            <>
              {favorites.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-8 text-center">
                  <Star size={48} className="mx-auto text-gray-300 mb-4" />
                  <h2 className="text-xl font-medium text-gray-800 mb-2">Aucun voyage favori</h2>
                  <p className="text-gray-600 mb-6">
                    Vous n'avez pas encore ajouté de voyage à vos favoris. Marquez vos voyages préférés comme favoris pour y accéder rapidement.
                  </p>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-colors"
                  >
                    <span>Voir tous mes voyages</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favorites.map((favorite) => (
                    <div 
                      key={favorite.id} 
                      className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] overflow-hidden group relative"
                    >
                      <div className="absolute top-3 right-3 z-10">
                        <button
                          onClick={() => toggleFavorite(favorite.id)}
                          className="p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white transition-colors"
                        >
                          <Star size={16} className="text-yellow-500 fill-yellow-500" />
                        </button>
                      </div>
                      
                      <Link href={`/travel/${favorite.id}`}>
                        <div className="h-40 bg-gradient-to-r from-blue-500 to-purple-600 relative">
                          {favorite.imageUrl ? (
                            <img 
                              src={favorite.imageUrl} 
                              alt={favorite.destination} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white">
                              <MapPin size={32} />
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                            <h2 className="text-lg font-medium text-white">
                              {favorite.destination}
                            </h2>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                            <Calendar size={14} className="text-blue-500" />
                            <span>
                              {formatDateRange(favorite.startDate, favorite.endDate)}
                              {' '}
                              ({calculateDuration(favorite.startDate, favorite.endDate)} jours)
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                            <Users size={14} className="text-blue-500" />
                            <span>{favorite.numTravelers} voyageur{favorite.numTravelers > 1 ? 's' : ''}</span>
                          </div>
                          
                          {favorite.notes && (
                            <p className="text-sm text-gray-700 border-t border-[#e6e0d4] pt-3 line-clamp-2">
                              {favorite.notes}
                            </p>
                          )}
                          
                          <div className="mt-4 text-right">
                            <span className="text-sm text-blue-600 group-hover:text-blue-700 transition-colors">
                              Voir les détails →
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 