"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { travelService, TravelPlan } from '@/services/travelService';
import { LogoutButton } from '@/components/LogoutButton';
import Link from 'next/link';

export default function TravelDetailsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const travelId = params.id as string;
  
  const [travel, setTravel] = useState<TravelPlan | null>(null);
  const [loadingTravel, setLoadingTravel] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Détails du voyage</h1>
          <p className="text-gray-600">
            Informations sur votre voyage à {travel.destination}
          </p>
        </div>
        <div className="flex space-x-4">
          <Link 
            href="/dashboard" 
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Retour
          </Link>
          <LogoutButton />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
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
  );
} 