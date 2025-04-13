'use client';

import AuthForm from '@/components/AuthForm';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AuthPage() {
  const router = useRouter();

  // Rediriger l'utilisateur s'il est déjà connecté
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/dashboard');
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-green-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Bienvenue sur ItinaryMe
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Votre voyage personnalisé commence ici
          </p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
} 