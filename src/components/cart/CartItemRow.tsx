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
    <div className="flex items-start gap-3 py-3 border-b border-[#e6e0d4] last:border-0">
      {/* Icon */}
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#f0ebe1] flex items-center justify-center">
        <Icon className="w-4 h-4 text-[#8b7355]" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[#e6e0d4] text-[#8b7355] font-medium">
          {TYPE_LABEL[item.type]}
        </span>
      </div>

      {/* Price + remove */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-800">
          {item.price.toLocaleString('fr-FR', { style: 'currency', currency: item.currency })}
        </span>
        <button
          onClick={() => removeItem(item.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Retirer du panier"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
