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
  /** Lien externe vers la marketplace. Absent pour les produits vendus ici. */
  bookingUrl?: string;
  /**
   * Produit réservable directement dans l'application (inventaire Bókun sous
   * contrat). Dans ce cas il n'y a pas de site tiers vers lequel renvoyer.
   */
  bookableInApp?: boolean;
  /** Absent quand la marketplace n'affiche pas le tarif dans les résultats. */
  price?: number;
  currency?: string;
  rating?: number;
  reviews?: number;
  thumbnail?: string;
  snippet?: string;
  city: string;
}
