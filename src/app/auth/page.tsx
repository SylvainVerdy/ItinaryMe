'use client';

import AuthForm from '@/components/AuthForm';
import { Logo } from '@/components/Logo';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ArrowLeft, Check } from 'lucide-react';

const PERKS = [
  'Itinéraire jour par jour généré en 60 secondes',
  'Vols et hôtels comparés en temps réel',
  'Panier unique et paiement sécurisé',
];

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
    <div className="flex min-h-screen">
      {/* Panneau de marque */}
      <aside className="relative isolate hidden w-[45%] flex-col justify-between overflow-hidden bg-brand-ink p-12 lg:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-teal/40 blur-[110px] animate-aurora" />
          <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-brand-coral/30 blur-[110px] animate-aurora animation-delay-500" />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-50" />

        <Link href="/" aria-label="ItinaryMe">
          <Logo onDark />
        </Link>

        <div>
          <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-white">
            Racontez votre voyage.
            <br />
            <span className="text-gradient">On s'occupe du reste.</span>
          </h2>

          <ul className="mt-8 space-y-3.5">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-slate-300">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-400">
                  <Check size={12} />
                </span>
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-slate-500">© 2025 ItinaryMe</p>
      </aside>

      {/* Formulaire */}
      <main className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <Link href="/" aria-label="ItinaryMe">
              <Logo />
            </Link>
          </div>

          <Link
            href="/"
            className="mb-8 hidden items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900 lg:inline-flex"
          >
            <ArrowLeft size={15} />
            Retour à l'accueil
          </Link>

          <AuthForm />
        </div>
      </main>
    </div>
  );
}
