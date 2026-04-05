import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createBookingJob } from '@/lib/booking-jobs';
import Stripe from 'stripe';

// Disable body parsing — Stripe needs the raw body to verify the signature
export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { tripId, itemsData } = session.metadata ?? {};

    if (itemsData) {
      const rawItems: {
        id: string;
        name: string;
        type: string;
        price?: number;
        currency?: string;
        offerId?: string;
        passengerIds?: string[];
        rateId?: string;
        sourceUrl?: string;
      }[] = JSON.parse(itemsData);

      await createBookingJob({
        stripeSessionId: session.id,
        tripId: tripId ?? '',
        items: rawItems.map((i) => ({
          id: i.id,
          name: i.name,
          type: i.type,
          price: i.price,
          currency: i.currency,
          offerId: i.offerId || undefined,
          passengerIds: i.passengerIds?.length ? i.passengerIds : undefined,
          rateId: i.rateId || undefined,
          sourceUrl: i.sourceUrl || undefined,
        })),
        status: 'pending',
        results: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ received: true });
}
