import { auth } from '@/lib/firebase';

/**
 * `fetch` authentifié : attache le jeton d'identité Firebase de l'utilisateur
 * courant en `Authorization: Bearer …`.
 *
 * À utiliser pour toutes les routes protégées par `requireUser`.
 * Le SDK Firebase rafraîchit le jeton automatiquement s'il est expiré.
 */
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Vous devez être connecté pour effectuer cette action.');
  }

  const token = await user.getIdToken();

  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}
