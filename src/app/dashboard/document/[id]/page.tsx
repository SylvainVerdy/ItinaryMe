"use client";

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { TravelDocumentEditor } from '@/components/TravelDocumentEditor';
import { PageLoader } from '@/components/layout/PageShell';

export default function DocumentPage() {
  return (
    <Suspense fallback={<PageLoader label="Chargement du document…" />}>
      <DocumentPageContent />
    </Suspense>
  );
}

function DocumentPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Next 15 passe `params` en Promise aux pages : on lit l'id via le hook
  // client, sinon `params.id` vaut undefined et l'éditeur ouvre toujours un
  // document vierge, même en édition.
  const params = useParams();
  const documentId = typeof params?.id === 'string' ? params.id : undefined;

  // Les liens de la liste transmettent le voyage rattaché via ?tripId=
  const searchParams = useSearchParams();
  const tripId = searchParams.get('tripId') ?? '';

  useEffect(() => {
    if (!loading && !user) {
      // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <PageLoader label="Chargement du document…" />;
  }

  if (!user) {
    return null; // La redirection sera gérée par l'effet
  }

  const isNew = !documentId || documentId === 'new';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
            <Link
              href="/dashboard?view=documents"
              className="transition-colors hover:text-slate-900"
            >
              Documents
            </Link>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="font-medium text-slate-900">
              {isNew ? 'Nouveau document' : 'Édition'}
            </span>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <TravelDocumentEditor
          documentId={isNew ? undefined : documentId}
          tripId={tripId}
          onSave={() => router.push('/dashboard?view=documents')}
        />
      </div>
    </div>
  );
}
