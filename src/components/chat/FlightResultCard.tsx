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
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Airline */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
            <Plane size={14} className="text-blue-600" />
          </div>
          <span className="text-sm font-medium text-gray-800">{offer.airline}</span>
          {offer.stops === 0 && (
            <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">Direct</span>
          )}
          {offer.stops > 0 && (
            <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full">
              {offer.stops} escale{offer.stops > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {offer.price.toLocaleString('fr-FR')} {offer.currency}
          </div>
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center gap-3 mb-3">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{offer.origin}</div>
          <div className="text-xs text-gray-500">{dep.time}</div>
          <div className="text-xs text-gray-400">{dep.date}</div>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock size={11} />
            {formatDuration(offer.duration)}
          </div>
          <div className="w-full flex items-center gap-1">
            <div className="flex-1 h-px bg-gray-200" />
            <ArrowRight size={12} className="text-gray-400" />
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{offer.destination}</div>
          <div className="text-xs text-gray-500">{arr.time}</div>
          <div className="text-xs text-gray-400">{arr.date}</div>
        </div>
      </div>

      {/* Add to cart */}
      <button
        onClick={handleAdd}
        disabled={isAdded}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
          isAdded
            ? 'bg-green-50 text-green-700 cursor-default'
            : 'bg-blue-600 text-white hover:bg-blue-700'
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
