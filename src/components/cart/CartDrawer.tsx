"use client";

import { useState } from 'react';
import { ShoppingBag, Trash2, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { CartItemRow } from './CartItemRow';
import { CartItemType } from '@/types/cart';

const GROUPS: { type: CartItemType; label: string }[] = [
  { type: 'flight', label: 'Vols' },
  { type: 'hotel', label: 'Hôtels' },
  { type: 'restaurant', label: 'Restaurants' },
  { type: 'activity', label: 'Activités' },
];

export function CartDrawer() {
  const { items, total, itemCount, tripId, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, tripId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur');
      window.location.href = data.url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue');
      setLoading(false);
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="relative flex items-center justify-center p-2 rounded-full w-8 h-8 hover:bg-gray-100 hover:bg-opacity-20"
          aria-label="Panier"
        >
          <ShoppingBag className="w-5 h-5" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#e8a87c] text-white text-[10px] font-bold flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md bg-[#f8f5ec] border-l border-[#e6e0d4] flex flex-col">
        <SheetHeader className="border-b border-[#e6e0d4] pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold text-gray-800">
              Mon panier de voyage
            </SheetTitle>
            {itemCount > 0 && (
              <button
                onClick={clearCart}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Vider
              </button>
            )}
          </div>
          {itemCount > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {itemCount} élément{itemCount > 1 ? 's' : ''} · paiement unique
            </p>
          )}
        </SheetHeader>

        {/* Items */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {itemCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <ShoppingBag className="w-10 h-10 text-[#c8b99a] mb-3" />
              <p className="text-sm text-gray-500">Votre panier est vide</p>
              <p className="text-xs text-gray-400 mt-1">
                Ajoutez des hôtels, vols ou restaurants à votre itinéraire
              </p>
            </div>
          ) : (
            GROUPS.map(({ type, label }) => {
              const groupItems = items.filter((i) => i.type === type);
              if (groupItems.length === 0) return null;

              const groupTotal = groupItems.reduce((s, i) => s + i.price, 0);

              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#8b7355] uppercase tracking-wide">
                      {label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {groupTotal.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: groupItems[0].currency,
                      })}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl px-3 shadow-sm border border-[#e6e0d4]">
                    {groupItems.map((item) => (
                      <CartItemRow key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {itemCount > 0 && (
          <div className="border-t border-[#e6e0d4] pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Total</span>
              <span className="text-xl font-bold text-gray-900">
                {total.toLocaleString('fr-FR', { style: 'currency', currency: items[0].currency })}
              </span>
            </div>
            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}
            <p className="text-[11px] text-gray-400 text-center">
              Un seul paiement · Réservations automatiques sur chaque site
            </p>
            <Button
              className="w-full bg-[#e8a87c] hover:bg-[#d4956a] text-white font-semibold py-5 rounded-xl"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirection...
                </>
              ) : (
                'Payer en une fois'
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
