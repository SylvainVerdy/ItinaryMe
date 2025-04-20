"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import { TravelDocumentEditor } from '@/components/TravelDocumentEditor';

export default function DocumentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const documentId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  useEffect(() => {
    if (!loading && !user) {
      // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
      router.push('/login');
    }
  }, [user, loading, router]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!user || !documentId) {
    return null; // La redirection sera gérée par l'effet
  }
  
  return (
    <div className="p-6 bg-[#f8f5ec] min-h-screen">
      <div className="max-w-5xl mx-auto">
        <TravelDocumentEditor 
          documentId={documentId === 'new' ? undefined : documentId} 
          tripId="" 
          onSave={() => router.push('/dashboard?view=documents')}
        />
      </div>
    </div>
  );
} 