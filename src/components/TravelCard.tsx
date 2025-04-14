import React from 'react';
import Link from 'next/link';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Calendar, MapPin, Users, Clock, Star } from 'lucide-react';

interface TravelCardProps {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  numTravelers: number;
  isFavorite?: boolean;
  imageUrl?: string;
  notes?: string;
  onFavoriteToggle?: (id: string, newStatus: boolean) => void;
}

export const TravelCard: React.FC<TravelCardProps> = ({
  id,
  destination,
  startDate,
  endDate,
  numTravelers,
  isFavorite = false,
  imageUrl,
  notes,
  onFavoriteToggle
}) => {
  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const newStatus = !isFavorite;
      
      await updateDoc(doc(db, 'travels', id), {
        isFavorite: newStatus
      });
      
      if (onFavoriteToggle) {
        onFavoriteToggle(id, newStatus);
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour du favori:", err);
    }
  };
  
  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    return `${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`;
  };
  
  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] overflow-hidden group relative">
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={toggleFavorite}
          className="p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white transition-colors"
        >
          <Star 
            size={16} 
            className={`${isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} 
          />
        </button>
      </div>
      
      <Link href={`/travel/${id}`}>
        <div className="h-40 bg-gradient-to-r from-blue-500 to-purple-600 relative">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={destination} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <MapPin size={32} />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <h2 className="text-lg font-medium text-white">
              {destination}
            </h2>
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <Calendar size={14} className="text-blue-500" />
            <span>
              {formatDateRange(startDate, endDate)}
              {' '}
              ({calculateDuration(startDate, endDate)} jours)
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Users size={14} className="text-blue-500" />
            <span>{numTravelers} voyageur{numTravelers > 1 ? 's' : ''}</span>
          </div>
          
          {notes && (
            <p className="text-sm text-gray-700 border-t border-[#e6e0d4] pt-3 line-clamp-2">
              {notes}
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
  );
}; 