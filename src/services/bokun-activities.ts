import { bokunRequest, isBokunConfigured } from '@/lib/bokun';
import { ActivityOffer } from '@/types/activity-offer';

/**
 * Sous-ensemble de la réponse `/activity.json/search` qui nous intéresse.
 * Tous les champs sont optionnels : le schéma varie selon la configuration du
 * compte et les produits, donc on ne suppose rien.
 */
interface BokunActivity {
  id?: number | string;
  title?: string;
  excerpt?: string;
  description?: string;
  photos?: Array<{ originalUrl?: string; derived?: Array<{ url?: string }> }>;
  keyPhoto?: { originalUrl?: string; derived?: Array<{ url?: string }> };
  nextDefaultPrice?: number;
  nextDefaultPriceMoney?: { amount?: number; currency?: string };
  reviewCount?: number;
  rating?: number;
  googlePlace?: { city?: string };
}

interface BokunSearchResponse {
  items?: BokunActivity[];
  results?: BokunActivity[];
  totalHits?: number;
}

function firstPhoto(a: BokunActivity): string | undefined {
  const source = a.keyPhoto ?? a.photos?.[0];
  return source?.derived?.[0]?.url ?? source?.originalUrl;
}

/**
 * Active la vente d'un produit Bókun depuis notre propre interface.
 * Dans le modèle marketplace, c'est le revendeur qui encaisse le client : ces
 * activités sont donc réellement facturables via Stripe, contrairement aux
 * résultats SerpAPI qui renvoient vers le site du prestataire.
 *
 * Renvoie un tableau vide (jamais d'exception) si Bókun n'est pas configuré ou
 * répond en erreur : l'appelant enchaîne alors sur le repli SerpAPI.
 */
export async function searchBokunActivities(
  city: string,
  maxResults = 6,
  currency = 'EUR',
  lang = 'FR',
): Promise<ActivityOffer[]> {
  if (!isBokunConfigured()) {
    console.log('[BOKUN] identifiants absents — activités via SerpAPI uniquement');
    return [];
  }
  if (!city.trim()) return [];

  const path = `/activity.json/search?lang=${encodeURIComponent(lang)}&currency=${encodeURIComponent(currency)}`;

  try {
    const data = await bokunRequest<BokunSearchResponse>('POST', path, {
      textFilter: city,
      page: 1,
      pageSize: Math.max(maxResults, 10),
    });

    const items = data.items ?? data.results ?? [];
    const offers: ActivityOffer[] = [];

    for (const a of items) {
      if (offers.length >= maxResults) break;
      if (!a.id || !a.title) continue;

      const amount = a.nextDefaultPriceMoney?.amount ?? a.nextDefaultPrice;

      offers.push({
        activityId: `bokun_${a.id}`,
        name: a.title,
        provider: 'bokun',
        // Vendu par nos soins : pas de lien externe, la carte proposera
        // directement l'ajout au panier.
        bookableInApp: true,
        price: typeof amount === 'number' && amount > 0 ? amount : undefined,
        currency: a.nextDefaultPriceMoney?.currency ?? currency,
        rating: typeof a.rating === 'number' ? a.rating : undefined,
        reviews: typeof a.reviewCount === 'number' ? a.reviewCount : undefined,
        thumbnail: firstPhoto(a),
        snippet: a.excerpt ?? a.description,
        city: a.googlePlace?.city ?? city,
      });
    }

    console.log(`[BOKUN] ${offers.length} activité(s) pour "${city}"`);
    return offers;
  } catch (err) {
    console.warn(`[BOKUN] recherche impossible pour "${city}": ${(err as Error).message}`);
    return [];
  }
}
