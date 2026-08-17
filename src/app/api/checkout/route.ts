import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { CartItem } from '@/types/cart';
import { payableItems } from '@/lib/cart-rules';
import { requireUser } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;

  const { items, tripId }: { items: CartItem[]; tripId: string | null } = await req.json();

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:9000';

  // On ne facture que ce que l'application réserve elle-même. Les activités et
  // restaurants se règlent chez le prestataire : les inclure ici ferait payer
  // deux fois le client.
  const toCharge = payableItems(items);

  if (toCharge.length === 0) {
    return NextResponse.json(
      {
        error:
          "Votre panier ne contient que des éléments à réserver directement auprès du prestataire. Utilisez leurs liens de réservation.",
      },
      { status: 400 },
    );
  }

  const lineItems = toCharge.map((item) => ({
    price_data: {
      currency: item.currency.toLowerCase(),
      product_data: {
        name: item.name,
        description: buildDescription(item),
        metadata: {
          type: item.type,
          ...(item.sourceUrl ? { sourceUrl: item.sourceUrl } : {}),
        },
      },
      unit_amount: Math.round(item.price * 100), // Stripe expects cents
    },
    quantity: 1,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/payment/cancel`,
    metadata: {
      userId: auth.user.uid,
      tripId: tripId ?? '',
      itemCount: String(items.length),
      // Store source URLs so the webhook can trigger Puppeteer checkout
      itemsData: JSON.stringify(
        items.map((i) => ({
          id: i.id,
          name: i.name,
          type: i.type,
          price: i.price,
          currency: i.currency,
          offerId: i.offerId ?? '',
          passengerIds: i.passengerIds ?? [],
          rateId: i.rateId ?? '',
          sourceUrl: i.sourceUrl ?? '',
        })),
      ),
    },
  });

  return NextResponse.json({ url: session.url });
}

function buildDescription(item: CartItem): string {
  if (item.type === 'hotel' && item.checkIn && item.checkOut) {
    return `${item.location} · ${item.checkIn} → ${item.checkOut}${item.nights ? ` (${item.nights} nuits)` : ''}`;
  }
  if (item.type === 'flight' && item.origin && item.destination) {
    return `${item.origin} → ${item.destination} · ${item.departureDate ?? ''}`;
  }
  if (item.date) return `${item.location} · ${item.date}${item.time ? ` à ${item.time}` : ''}`;
  return item.location;
}
