"use client";

import { useState } from 'react';
import { ShoppingBag, Trash2, Loader2, ExternalLink } from 'lucide-react';
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
import { isPayable, payableItems, payableTotal, selfBookedItems } from '@/lib/cart-rules';

const GROUPS: { type: CartItemType; label: string }[] = [
  { type: 'flight', label: 'Vols' },
  { type: 'hotel', label: 'Hôtels' },
  { type: 'restaurant', label: 'Restaurants' },
  { type: 'activity', label: 'Activités' },
];

export function CartDrawer() {
  const { items, itemCount, tripId, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ce qui est réservé et encaissé ici, vs ce que l'utilisateur réserve
  // lui-même chez le prestataire (activités, restaurants).
  const selfBooked = selfBookedItems(items);
  const toPay = payableTotal(items);
  const canPay = payableItems(items).length > 0;

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
          className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5"
          aria-label="Panier"
        >
          <ShoppingBag className="w-5 h-5" />
          {itemCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-brand-coral to-brand-sun text-[10px] font-bold text-white">
              {itemCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col border-l border-slate-200 bg-slate-50 sm:max-w-md">
        <SheetHeader className="border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-display text-lg font-bold text-slate-900">
              Mon panier de voyage
            </SheetTitle>
            {itemCount > 0 && (
              <button
                onClick={clearCart}
                className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Vider
              </button>
            )}
          </div>
          {itemCount > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              {itemCount} élément{itemCount > 1 ? 's' : ''} · paiement unique
            </p>
          )}
        </SheetHeader>

        {/* Items */}
        <div className="flex-1 space-y-5 overflow-y-auto py-4">
          {itemCount === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-teal to-brand-lagoon text-white">
                <ShoppingBag className="h-6 w-6" />
              </span>
              <p className="text-sm font-medium text-slate-700">Votre panier est vide</p>
              <p className="mt-1 text-xs text-slate-400">
                Ajoutez des hôtels, vols ou restaurants à votre itinéraire
              </p>
            </div>
          ) : (
            <>
              {GROUPS.filter((g) => isPayable({ type: g.type })).map(({ type, label }) => {
                const groupItems = items.filter((i) => i.type === type);
                if (groupItems.length === 0) return null;

                const groupTotal = groupItems.reduce((s, i) => s + i.price, 0);

                return (
                  <div key={type}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {label}
                      </span>
                      <span className="text-xs font-medium text-slate-600">
                        {groupTotal.toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: groupItems[0].currency,
                        })}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3">
                      {groupItems.map((item) => (
                        <CartItemRow key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Réglés chez le prestataire : hors du paiement Stripe, pour ne
                  pas faire payer deux fois la même prestation. */}
              {selfBooked.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      À réserver vous-même
                    </span>
                  </div>
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-3">
                    {selfBooked.map((item) => (
                      <CartItemRow key={item.id} item={item} />
                    ))}
                  </div>
                  <p className="mt-2 px-1 text-[11px] leading-relaxed text-slate-400">
                    Ces prestations se règlent directement sur le site du prestataire : elles ne
                    sont pas incluses dans le paiement ci-dessous.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {itemCount > 0 && (
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">
                Total à payer ici
              </span>
              <span className="font-display text-xl font-bold text-slate-900">
                {toPay.toLocaleString('fr-FR', { style: 'currency', currency: items[0].currency })}
              </span>
            </div>
            {error && (
              <p className="text-center text-xs text-red-500">{error}</p>
            )}
            <p className="text-center text-[11px] text-slate-400">
              {canPay
                ? 'Un seul paiement · vols et hôtels réservés automatiquement'
                : 'Rien à payer ici : utilisez les liens de réservation ci-dessus'}
            </p>
            <Button
              className="w-full rounded-full bg-gradient-to-r from-brand-coral to-brand-sun py-6 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              onClick={handleCheckout}
              disabled={loading || !canPay}
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
