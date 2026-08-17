import { Duffel } from '@duffel/api';

/**
 * Client Duffel à initialisation paresseuse, pour la même raison que Stripe :
 * une instanciation au chargement du module fait échouer le build dès que
 * DUFFEL_ACCESS_TOKEN est absent de l'environnement.
 */
let client: Duffel | null = null;

function getDuffel(): Duffel {
  if (client) return client;

  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'DUFFEL_ACCESS_TOKEN manquant : la recherche de vols et hôtels est ' +
        "indisponible. Ajoutez-le aux variables d'environnement.",
    );
  }

  client = new Duffel({ token });
  return client;
}

const duffel = new Proxy({} as Duffel, {
  get(_target, prop, receiver) {
    const instance = getDuffel() as unknown as Record<string | symbol, unknown>;
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export default duffel;
