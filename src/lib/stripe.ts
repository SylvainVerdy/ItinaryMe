import Stripe from 'stripe';

/**
 * Client Stripe à initialisation paresseuse.
 *
 * L'instancier au chargement du module fait échouer le build quand
 * STRIPE_SECRET_KEY est absente : Next importe les routes pour collecter les
 * métadonnées des pages, et le constructeur lève alors
 * « Neither apiKey nor config.authenticator provided ».
 *
 * Le proxy diffère la création au premier accès, donc au traitement d'une
 * requête — moment où la variable est réellement disponible.
 */
let client: Stripe | null = null;

function getStripe(): Stripe {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY manquante : le paiement est indisponible. ' +
        "Ajoutez-la aux variables d'environnement.",
    );
  }

  client = new Stripe(key, { apiVersion: '2025-03-31.basil' });
  return client;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const instance = getStripe() as unknown as Record<string | symbol, unknown>;
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
