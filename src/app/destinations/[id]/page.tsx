"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LogoutButton } from '@/components/LogoutButton';
import { useAuth } from '@/hooks/useAuth';
import { destinationService } from '@/services/destinationService';
import { DestinationCardProps } from '@/components/DestinationCard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function DestinationDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const destinationId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [destination, setDestination] = useState<DestinationCardProps | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!destinationId) {
      router.push('/destinations');
      return;
    }
    
    const fetchDestination = () => {
      const destData = destinationService.getDestinationById(destinationId);
      
      if (destData) {
        setDestination(destData);
      } else {
        // Si la destination n'existe pas, rediriger vers la page des destinations
        router.push('/destinations');
      }
      
      setLoading(false);
    };
    
    fetchDestination();
  }, [destinationId, router]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!destination) {
    return null; // La redirection sera gérée par l'effet
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />

      <main className="max-w-7xl mx-auto py-12 px-4">
        <div className="mb-6">
          <Link 
            href="/destinations" 
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour aux destinations
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="relative h-96 w-full">
            <Image
              src={destination.imageUrl}
              alt={`Image de ${destination.name}`}
              fill
              style={{objectFit: 'cover'}}
              priority
              className="brightness-75"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <h1 className="text-4xl md:text-5xl font-bold text-white text-center px-4 drop-shadow-lg">
                {destination.name}
              </h1>
            </div>
          </div>
          
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-8">
              <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-800">À propos de cette destination</h2>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  {destination.description}
                </p>
                
                <h3 className="text-xl font-semibold mb-3 text-gray-800">Points forts</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                  {destination.highlights.map((highlight, index) => (
                    <li key={index}>{highlight}</li>
                  ))}
                </ul>
              </div>
              
              <div className="md:w-1/3 bg-blue-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Informations pratiques</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-800">Meilleure période pour visiter</h4>
                    <p className="text-gray-700">{destination.bestTimeToVisit}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-800">Durée recommandée</h4>
                    <p className="text-gray-700">5 à 7 jours</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-800">Budget estimé</h4>
                    <p className="text-gray-700">À partir de 800€ par personne</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">Planifiez votre voyage à {destination.name.split(',')[0]}</h2>
              
              <div className="bg-blue-600 text-white rounded-lg p-6 text-center">
                <p className="mb-4 text-lg">
                  Prêt à découvrir {destination.name.split(',')[0]} ? Commencez à planifier votre voyage dès maintenant !
                </p>
                <Link 
                  href={`/travel/new?destination=${encodeURIComponent(destination.name)}`}
                  className="inline-block px-6 py-3 bg-white text-blue-600 rounded-md hover:bg-gray-100 transition-colors font-medium"
                >
                  Créer mon itinéraire
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">Autres destinations qui pourraient vous intéresser</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {destinationService
              .getAllDestinations()
              .filter(dest => dest.id !== destination.id)
              .slice(0, 3)
              .map(dest => (
                <Link 
                  key={dest.id} 
                  href={`/destinations/${dest.id}`}
                  className="block group"
                >
                  <div className="relative h-40 mb-3 overflow-hidden rounded-lg">
                    <Image
                      src={dest.imageUrl}
                      alt={`Image de ${dest.name}`}
                      fill
                      style={{objectFit: 'cover'}}
                      className="transition-transform group-hover:scale-105"
                    />
                  </div>
                  <h3 className="font-semibold text-gray-800 group-hover:text-blue-600">{dest.name}</h3>
                </Link>
              ))
            }
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
} 