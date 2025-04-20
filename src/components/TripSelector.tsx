'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Trip } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Users, PlusCircle } from 'lucide-react';

interface TripSelectorProps {
  onSelectTrip: (trip: Trip | null) => void;
  selectedTripId?: string | null;
}

export const TripSelector = ({ onSelectTrip, selectedTripId }: TripSelectorProps) => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrips = async () => {
      if (!user) {
        setTrips([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("TripSelector: Chargement des voyages pour l'utilisateur", user.uid);
        
        const tripQuery = query(
          collection(db, 'travels'),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(tripQuery);
        
        const tripData: Trip[] = [];
        querySnapshot.forEach(doc => {
          const data = doc.data();
          tripData.push({
            id: doc.id,
            userId: data.userId,
            destination: data.destination,
            startDate: data.startDate || data.dateDepart,
            endDate: data.endDate || data.dateRetour,
            numPeople: data.numPeople || data.nombreVoyageurs,
            notes: data.notes,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            status: data.status || 'pending'
          });
        });
        
        // Trier par date de création (plus récent d'abord)
        tripData.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        
        console.log(`TripSelector: ${tripData.length} voyages trouvés pour l'utilisateur ${user.uid}`);
        setTrips(tripData);
        setError(null);
      } catch (err) {
        console.error("Erreur lors de la récupération des voyages:", err);
        setError("Impossible de charger vos voyages");
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [user]);

  // Formatage de date pour l'affichage
  const formatDate = (dateString: string | Date | undefined | null) => {
    if (!dateString) {
      return 'Date non définie';
    }
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return <div className="text-center py-4">Chargement de vos voyages...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>;
  }

  if (trips.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="mb-4">Vous n'avez pas encore de voyages enregistrés.</p>
        <Button onClick={() => onSelectTrip(null)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Créer un voyage
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      <h3 className="text-lg font-semibold mb-2">Sélectionnez un voyage</h3>
      
      <div className="grid grid-cols-1 gap-3">
        {trips.map(trip => (
          <Card 
            key={trip.id} 
            className={`cursor-pointer transition-all hover:border-primary ${
              selectedTripId === trip.id ? 'border-2 border-primary' : ''
            }`}
            onClick={() => onSelectTrip(trip)}
          >
            <CardContent className="p-4">
              <div className="flex flex-col">
                <div className="font-medium text-lg">{trip.destination}</div>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>
                    {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                  </span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Users className="h-4 w-4 mr-1" />
                  <span>
                    {trip.numPeople} {trip.numPeople > 1 ? 'voyageurs' : 'voyageur'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Button variant="outline" className="w-full" onClick={() => onSelectTrip(null)}>
        <PlusCircle className="h-4 w-4 mr-2" />
        Créer un nouveau voyage
      </Button>
    </div>
  );
}; 