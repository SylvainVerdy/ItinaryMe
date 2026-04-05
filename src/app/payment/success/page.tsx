"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle, Loader2, ArrowRight,
  Hotel, Plane, UtensilsCrossed, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/context/CartContext';
import { TravelerInfo, BookingJob } from '@/types/booking';

const TYPE_ICON: Record<string, React.ElementType> = {
  hotel: Hotel, flight: Plane, restaurant: UtensilsCrossed, activity: Sparkles,
};

type Step = 'form' | 'automating' | 'done';

export default function PaymentSuccessPage() {
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
      const res = await fetch(`/api/booking-status?jobId=${jobId}`);
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
      const res = await fetch('/api/automate-bookings', {
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

  return (
    <div className="min-h-screen bg-[#f8f5ec] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-4">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e6e0d4] p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-800">Paiement confirmé !</h1>
          <p className="text-sm text-gray-500 mt-1">
            Renseignez vos coordonnées pour finaliser les réservations.
          </p>
        </div>

        {/* Traveler form */}
        {step === 'form' && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#e6e0d4] p-6 space-y-4">
            <p className="text-xs font-semibold text-[#8b7355] uppercase tracking-wide">
              Voyageur principal
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Prénom</label>
                <Input placeholder="Jean" value={traveler.firstName}
                  onChange={(e) => setTraveler((t) => ({ ...t, firstName: e.target.value }))} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Nom</label>
                <Input placeholder="Dupont" value={traveler.lastName}
                  onChange={(e) => setTraveler((t) => ({ ...t, lastName: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              <Input type="email" placeholder="jean@email.com" value={traveler.email}
                onChange={(e) => setTraveler((t) => ({ ...t, email: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Téléphone (E.164)</label>
              <Input placeholder="+33612345678" value={traveler.phone}
                onChange={(e) => setTraveler((t) => ({ ...t, phone: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date de naissance</label>
              <Input type="date" value={traveler.bornOn ?? ''}
                onChange={(e) => setTraveler((t) => ({ ...t, bornOn: e.target.value }))} />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <Button
              className="w-full bg-[#e8a87c] hover:bg-[#d4956a] text-white font-semibold py-5 rounded-xl"
              onClick={startBooking}
              disabled={!formValid}
            >
              Finaliser les réservations
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Automating */}
        {step === 'automating' && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#e6e0d4] p-6">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="w-5 h-5 animate-spin text-[#e8a87c]" />
              <p className="text-sm font-medium text-gray-700">
                Réservations en cours via Duffel…
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Confirmations en direct auprès des compagnies aériennes et hôtels. Ne fermez pas cette page.
            </p>
          </div>
        )}

        {/* Results */}
        {step === 'done' && job && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#e6e0d4] p-6 space-y-3">
            <p className="text-sm font-semibold text-gray-800 mb-1">Confirmations</p>
            {job.results.map((r) => {
              const Icon = TYPE_ICON[job.items.find((i) => i.id === r.itemId)?.type ?? 'activity'];
              return (
                <div key={r.itemId} className="flex items-start gap-3 py-2 border-b border-[#e6e0d4] last:border-0">
                  <Icon className="w-4 h-4 text-[#8b7355] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{r.itemName}</p>
                    {r.status === 'success' && (
                      <p className="text-xs text-green-600 font-mono mt-0.5">✓ {r.confirmationNumber}</p>
                    )}
                    {r.status === 'failed' && (
                      <p className="text-xs text-red-500 mt-0.5">✗ {r.error ?? 'Échec'}</p>
                    )}
                  </div>
                </div>
              );
            })}
            <Button
              className="w-full bg-[#e8a87c] hover:bg-[#d4956a] text-white font-semibold py-5 rounded-xl mt-2"
              onClick={() => (window.location.href = '/dashboard')}
            >
              Tableau de bord <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
