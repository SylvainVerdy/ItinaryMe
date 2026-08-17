import { CartItem, CartItemType } from '@/types/cart';

/**
 * Types que l'application réserve et encaisse elle-même (via Duffel).
 *
 * Les activités et restaurants n'ont pas d'API de réservation ici : ils se
 * paient chez le prestataire. Les inclure dans le paiement Stripe reviendrait
 * à les facturer deux fois — une fois chez nous, une fois sur GetYourGuide.
 */
export const PAYABLE_TYPES: CartItemType[] = ['flight', 'hotel'];

/** L'article est-il réservé et encaissé par l'application ? */
export function isPayable(item: Pick<CartItem, 'type'>): boolean {
  return PAYABLE_TYPES.includes(item.type);
}

/** Articles facturés par Stripe. */
export function payableItems(items: CartItem[]): CartItem[] {
  return items.filter(isPayable);
}

/** Articles à réserver soi-même auprès du prestataire. */
export function selfBookedItems(items: CartItem[]): CartItem[] {
  return items.filter((i) => !isPayable(i));
}

/** Montant réellement débité : uniquement les articles réservables ici. */
export function payableTotal(items: CartItem[]): number {
  return payableItems(items).reduce((sum, i) => sum + i.price, 0);
}
