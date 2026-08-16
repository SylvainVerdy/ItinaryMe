'use client';

import { Hotel, Star, ShoppingCart, CheckCircle, RefreshCcw } from 'lucide-react';
import { StayOffer } from '@/services/duffel-stays';
import { useCart } from '@/context/CartContext';
import { useState } from 'react';

interface Props {
  offer: StayOffer;
  tripId: string;
}

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={11}
          className={i < rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}
        />
      ))}
    </div>
  );
}

export default function HotelResultCard({ offer, tripId }: Props) {
  const { addItem, items } = useCart();
  const [added, setAdded] = useState(false);

  const alreadyInCart = items.some((i) => i.id === offer.rateId);

  const handleAdd = () => {
    if (alreadyInCart || added) return;
    addItem({
      id: offer.rateId,
      type: 'hotel',
      name: offer.hotelName,
      price: offer.price,
      currency: offer.currency,
      location: offer.address,
      tripId,
      rateId: offer.rateId,
      checkIn: offer.checkInDate,
      checkOut: offer.checkOutDate,
      nights: offer.nights,
      image: offer.photoUrl,
    });
    setAdded(true);
  };

  const isAdded = alreadyInCart || added;
  const pricePerNight = offer.nights > 0 ? Math.round(offer.price / offer.nights) : offer.price;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-lift">
      {/* Photo */}
      {offer.photoUrl ? (
        <img src={offer.photoUrl} alt={offer.hotelName} className="h-28 w-full object-cover" />
      ) : (
        <div className="flex h-28 w-full items-center justify-center bg-gradient-to-br from-brand-teal to-brand-lagoon">
          <Hotel size={28} className="text-white/70" />
        </div>
      )}

      <div className="p-4">
        {/* Name + stars */}
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <div className="line-clamp-2 text-sm font-semibold leading-tight text-slate-900">{offer.hotelName}</div>
        </div>
        <StarRating rating={offer.starRating} />

        {/* Room + board */}
        <div className="mt-1.5 line-clamp-1 text-xs text-slate-500">{offer.roomName}</div>
        <div className="text-xs text-slate-400">
          {offer.boardType} · {offer.nights} nuit{offer.nights > 1 ? 's' : ''}
          {offer.refundable && (
            <span className="ml-1 inline-flex items-center gap-0.5 text-emerald-600">
              <RefreshCcw size={10} /> Remboursable
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mt-2 flex items-end justify-between">
          <div>
            <div className="font-display text-base font-bold text-slate-900">
              {pricePerNight.toLocaleString('fr-FR')} {offer.currency}
              <span className="text-xs font-normal text-slate-400">/nuit</span>
            </div>
            <div className="text-xs text-slate-400">
              Total : {offer.price.toLocaleString('fr-FR')} {offer.currency}
            </div>
          </div>
        </div>

        {/* Add to cart */}
        <button
          onClick={handleAdd}
          disabled={isAdded}
          className={`mt-3.5 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-semibold transition ${
            isAdded
              ? 'cursor-default bg-emerald-50 text-emerald-700'
              : 'bg-gradient-to-r from-brand-coral to-brand-sun text-white hover:brightness-110'
          }`}
        >
          {isAdded ? (
            <><CheckCircle size={13} /> Ajouté au panier</>
          ) : (
            <><ShoppingCart size={13} /> Ajouter au panier</>
          )}
        </button>
      </div>
    </div>
  );
}
