"use client";

import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapComponentProps {
  points: Array<{
    id: string;
    name: string;
    position: {
      lat: number;
      lng: number;
    };
    category?: string;
    day?: number;
    description?: string;
  }>;
}

export default function MapComponent({ points }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return;

    // Nettoyer l'ancienne carte si elle existe
    if (mapRef.current) {
      mapRef.current.remove();
    }

    // Créer une nouvelle carte
    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Ajouter le fond de carte
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Configuration des icônes
    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      shadowSize: [41, 41]
    });

    // Créer le tracé de l'itinéraire
    if (points.length > 1) {
      const pathPoints = points.map(p => [p.position.lat, p.position.lng] as [number, number]);
      L.polyline(pathPoints, { 
        color: '#3B82F6', 
        weight: 3,
        opacity: 0.7,
        dashArray: '5, 5'
      }).addTo(map);
    }

    // Ajouter les marqueurs
    const markers: L.Marker[] = [];
    points.forEach((point) => {
      const marker = L.marker([point.position.lat, point.position.lng], {
        icon: defaultIcon,
        title: point.name
      }).addTo(map);
      
      // Ajouter une popup
      const dayInfo = point.day ? `<div style="font-weight: bold; color: #3B82F6;">Jour ${point.day}</div>` : '';
      marker.bindPopup(`
        ${dayInfo}
        <div style="font-weight: 500;">${point.name}</div>
        ${point.description ? `<div style="font-size: 0.875rem;">${point.description}</div>` : ''}
      `);
      
      markers.push(marker);
    });

    // Ajuster la vue pour montrer tous les marqueurs
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }

    // Sauvegarder la référence à la carte
    mapRef.current = map;

    // Nettoyer lors du démontage
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [points]);

  return <div ref={containerRef} className="w-full h-full" />;
} 