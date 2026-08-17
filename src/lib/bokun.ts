import crypto from 'crypto';

/**
 * Client Bókun (Tripadvisor).
 *
 * Authentification maison : chaque requête est signée en HMAC-SHA1 sur la
 * concaténation `date + accessKey + méthode + chemin`, le résultat étant encodé
 * en base64 et transmis dans `X-Bokun-Signature`.
 *
 * Le chemin signé doit inclure la query string, sinon la signature est rejetée.
 */

const DEFAULT_BASE = 'https://api.bokuntest.com'; // bac à sable

export function isBokunConfigured(): boolean {
  return Boolean(process.env.BOKUN_ACCESS_KEY && process.env.BOKUN_SECRET_KEY);
}

/** Date UTC au format attendu par Bókun : « YYYY-MM-DD HH:mm:ss ». */
function bokunDate(now = new Date()): string {
  return now.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

function sign(secret: string, payload: string): string {
  return crypto.createHmac('sha1', secret).update(payload, 'utf8').digest('base64');
}

/**
 * Appel signé à l'API Bókun.
 * `path` doit commencer par « / » et contenir la query string éventuelle.
 * Lève en cas d'erreur HTTP : l'appelant décide de la stratégie de repli.
 */
export async function bokunRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  timeoutMs = 15_000,
): Promise<T> {
  const accessKey = process.env.BOKUN_ACCESS_KEY;
  const secretKey = process.env.BOKUN_SECRET_KEY;
  if (!accessKey || !secretKey) throw new Error('Bókun non configuré');

  const base = process.env.BOKUN_BASE_URL ?? DEFAULT_BASE;
  const date = bokunDate();
  const signature = sign(secretKey, `${date}${accessKey}${method}${path}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${base}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;charset=UTF-8',
        'X-Bokun-AccessKey': accessKey,
        'X-Bokun-Date': date,
        'X-Bokun-Signature': signature,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Bókun HTTP ${res.status} ${detail.slice(0, 200)}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
