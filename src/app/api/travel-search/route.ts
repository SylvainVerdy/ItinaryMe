import { NextRequest, NextResponse } from 'next/server';
// La vérification d'authentification est complètement supprimée pour les tests
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
import { SerpApiService } from '@/services/serpApiService';

export async function POST(req: NextRequest) {
  try {
    console.log("=== Début de la requête API travel-search ===");
    
    // Authentification désactivée pour les tests
    // const session = await getServerSession(authOptions);
    // if (!session || !session.user) {
    //   return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    // }

    // Extraire les paramètres de la requête
    const body = await req.json();
    console.log("Paramètres reçus:", JSON.stringify(body));
    
    const { searchType, params } = body;

    // Vérifier les paramètres obligatoires
    if (!searchType || !params) {
      console.log("Erreur: Paramètres manquants");
      return NextResponse.json(
        { error: 'Paramètres manquants: searchType et params sont requis' },
        { status: 400 }
      );
    }

    let result;

    // Effectuer la recherche en fonction du type
    try {
      console.log(`Recherche de type: ${searchType}`);
      
      switch (searchType) {
        case 'flights':
          if (!params.origin || !params.destination) {
            console.log("Erreur: Paramètres de vol manquants");
            return NextResponse.json(
              { error: 'Les paramètres origin et destination sont requis pour la recherche de vols' },
              { status: 400 }
            );
          }
          console.log(`Recherche de vols de ${params.origin} à ${params.destination}`);
          result = await SerpApiService.searchFlights(
            params.origin,
            params.destination,
            params.date,
            params.returnDate,
            params.passengers
          );
          break;

        case 'hotels':
          if (!params.location) {
            console.log("Erreur: Paramètre de localisation manquant");
            return NextResponse.json(
              { error: 'Le paramètre location est requis pour la recherche d\'hôtels' },
              { status: 400 }
            );
          }
          console.log(`Recherche d'hôtels à ${params.location}`);
          result = await SerpApiService.searchHotels(
            params.location,
            params.checkIn,
            params.checkOut,
            params.persons
          );
          break;

        case 'restaurants':
          if (!params.location) {
            console.log("Erreur: Paramètre de localisation manquant");
            return NextResponse.json(
              { error: 'Le paramètre location est requis pour la recherche de restaurants' },
              { status: 400 }
            );
          }
          console.log(`Recherche de restaurants à ${params.location}`);
          // Pour les restaurants, nous utilisons toujours des données mockées
          result = {
            location: params.location,
            cuisine: params.cuisine || "Française",
            options: [
              {
                name: "Le Gourmet",
                priceRange: params.priceRange || "$$",
                rating: "4.2/5",
                cuisine: params.cuisine || "Française",
                address: "123 Rue Principale",
                link: "#"
              },
              {
                name: "La Brasserie Parisienne",
                priceRange: params.priceRange || "$$$",
                rating: "4.5/5",
                cuisine: params.cuisine || "Française",
                address: "45 Avenue des Champs",
                link: "#"
              },
              {
                name: "Le Petit Bistro",
                priceRange: params.priceRange || "$",
                rating: "4.0/5",
                cuisine: params.cuisine || "Française",
                address: "78 Rue du Commerce",
                link: "#"
              }
            ],
            bestOption: {
              name: "La Brasserie Parisienne",
              rating: "4.5/5",
              priceRange: params.priceRange || "$$$"
            }
          };
          break;

        default:
          console.log(`Type de recherche non pris en charge: ${searchType}`);
          return NextResponse.json(
            { error: `Type de recherche non pris en charge: ${searchType}` },
            { status: 400 }
          );
      }

      console.log("Recherche réussie");
      
      // Retourner les résultats
      return NextResponse.json({ success: true, result });
    } catch (searchError: any) {
      console.error("Erreur pendant la recherche:", searchError);
      return NextResponse.json(
        { error: `Erreur pendant la recherche: ${searchError.message || searchError}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Erreur globale de l\'API:', error);
    return NextResponse.json(
      { error: `Erreur lors de la recherche: ${error.message || error}` },
      { status: 500 }
    );
  }
}

// Endpoint GET pour vérifier que l'API est disponible
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    info: 'API de recherche de voyage disponible',
    supportedSearchTypes: ['flights', 'hotels', 'restaurants'],
  });
} 