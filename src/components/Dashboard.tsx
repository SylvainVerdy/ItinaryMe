"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LogoutButton } from './LogoutButton';
import Link from 'next/link';

interface TravelPlan {
  id: string;
  destination: string;
  dateDepart: string;
  dateRetour: string;
  nombreVoyageurs: number;
  createdAt: Date;
}

export function Dashboard() {
  const { user } = useAuth();
  const [travelPlans, setTravelPlans] = useState<TravelPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTravelPlans = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const travelQuery = query(
          collection(db, 'travels'),
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(travelQuery);
        const travels: TravelPlan[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          travels.push({
            id: doc.id,
            destination: data.destination,
            dateDepart: data.dateDepart,
            dateRetour: data.dateRetour,
            nombreVoyageurs: data.nombreVoyageurs,
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        });
        
        // Trier par date de création (plus récent en premier)
        travels.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setTravelPlans(travels);
      } catch (error) {
        console.error("Erreur lors de la récupération des voyages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTravelPlans();
  }, [user]);

  if (!user) {
    return <div className="p-8 text-center">Veuillez vous connecter pour accéder à votre tableau de bord.</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-gray-600">Bienvenue, {user.email}</p>
        </div>
        <LogoutButton />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Informations du compte</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p>{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">ID utilisateur</p>
            <p className="text-sm">{user.uid}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Mes itinéraires de voyage</h2>
          <Link 
            href="/travel/new" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Nouveau voyage
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8">Chargement de vos voyages...</div>
        ) : travelPlans.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Vous n'avez pas encore créé d'itinéraire de voyage.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {travelPlans.map((travel) => (
              <div key={travel.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <Link href={`/travel/${travel.id}`} className="block h-full">
                  <h3 className="font-medium text-lg mb-2">{travel.destination}</h3>
                  <div className="text-sm text-gray-600">
                    <p>Du {new Date(travel.dateDepart).toLocaleDateString()} au {new Date(travel.dateRetour).toLocaleDateString()}</p>
                    <p>{travel.nombreVoyageurs} voyageur{travel.nombreVoyageurs > 1 ? 's' : ''}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 