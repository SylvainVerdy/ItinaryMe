"use client";

import React, { useState, useEffect, ReactNode } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Composant d'ordre supérieur qui garantit que son contenu n'est rendu que côté client.
 * Utile pour les composants qui dépendent de window, document ou d'autres API du navigateur.
 */
export default function ClientOnly({ children, fallback }: ClientOnlyProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return fallback || (
      <div className="flex justify-center items-center h-40 w-full bg-gray-50 rounded-md">
        <div className="animate-spin h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return <>{children}</>;
} 