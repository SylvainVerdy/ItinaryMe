"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { travelService, TravelPlanInput } from '@/services/travelService';
import { TravelForm } from '@/components/TravelForm';
import { PageShell, PageHero, PageLoader, PrimaryButton } from '@/components/layout/PageShell';
import { AlertCircle } from 'lucide-react';

export default function EditTravelPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const travelId = params.id as string;

  const [travelData, setTravelData] = useState<TravelPlanInput | null>(null);
  const [loadingTravel, setLoadingTravel] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    const fetchTravelDetails = async () => {
      if (!travelId || !user) return;

      try {
        setLoadingTravel(true);
        const travel = await travelService.getTravelById(travelId);

        if (!travel) {
          setError("Ce voyage n'existe pas.");
          return;
        }

        if (travel.userId !== user.uid) {
          setError("Vous n'avez pas accès à ce voyage.");
          return;
        }

        // Extraire les données nécessaires pour le formulaire
        const formData: TravelPlanInput = {
          destination: travel.destination,
          dateDepart: travel.dateDepart,
          dateRetour: travel.dateRetour,
          nombreVoyageurs: travel.nombreVoyageurs,
          notes: travel.notes,
          activities: travel.activities
        };

        setTravelData(formData);
      } catch (error) {
        console.error("Erreur lors de la récupération du voyage:", error);
        setError("Une erreur est survenue lors du chargement du voyage.");
      } finally {
        setLoadingTravel(false);
      }
    };

    fetchTravelDetails();
  }, [travelId, user, loading, router]);

  if (loading || loadingTravel) {
    return <PageLoader label="Chargement du voyage…" />;
  }

  if (error) {
    return (
      <PageShell className="max-w-2xl">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <h1 className="font-display text-xl font-bold text-slate-900">{error}</h1>
          <PrimaryButton href="/dashboard" className="mt-6">
            Retour au tableau de bord
          </PrimaryButton>
        </div>
      </PageShell>
    );
  }

  if (!travelData) {
    return null;
  }

  return (
    <PageShell
      className="max-w-3xl"
      hero={
        <PageHero
          compact
          breadcrumb={[
            { label: 'Tableau de bord', href: '/dashboard' },
            { label: travelData.destination, href: `/travel/${travelId}` },
            { label: 'Modifier' },
          ]}
          eyebrow="Édition"
          title="Modifier votre voyage"
          subtitle="Ajustez les dates, le nombre de voyageurs ou vos notes."
        />
      }
    >
      <TravelForm initialData={travelData} travelId={travelId} isEditing />
    </PageShell>
  );
}
