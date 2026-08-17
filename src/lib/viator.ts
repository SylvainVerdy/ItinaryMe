/**
 * Client Viator Partner API.
 *
 * Authentification par simple en-tête `exp-api-key` (pas de signature).
 * La langue se pilote par appel via `Accept-Language`, et la version de l'API
 * via `Accept: application/json;version=2.0`.
 *
 * Base par défaut : le bac à sable. Passer BASE_URL en production une fois la
 * clé de production obtenue.
 */

const DEFAULT_BASE = 'https://api.sandbox.viator.com/partner';
const API_VERSION = '2.0';

export function isViatorConfigured(): boolean {
  return Boolean(process.env.VIATOR_API_KEY);
}

export async function viatorRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  lang = 'fr-FR',
  timeoutMs = 15_000,
): Promise<T> {
  const key = process.env.VIATOR_API_KEY;
  if (!key) throw new Error('Viator non configuré');

  const base = process.env.VIATOR_BASE_URL ?? DEFAULT_BASE;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${base}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        'exp-api-key': key,
        Accept: `application/json;version=${API_VERSION}`,
        'Accept-Language': lang,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Viator HTTP ${res.status} ${detail.slice(0, 200)}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
