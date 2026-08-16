import duffel from '@/lib/duffel';

export interface ResolvedPlace {
  /** Code IATA à utiliser pour la recherche de vols. */
  iata: string;
  lat: number;
  lng: number;
  /** Libellé renvoyé par Duffel, utile pour confirmer à l'utilisateur. */
  name: string;
  countryCode: string;
}

/**
 * Cache mémoire : la résolution d'un nom de ville ne change pas d'une requête à
 * l'autre, et l'agent appelle souvent les mêmes villes dans une conversation.
 * (Process-local : réinitialisé à chaque redémarrage, ce qui suffit ici.)
 */
const cache = new Map<string, ResolvedPlace | null>();

/**
 * Résout un nom de lieu libre ("nice", "Barcelone", "New York") en aéroport
 * via l'API Places de Duffel.
 *
 * Remplace la table de villes codée en dur : celle-ci ne couvrait qu'une
 * cinquantaine de villes, uniquement sous leur graphie anglaise.
 */
export async function resolvePlace(query: string): Promise<ResolvedPlace | null> {
  const key = query.toLowerCase().trim();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  let resolved: ResolvedPlace | null = null;

  try {
    // Le SDK type aussi `name`, mais l'API le rejette (422 « Invalid fields
    // sets ») : seul `query` est accepté côté serveur.
    const res = await duffel.suggestions.list({ query: key });
    const places = res?.data ?? [];

    // Une ville couvre tous ses aéroports (CDG + ORY pour Paris) : on la
    // préfère quand elle porte un code IATA, sinon on prend l'aéroport.
    const city = places.find((p) => p.type === 'city' && p.iata_code);
    const airport = places.find((p) => p.iata_code);
    const chosen = city ?? airport;

    if (chosen?.iata_code) {
      // Les villes n'ont pas toujours de coordonnées : on retombe sur celles
      // de leur premier aéroport, nécessaires à la recherche d'hôtels.
      const fallbackAirport = chosen.airports?.find(
        (a) => a.latitude != null && a.longitude != null,
      );
      const lat = chosen.latitude ?? fallbackAirport?.latitude ?? null;
      const lng = chosen.longitude ?? fallbackAirport?.longitude ?? null;

      if (lat != null && lng != null) {
        resolved = {
          iata: chosen.iata_code,
          lat,
          lng,
          name: chosen.name,
          countryCode: chosen.iata_country_code,
        };
      }
    }
  } catch (err) {
    console.error(`[PLACES] résolution impossible pour "${query}":`, err);
    // On ne met pas l'échec en cache : une panne réseau ne doit pas
    // condamner la ville pour toute la durée du process.
    return null;
  }

  cache.set(key, resolved);
  return resolved;
}
