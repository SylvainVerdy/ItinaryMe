'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import TravelNotes from '@/components/TravelNotes';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotesPage() {
  const { id } = useParams();
  const router = useRouter();
  const travelId = Array.isArray(id) ? id[0] : id;
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
    
    // Rediriger si travelId est undefined
    if (!loading && !travelId) {
      router.push('/travels');
    }
    
    setIsLoading(false);
  }, [user, loading, travelId, router]);

  if (isLoading || loading || !travelId) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <Link href={`/travel/${travelId}`} className="flex items-center text-primary hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour au voyage
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Notes de voyage</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <TravelNotes tripId={travelId} />
      </div>
    </div>
  );
} 