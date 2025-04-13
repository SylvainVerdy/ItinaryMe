"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogoutButton } from '@/components/LogoutButton';
import { useAuth } from '@/hooks/useAuth';
import { DestinationCard, DestinationCardProps } from '@/components/DestinationCard';
import { destinationService } from '@/services/destinationService';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const SEASONS = [
  { label: 'Printemps', value: 'mars à mai' },
  { label: 'Été', value: 'juin à août' },
  { label: 'Automne', value: 'septembre à novembre' },
  { label: 'Hiver', value: 'décembre à février' },
];

export default function DestinationsPage() {
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<DestinationCardProps[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<DestinationCardProps[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  
  useEffect(() => {
    // Charger toutes les destinations
    const allDestinations = destinationService.getAllDestinations();
    setDestinations(allDestinations);
    setFilteredDestinations(allDestinations);
  }, []);
  
  // Filtrer les destinations en fonction de la recherche et du filtre de saison
  useEffect(() => {
    let results = destinations;
    
    if (searchQuery) {
      results = destinationService.searchDestinations(searchQuery);
    }
    
    if (seasonFilter) {
      results = results.filter(dest => 
        dest.bestTimeToVisit.toLowerCase().includes(seasonFilter.toLowerCase())
      );
    }
    
    setFilteredDestinations(results);
  }, [searchQuery, seasonFilter, destinations]);
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSeasonFilter(e.target.value);
  };
  
  return (
    <div className="min-h-screen bg-[#f5f0e1]">
      <Navbar />

      <main className="max-w-7xl mx-auto py-12 px-4">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Explorez nos destinations
          </h1>
          <p className="text-gray-600 max-w-3xl mx-auto">
            Découvrez des destinations de rêve du monde entier et commencez à planifier votre prochain voyage
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 space-y-4 md:space-y-0">
          <div className="relative w-full md:w-1/3">
            <input
              type="text"
              placeholder="Rechercher une destination..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[#f8f5ec]"
            />
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <div className="flex items-center space-x-4">
            <label htmlFor="seasonFilter" className="text-gray-700">Filtrer par saison :</label>
            <select
              id="seasonFilter"
              value={seasonFilter}
              onChange={handleSeasonChange}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[#f8f5ec]"
            >
              <option value="">Toutes les saisons</option>
              {SEASONS.map((season) => (
                <option key={season.value} value={season.value}>
                  {season.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {filteredDestinations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Aucune destination ne correspond à vos critères. Veuillez essayer une autre recherche.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDestinations.map((destination) => (
              <DestinationCard
                key={destination.id}
                id={destination.id}
                name={destination.name}
                imageUrl={destination.imageUrl}
                description={destination.description}
                highlights={destination.highlights}
                bestTimeToVisit={destination.bestTimeToVisit}
              />
            ))}
          </div>
        )}
        
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-6">
            Vous ne trouvez pas la destination de vos rêves ? Contactez-nous et nous vous aiderons à la planifier.
          </p>
          <Link 
            href="/contact"
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Nous contacter
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
} 