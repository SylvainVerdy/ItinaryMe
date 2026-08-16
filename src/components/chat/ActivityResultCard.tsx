'use client';

import { useState } from 'react';
import { CheckCircle, ExternalLink, ShoppingCart, Star, Ticket } from 'lucide-react';
import { ActivityOffer } from '@/types/activity-offer';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';

interface Props {
  offer: ActivityOffer;
  tripId: string;
}

export default function ActivityResultCard({ offer, tripId }: Props) {
  const { addItem, items } = useCart();
  const [added, setAdded] = useState(false);

  const alreadyInCart = items.some((i) => i.id === offer.activityId);
  const isAdded = alreadyInCart || added;

  // Sans prix connu, l'ajouter au panier fausserait le total : on renvoie
  // alors uniquement vers la marketplace.
  const canAddToCart = typeof offer.price === 'number' && offer.price > 0;

  const handleAdd = () => {
    if (isAdded || !canAddToCart) return;
    addItem({
      id: offer.activityId,
      type: 'activity',
      name: offer.name,
      price: offer.price!,
      currency: offer.currency ?? 'EUR',
      location: offer.city,
      sourceUrl: offer.bookingUrl,
      tripId,
      image: offer.thumbnail,
    });
    setAdded(true);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-lift">
      {offer.thumbnail ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={offer.thumbnail} alt="" className="h-28 w-full object-cover" />
      ) : (
        <div className="flex h-28 w-full items-center justify-center bg-gradient-to-br from-brand-coral to-brand-sun">
          <Ticket size={26} className="text-white/80" />
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {offer.provider}
        </p>
        <h4 className="mt-1 line-clamp-2 text-sm font-semibold leading-tight text-slate-900">
          {offer.name}
        </h4>

        {offer.rating != null && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            {offer.rating}/5
            {offer.reviews != null && <span className="text-slate-400">({offer.reviews})</span>}
          </p>
        )}

        <div className="mt-3">
          {canAddToCart ? (
            <p className="font-display text-base font-bold text-slate-900">
              {offer.price!.toLocaleString('fr-FR')} {offer.currency}
              <span className="ml-1 text-xs font-normal text-slate-400">/ pers.</span>
            </p>
          ) : (
            <p className="text-xs text-slate-400">Prix affiché sur le site</p>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-3.5">
          <a
            href={offer.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand-coral to-brand-sun py-2.5 text-xs font-semibold text-white transition hover:brightness-110"
          >
            <ExternalLink size={13} />
            Réserver
          </a>

          {canAddToCart && (
            <button
              onClick={handleAdd}
              disabled={isAdded}
              className={cn(
                'flex w-full items-center justify-center gap-1.5 rounded-full border py-2.5 text-xs font-semibold transition',
                isAdded
                  ? 'cursor-default border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 text-slate-700 hover:border-brand-teal hover:text-brand-teal',
              )}
            >
              {isAdded ? (
                <><CheckCircle size={13} /> Ajouté au panier</>
              ) : (
                <><ShoppingCart size={13} /> Ajouter au panier</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
