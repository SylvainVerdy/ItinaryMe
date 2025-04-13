"use client";

import Image from 'next/image';
import Link from 'next/link';

export interface DestinationCardProps {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  highlights: string[];
  bestTimeToVisit: string;
}

export function DestinationCard({
  id,
  name,
  imageUrl,
  description,
  highlights,
  bestTimeToVisit
}: DestinationCardProps) {
  return (
    <div className="bg-[#f8f5ec] rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105">
      <div className="relative h-48">
        <Image
          src={imageUrl}
          alt={`Image de ${name}`}
          fill
          style={{objectFit: 'cover'}}
          className="transition-opacity group-hover:opacity-90"
        />
      </div>
      
      <div className="p-5">
        <h3 className="text-xl font-semibold mb-2 text-gray-800">{name}</h3>
        <p className="text-gray-600 mb-4 line-clamp-2">{description}</p>
        
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Points forts :</h4>
          <ul className="list-disc list-inside text-sm text-gray-600">
            {highlights.slice(0, 3).map((highlight, index) => (
              <li key={index} className="truncate">{highlight}</li>
            ))}
          </ul>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-blue-600">
            <span className="font-medium">Meilleure période :</span> {bestTimeToVisit}
          </span>
          
          <Link
            href={`/travel/new?destination=${encodeURIComponent(name)}`}
            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            Planifier
          </Link>
        </div>
      </div>
    </div>
  );
} 