"use client";

import { FC } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';

export interface DestinationCardProps {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  highlights: string[];
  bestTimeToVisit: string;
}

export const DestinationCard: FC<DestinationCardProps> = ({
  id,
  name,
  imageUrl,
  description,
  highlights,
  bestTimeToVisit
}) => {
  const { t } = useLanguage();
  
  // Déterminer si on doit utiliser les traductions pour cette destination
  const destinationKey = `destination_${id.replace(/-/g, '_')}`;
  const hasTranslation = t(destinationKey) !== destinationKey;
  
  const displayName = hasTranslation ? t(destinationKey) : name;
  const displayDescription = hasTranslation ? t(`${destinationKey}_desc`) : description;

  return (
    <div className="bg-[#f8f5ec] rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105">
      <div className="relative h-48">
        <Image
          src={imageUrl}
          alt={`Image de ${name}`}
          fill
          unoptimized={true}
          loader={({ src }) => src}
          style={{objectFit: 'cover'}}
          className="transition-opacity group-hover:opacity-90"
        />
      </div>
      
      <div className="p-5">
        <h3 className="text-xl font-semibold mb-2 text-gray-800">{displayName}</h3>
        <p className="text-gray-600 mb-4 line-clamp-2">{displayDescription}</p>
        
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-1">{t('highlights')}:</h4>
          <ul className="list-disc list-inside text-sm text-gray-600">
            {highlights.slice(0, 3).map((highlight, index) => (
              <li key={index} className="truncate">{highlight}</li>
            ))}
          </ul>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-blue-600">
            <span className="font-medium">{t('best_time_to_visit')}:</span> {bestTimeToVisit}
          </span>
          
          <Link
            href={`/travel/new?destination=${id}`}
            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            {t('planMyTrip')}
          </Link>
        </div>
      </div>
    </div>
  );
}; 