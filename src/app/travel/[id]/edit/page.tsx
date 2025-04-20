"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { travelService, TravelPlanInput } from '@/services/travelService';
import { TravelForm } from '@/components/TravelForm';
import Link from 'next/link';

export default function EditTravelPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const travelId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [travelData, setTravelData] = useState<TravelPlanInput | null>(null);
  const [loadingTravel, setLoadingTravel] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
        const travel = await travelService.getTravelById(travelId);
        
        if (!travel) {
          setError("Ce voyage n'existe pas.");
          return;
        }
        
        if (travel.userId !== user?.uid) {
          setError("Vous n'avez pas accès à ce voyage.");
          return;
        }
        
        // Extraire les données nécessaires pour le formulaire
        const formData: TravelPlanInput = {
          destination: travel.destination,
          dateDepart: travel.dateDepart,
          dateRetour: travel.dateRetour,
          nombreVoyageurs: travel.nombreVoyageurs,
          notes: travel.notes,
          activities: travel.activities
        };
        
        setTravelData(formData);
      } catch (error) {
        console.error("Erreur lors de la récupération du voyage:", error);
        setError("Une erreur est survenue lors du chargement du voyage.");
      } finally {
        setLoadingTravel(false);
      }
    };
    
    fetchTravelDetails();
  }, [travelId, user, loading, router]);
  
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
  
  if (!travelData) {
    return null;
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-4 px-6">
        <h1 className="text-2xl font-bold">Modifier votre voyage</h1>
        <Link 
          href={`/travel/${travelId}`} 
          className="text-blue-600 hover:underline"
        >
          Retour aux détails
        </Link>
      </div>
      <TravelForm 
        initialData={travelData} 
        travelId={travelId} 
        isEditing 
      />
    </div>
  );
} 