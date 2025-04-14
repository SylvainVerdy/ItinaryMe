"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { travelService, TravelPlan } from '@/services/travelService';
import { LogoutButton } from '@/components/LogoutButton';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MapPin } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

// Interface des propriétés
interface TravelDetailPageProps {
  params: {
    id: string;
  };
}

export default function TravelDetailPage({ params }: TravelDetailPageProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const travelId = params.id as string;
  const { toast } = useToast();
  
  const [travel, setTravel] = useState<TravelPlan | null>(null);
  const [loadingTravel, setLoadingTravel] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    
    const fetchTravelDetails = async () => {
      if (!travelId || !user) return;
      
      try {
        setLoadingTravel(true);
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
        setIsFavorite(travelData.isFavorite || false);
      } catch (error) {
        console.error("Erreur lors de la récupération du voyage:", error);
        setError("Une erreur est survenue lors du chargement du voyage.");
      } finally {
        setLoadingTravel(false);
      }
    };
    
    fetchTravelDetails();
  }, [travelId, user, loading, router]);
  
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
          
          <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] overflow-hidden mb-8">
            <div className="h-48 md:h-64 bg-gradient-to-r from-blue-500 to-purple-600 relative">
              {travel.imageUrl ? (
                <img 
                  src={travel.imageUrl} 
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
                  <button 
                    onClick={toggleFavorite}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <Star 
                      size={20} 
                      className={`${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-white'}`} 
                    />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-semibold mb-4">{travel.destination}</h2>
              <div className="flex space-x-2">
                <Link
                  href={`/travel/${travel.id}/edit`}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Modifier
                </Link>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                >
                  Supprimer
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Informations générales</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">Destination</p>
                    <p>{travel.destination}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Dates du voyage</p>
                    <p>
                      Du {new Date(travel.dateDepart).toLocaleDateString()} au {new Date(travel.dateRetour).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Voyageurs</p>
                    <p>{travel.nombreVoyageurs} personne{travel.nombreVoyageurs > 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Notes</h3>
                <p className="bg-gray-50 p-3 rounded min-h-[100px]">
                  {travel.notes || "Aucune note pour ce voyage."}
                </p>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="font-medium mb-2">Activités prévues</h3>
              {travel.activities && travel.activities.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {travel.activities.map((activity, index) => (
                    <li key={index}>{activity}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">Aucune activité planifiée pour ce voyage.</p>
              )}
            </div>
          </div>
          
          <div className="flex justify-center mt-8">
            <Link 
              href="/chat"
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Discuter avec l'assistant pour ce voyage
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 