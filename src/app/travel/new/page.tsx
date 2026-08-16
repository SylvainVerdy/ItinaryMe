"use client";

import { TravelForm } from '@/components/TravelForm';
import { PageShell, PageHero, PageLoader } from '@/components/layout/PageShell';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NewTravelPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return null; // La redirection sera gérée par l'effet
  }

  return (
    <PageShell
      className="max-w-3xl"
      hero={
        <PageHero
          compact
          breadcrumb={[
            { label: 'Tableau de bord', href: '/dashboard' },
            { label: 'Nouveau voyage' },
          ]}
          eyebrow="Nouvelle aventure"
          title="Planifiez votre voyage"
          subtitle="Quelques informations suffisent — l'assistant IA se chargera ensuite des vols, des hôtels et de l'itinéraire."
        />
      }
    >
      <TravelForm />
    </PageShell>
  );
}
