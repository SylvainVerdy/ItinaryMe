"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import TravelSearch from '@/components/TravelSearch';
import { TravelPlan } from '@/services/travelService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft } from 'lucide-react';

export default function TravelSearchPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [travel, setTravel] = useState<TravelPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const travelId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (travelId) {
      fetchTravelDetails();
    }
  }, [travelId]);

  const fetchTravelDetails = async () => {
    try {
      setLoading(true);
      
      if (!travelId) {
        setError("ID de voyage invalide");
        return;
      }
      
      const travelDoc = await getDoc(doc(db, 'travels', travelId));
      
      if (!travelDoc.exists()) {
        setError("Ce voyage n'existe pas.");
        return;
      }
      
      const travelData = travelDoc.data() as TravelPlan;
      setTravel({ ...travelData, id: travelDoc.id });
    } catch (error) {
      console.error("Erreur lors de la récupération des détails du voyage:", error);
      setError("Une erreur est survenue lors de la récupération des détails du voyage.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
            <Link 
              href={`/travel/${travelId}`} 
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {travel.destination}
            </Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-sm text-gray-700">Recherche</span>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Recherche pour {travel.destination}</h1>
            <Link
              href={`/travel/${travelId}`}
              className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded-md"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Retour
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <TravelSearch travelId={travelId} destination={travel.destination} />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 