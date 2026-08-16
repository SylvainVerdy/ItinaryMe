/**
 * Activité/excursion proposée par une marketplace (GetYourGuide, Viator…).
 *
 * Distinct de `Activity` (src/types/activity.ts), qui représente une étape déjà
 * placée dans l'itinéraire de l'utilisateur.
 */
export interface ActivityOffer {
  /** Identifiant stable dérivé de l'URL, pour le panier et les clés React. */
  activityId: string;
  name: string;
  /** Domaine de la marketplace, ex. « getyourguide.com ». */
  provider: string;
  bookingUrl: string;
  /** Absent quand la marketplace n'affiche pas le tarif dans les résultats. */
  price?: number;
  currency?: string;
  rating?: number;
  reviews?: number;
  thumbnail?: string;
  snippet?: string;
  city: string;
}
