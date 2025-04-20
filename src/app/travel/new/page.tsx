"use client";

import { TravelForm } from '@/components/TravelForm';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { travelService, TravelPlanInput } from '@/services/travelService';
import { toast } from '@/hooks/use-toast';

export default function NewTravelPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (!loading && !user) {
      // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSubmit = async (formData: TravelPlanInput) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      const travelId = await travelService.createTravel(user.uid, formData);
      
      toast({
        title: "Voyage créé",
        description: "Votre voyage a été créé avec succès.",
      });
      
      router.push(`/travel/${travelId}`);
    } catch (error) {
      console.error("Erreur lors de la création du voyage:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création du voyage.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!user) {
    return null; // La redirection sera gérée par l'effet
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Créer un nouveau voyage</h1>
      <TravelForm 
        onSubmit={handleSubmit} 
        isLoading={isSubmitting} 
      />
    </div>
  );
} 