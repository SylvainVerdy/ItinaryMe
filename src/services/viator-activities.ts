import { viatorRequest, isViatorConfigured } from '@/lib/viator';
import { ActivityOffer } from '@/types/activity-offer';

/** Entrée du référentiel `/destinations`. */
interface ViatorDestination {
  destinationId?: number;
  name?: string;
  type?: string;
}

/** Produit renvoyé par `/products/search`. Tout est optionnel par prudence. */
interface ViatorProduct {
  productCode?: string;
  title?: string;
  description?: string;
  productUrl?: string;
  images?: Array<{ variants?: Array<{ url?: string; height?: number }> }>;
  reviews?: { combinedAverageRating?: number; totalReviews?: number };
  pricing?: { summary?: { fromPrice?: number }; currency?: string };
}

interface ProductSearchResponse {
  products?: ViatorProduct[];
}

/**
 * Référentiel des destinations, chargé une fois puis gardé en mémoire.
 * Il pèse plusieurs milliers d'entrées : le recharger à chaque recherche
 * coûterait bien plus cher que la recherche elle-même.
 */
let destinationsCache: ViatorDestination[] | null = null;

async function loadDestinations(): Promise<ViatorDestination[]> {
  if (destinationsCache) return destinationsCache;
  const data = await viatorRequest<{ destinations?: ViatorDestination[] }>(
    'GET',
    '/destinations',
  );
  destinationsCache = data.destinations ?? [];
  return destinationsCache;
}

function normalize(value: string): string {
  return value.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Trouve l'identifiant de destination correspondant à un nom de ville. */
async function findDestinationId(city: string): Promise<number | null> {
  const destinations = await loadDestinations();
  const target = normalize(city);

  // Correspondance exacte d'abord, puis préfixe : « Rome » ne doit pas
  // ramener « Rome, New York » avant l'italienne.
  const exact = destinations.find((d) => d.name && normalize(d.name) === target);
  if (exact?.destinationId) return exact.destinationId;

  const partial = destinations.find((d) => d.name && normalize(d.name).startsWith(target));
  return partial?.destinationId ?? null;
}

function bestImage(p: ViatorProduct): string | undefined {
  const variants = p.images?.[0]?.variants ?? [];
  // Une variante de taille moyenne suffit pour une vignette de carte.
  const sorted = [...variants].sort((a, b) => (a.height ?? 0) - (b.height ?? 0));
  return sorted.find((v) => (v.height ?? 0) >= 200)?.url ?? sorted[sorted.length - 1]?.url;
}

/**
 * Activités Viator pour une ville.
 *
 * Le client réserve et paie sur viator.com (niveau Basic Access) : les offres
 * portent donc un lien externe et restent hors du paiement Stripe, comme les
 * résultats SerpAPI.
 *
 * Renvoie un tableau vide (jamais d'exception) si la clé manque ou si l'API
 * échoue : l'appelant enchaîne sur le repli SerpAPI.
 */
export async function searchViatorActivities(
  city: string,
  maxResults = 6,
  currency = 'EUR',
  lang = 'fr-FR',
): Promise<ActivityOffer[]> {
  if (!isViatorConfigured()) {
    console.log('[VIATOR] clé absente — activités via SerpAPI');
    return [];
  }
  if (!city.trim()) return [];

  try {
    const destinationId = await findDestinationId(city);
    if (!destinationId) {
      console.log(`[VIATOR] destination inconnue : "${city}"`);
      return [];
    }

    const data = await viatorRequest<ProductSearchResponse>(
      'POST',
      '/products/search',
      {
        filtering: { destination: String(destinationId) },
        pagination: { start: 1, count: Math.max(maxResults, 10) },
        currency,
      },
      lang,
    );

    const offers: ActivityOffer[] = [];

    for (const p of data.products ?? []) {
      if (offers.length >= maxResults) break;
      if (!p.productCode || !p.title || !p.productUrl) continue;

      const price = p.pricing?.summary?.fromPrice;

      offers.push({
        activityId: `viator_${p.productCode}`,
        name: p.title,
        provider: 'viator.com',
        bookingUrl: p.productUrl,
        price: typeof price === 'number' && price > 0 ? price : undefined,
        currency: p.pricing?.currency ?? currency,
        rating: p.reviews?.combinedAverageRating,
        reviews: p.reviews?.totalReviews,
        thumbnail: bestImage(p),
        snippet: p.description,
        city,
      });
    }

    console.log(`[VIATOR] ${offers.length} activité(s) pour "${city}"`);
    return offers;
  } catch (err) {
    console.warn(`[VIATOR] recherche impossible pour "${city}": ${(err as Error).message}`);
    return [];
  }
}
