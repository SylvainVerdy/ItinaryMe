'use client';

import { Plane, Clock, ArrowRight, ShoppingCart, CheckCircle } from 'lucide-react';
import { FlightOffer } from '@/services/duffel-flights';
import { useCart } from '@/context/CartContext';
import { useState } from 'react';

interface Props {
  offer: FlightOffer;
  tripId: string;
}

function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const h = match[1] ? `${match[1]}h` : '';
  const m = match[2] ? `${match[2]}m` : '';
  return `${h} ${m}`.trim();
}

function formatDateTime(dt: string): { date: string; time: string } {
  const d = new Date(dt);
  return {
    date: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function FlightResultCard({ offer, tripId }: Props) {
  const { addItem, items } = useCart();
  const [added, setAdded] = useState(false);

  const alreadyInCart = items.some((i) => i.id === offer.offerId);

  const dep = formatDateTime(offer.departureAt);
  const arr = formatDateTime(offer.arrivalAt);

  const handleAdd = () => {
    if (alreadyInCart || added) return;
    addItem({
      id: offer.offerId,
      type: 'flight',
      name: `${offer.airline} · ${offer.origin} → ${offer.destination}`,
      price: offer.price,
      currency: offer.currency,
      location: `${offer.origin} → ${offer.destination}`,
      tripId,
      offerId: offer.offerId,
      passengerIds: offer.passengerIds,
      departureDate: offer.departureAt.split('T')[0],
      returnDate: offer.returnDepartureAt?.split('T')[0],
      origin: offer.origin,
      destination: offer.destination,
    });
    setAdded(true);
  };

  const isAdded = alreadyInCart || added;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-lift">
      {/* Airline */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50">
            <Plane size={15} className="text-brand-teal" />
          </div>
          <span className="text-sm font-semibold text-slate-900">{offer.airline}</span>
          {offer.stops === 0 && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Direct</span>
          )}
          {offer.stops > 0 && (
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
              {offer.stops} escale{offer.stops > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-bold text-slate-900">
            {offer.price.toLocaleString('fr-FR')} {offer.currency}
          </div>
        </div>
      </div>

      {/* Route */}
      <div className="mb-4 flex items-center gap-3">
        <div className="text-center">
          <div className="font-display text-lg font-bold text-slate-900">{offer.origin}</div>
          <div className="text-xs font-medium text-slate-600">{dep.time}</div>
          <div className="text-xs text-slate-400">{dep.date}</div>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock size={11} />
            {formatDuration(offer.duration)}
          </div>
          <div className="w-full flex items-center gap-1">
            <div className="h-px flex-1 bg-slate-200" />
            <ArrowRight size={12} className="text-brand-teal" />
            <div className="h-px flex-1 bg-slate-200" />
          </div>
        </div>
        <div className="text-center">
          <div className="font-display text-lg font-bold text-slate-900">{offer.destination}</div>
          <div className="text-xs font-medium text-slate-600">{arr.time}</div>
          <div className="text-xs text-slate-400">{arr.date}</div>
        </div>
      </div>

      {/* Add to cart */}
      <button
        onClick={handleAdd}
        disabled={isAdded}
        className={`flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition ${
          isAdded
            ? 'cursor-default bg-emerald-50 text-emerald-700'
            : 'bg-gradient-to-r from-brand-coral to-brand-sun text-white hover:brightness-110'
        }`}
      >
        {isAdded ? (
          <><CheckCircle size={15} /> Ajouté au panier</>
        ) : (
          <><ShoppingCart size={15} /> Ajouter au panier</>
        )}
      </button>
    </div>
  );
}
