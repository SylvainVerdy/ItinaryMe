"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle, Loader2, ArrowRight,
  Hotel, Plane, UtensilsCrossed, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { PrimaryButton } from '@/components/layout/PageShell';
import { useCart } from '@/context/CartContext';
import { TravelerInfo, BookingJob } from '@/types/booking';
import { authedFetch } from '@/lib/api-client';

const TYPE_ICON: Record<string, React.ElementType> = {
  hotel: Hotel, flight: Plane, restaurant: UtensilsCrossed, activity: Sparkles,
};

type Step = 'form' | 'automating' | 'done';

/**
 * `useSearchParams` impose une frontière Suspense pour le prérendu statique.
 * Le contenu réel vit dans PaymentSuccessContent.
 */
export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-7 w-7 animate-spin text-brand-teal" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}

function PaymentSuccessContent() {
  const { clearCart } = useCart();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [step, setStep] = useState<Step>('form');
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<BookingJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [traveler, setTraveler] = useState<TravelerInfo>({
    firstName: '', lastName: '', email: '', phone: '', bornOn: '',
  });

  useEffect(() => { clearCart(); }, [clearCart]);

  // Poll while bookings run
  useEffect(() => {
    if (step !== 'automating' || !jobId) return;
    const iv = setInterval(async () => {
      const res = await authedFetch(`/api/booking-status?jobId=${jobId}`);
      if (!res.ok) return;
      const data: BookingJob = await res.json();
      setJob(data);
      if (data.status === 'completed' || data.status === 'failed') {
        setStep('done');
        clearInterval(iv);
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [step, jobId]);

  async function startBooking() {
    if (!sessionId) return;
    setError(null);
    try {
      const res = await authedFetch('/api/automate-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, traveler }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur');
      setJobId(data.jobId);
      setStep('automating');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue');
    }
  }

  const formValid =
    traveler.firstName && traveler.lastName && traveler.email && traveler.phone;

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10';

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 px-4 py-12">
      <Link href="/" className="mb-10" aria-label="ItinaryMe">
        <Logo />
      </Link>

      <div className="w-full max-w-lg space-y-5">
        {/* En-tête */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle size={30} />
          </span>
          <h1 className="mt-6 font-display text-2xl font-bold text-slate-900">
            Paiement confirmé
          </h1>
          <p className="mt-2.5 leading-relaxed text-slate-500">
            Renseignez vos coordonnées pour finaliser les réservations.
          </p>
        </div>

        {/* Formulaire voyageur */}
        {step === 'form' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Voyageur principal
            </p>

            <div className="mt-6 space-y-5">
              <div className="flex flex-col gap-5 sm:flex-row">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-semibold text-slate-800">Prénom</label>
                  <input
                    className={inputClass}
                    placeholder="Jean"
                    value={traveler.firstName}
                    onChange={(e) => setTraveler((t) => ({ ...t, firstName: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-semibold text-slate-800">Nom</label>
                  <input
                    className={inputClass}
                    placeholder="Dupont"
                    value={traveler.lastName}
                    onChange={(e) => setTraveler((t) => ({ ...t, lastName: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">Email</label>
                <input
                  type="email"
                  className={inputClass}
                  placeholder="jean@email.com"
                  value={traveler.email}
                  onChange={(e) => setTraveler((t) => ({ ...t, email: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Téléphone <span className="font-normal text-slate-400">(format E.164)</span>
                </label>
                <input
                  className={inputClass}
                  placeholder="+33612345678"
                  value={traveler.phone}
                  onChange={(e) => setTraveler((t) => ({ ...t, phone: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Date de naissance
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={traveler.bornOn ?? ''}
                  onChange={(e) => setTraveler((t) => ({ ...t, bornOn: e.target.value }))}
                />
              </div>

              {error && (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <PrimaryButton onClick={startBooking} disabled={!formValid} className="w-full">
                Finaliser les réservations
                <ArrowRight size={16} />
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* Réservations en cours */}
        {step === 'automating' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-brand-teal" />
              <p className="font-medium text-slate-800">Réservations en cours via Duffel…</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Confirmations en direct auprès des compagnies aériennes et des hôtels. Ne fermez pas
              cette page.
            </p>
          </div>
        )}

        {/* Résultats */}
        {step === 'done' && job && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="font-display text-lg font-bold text-slate-900">Confirmations</h2>

            <ul className="mt-5 divide-y divide-slate-100">
              {job.results.map((r) => {
                const Icon = TYPE_ICON[job.items.find((i) => i.id === r.itemId)?.type ?? 'activity'];
                return (
                  <li key={r.itemId} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{r.itemName}</p>
                      {r.status === 'success' && (
                        <p className="mt-0.5 font-mono text-xs text-emerald-600">
                          ✓ {r.confirmationNumber}
                        </p>
                      )}
                      {r.status === 'pending' && (
                        <p className="mt-0.5 text-xs text-amber-600">
                          ⏳ {r.error ?? 'À réserver directement auprès du prestataire'}
                        </p>
                      )}
                      {r.status === 'failed' && (
                        <p className="mt-0.5 text-xs text-red-500">✗ {r.error ?? 'Échec'}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <PrimaryButton href="/dashboard" className="mt-6 w-full">
              Tableau de bord
              <ArrowRight size={16} />
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}
