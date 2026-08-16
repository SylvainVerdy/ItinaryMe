'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageLoader } from '@/components/layout/PageShell';

export default function LoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Rediriger vers la page d'authentification
    router.replace('/auth');
  }, [router]);

  return <PageLoader label="Redirection…" />;
}
