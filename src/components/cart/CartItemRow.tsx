"use client";

import { X, Hotel, Plane, UtensilsCrossed, Sparkles } from 'lucide-react';
import { CartItem } from '@/types/cart';
import { useCart } from '@/context/CartContext';

const TYPE_ICON = {
  hotel: Hotel,
  flight: Plane,
  restaurant: UtensilsCrossed,
  activity: Sparkles,
};

const TYPE_LABEL = {
  hotel: 'Hôtel',
  flight: 'Vol',
  restaurant: 'Restaurant',
  activity: 'Activité',
};

export function CartItemRow({ item }: { item: CartItem }) {
  const { removeItem } = useCart();
  const Icon = TYPE_ICON[item.type];

  const subtitle = (() => {
    if (item.type === 'hotel' && item.checkIn && item.checkOut) {
      return `${item.checkIn} → ${item.checkOut}${item.nights ? ` · ${item.nights} nuit(s)` : ''}`;
    }
    if (item.type === 'flight' && item.departureDate) {
      return `${item.origin ?? ''} → ${item.destination ?? ''} · ${item.departureDate}`;
    }
    if (item.date) return item.date + (item.time ? ` à ${item.time}` : '');
    return item.location;
  })();

  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-3.5 last:border-0">
      {/* Icon */}
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50">
        <Icon className="h-4 w-4 text-brand-teal" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
        <span className="mt-1.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
          {TYPE_LABEL[item.type]}
        </span>
      </div>

      {/* Price + remove */}
      <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
        <span className="font-display text-sm font-bold text-slate-900">
          {item.price.toLocaleString('fr-FR', { style: 'currency', currency: item.currency })}
        </span>
        <button
          onClick={() => removeItem(item.id)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
          aria-label="Retirer du panier"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
