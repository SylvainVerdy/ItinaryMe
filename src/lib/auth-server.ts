import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Vérification des jetons Firebase côté serveur.
 *
 * On valide la signature RS256 contre les certificats publics de Google plutôt
 * que d'installer `firebase-admin` : cela évite une grosse dépendance et,
 * surtout, un compte de service à provisionner. Seul l'identifiant de projet
 * est nécessaire, et il est déjà public.
 *
 * Contrôles effectués : signature, émetteur, audience, expiration, sujet.
 * Non couvert (comme firebase-admin sans `checkRevoked`) : la révocation de
 * session côté Firebase.
 */

/** Surchargeable pour les tests ; en production, laisser la valeur par défaut. */
const CERT_URL =
  process.env.FIREBASE_CERT_URL ??
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let certCache: { keys: Record<string, string>; expiresAt: number } | null = null;

async function getGoogleCerts(): Promise<Record<string, string>> {
  if (certCache && certCache.expiresAt > Date.now()) return certCache.keys;

  const res = await fetch(CERT_URL);
  if (!res.ok) throw new Error(`Certificats Google indisponibles (${res.status})`);

  const keys = (await res.json()) as Record<string, string>;

  // Respecter le max-age renvoyé par Google plutôt qu'un TTL arbitraire :
  // les clés tournent régulièrement.
  const cacheControl = res.headers.get('cache-control') ?? '';
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] ?? 3600);

  certCache = { keys, expiresAt: Date.now() + maxAge * 1000 };
  return keys;
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export interface VerifiedUser {
  uid: string;
  email?: string;
}

/**
 * Vérifie un jeton d'identité Firebase. Renvoie `null` si le jeton est absent,
 * malformé, expiré ou signé par une clé inconnue.
 */
export async function verifyIdToken(token: string): Promise<VerifiedUser | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error('[AUTH] NEXT_PUBLIC_FIREBASE_PROJECT_ID manquant');
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; kid?: string };
  let payload: { iss?: string; aud?: string; exp?: number; sub?: string; email?: string };
  try {
    header = JSON.parse(base64UrlDecode(headerB64).toString('utf8'));
    payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8'));
  } catch {
    return null;
  }

  if (header.alg !== 'RS256' || !header.kid) return null;
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (payload.aud !== projectId) return null;
  if (!payload.sub) return null;
  if (!payload.exp || payload.exp * 1000 <= Date.now()) return null;

  try {
    const certs = await getGoogleCerts();
    const cert = certs[header.kid];
    if (!cert) return null;

    const ok = crypto.verify(
      'RSA-SHA256',
      Buffer.from(`${headerB64}.${payloadB64}`),
      crypto.createPublicKey(cert),
      base64UrlDecode(signatureB64),
    );
    if (!ok) return null;
  } catch (err) {
    console.error('[AUTH] vérification impossible:', err);
    return null;
  }

  return { uid: payload.sub, email: payload.email };
}

/**
 * Extrait et vérifie l'utilisateur d'une requête (en-tête
 * `Authorization: Bearer <idToken>`).
 */
export async function getUserFromRequest(req: NextRequest): Promise<VerifiedUser | null> {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return verifyIdToken(match[1].trim());
}

/**
 * Garde à placer en tête des routes sensibles.
 * Renvoie soit l'utilisateur, soit une réponse 401 déjà formée.
 */
export async function requireUser(
  req: NextRequest,
): Promise<{ user: VerifiedUser } | { response: NextResponse }> {
  const user = await getUserFromRequest(req);
  if (!user) {
    return {
      response: NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 },
      ),
    };
  }
  return { user };
}
