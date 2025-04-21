"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { travelService } from '@/services/travelService';
import TravelPriceAnalysis from '@/components/TravelPriceAnalysis';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function BudgetAnalysisPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const travelId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [travel, setTravel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchTravelData = async () => {
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
      } catch (error) {
        console.error("Erreur lors du chargement:", error);
        setError("Une erreur est survenue lors du chargement des données.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTravelData();
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
          <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6">
            <TravelPriceAnalysis travelId={travelId} />
            
            <div className="mt-8 text-sm text-gray-500">
              <p className="mb-2">Les estimations de prix sont basées sur les données publiquement disponibles et peuvent varier en fonction de nombreux facteurs.</p>
              <p>Pour des prix plus précis, nous vous recommandons de consulter directement les prestataires de services pour votre destination et vos dates de voyage.</p>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
} 