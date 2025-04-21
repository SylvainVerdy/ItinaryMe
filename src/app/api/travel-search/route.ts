import { NextRequest, NextResponse } from 'next/server';
import TravelSearchClient from '@/ai/clients/TravelSearchClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Créer un client singleton pour éviter de multiples connexions
let travelSearchClient: TravelSearchClient | null = null;

function getTravelSearchClient() {
  if (!travelSearchClient) {
    const serverUrl = process.env.MCP_SERVER_URL || 'http://localhost:3300';
    travelSearchClient = new TravelSearchClient(serverUrl);
  }
  return travelSearchClient;
}

export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Extraire les paramètres de la requête
    const { searchType, params } = await req.json();

    // Vérifier les paramètres obligatoires
    if (!searchType || !params) {
      return NextResponse.json(
        { error: 'Paramètres manquants: searchType et params sont requis' },
        { status: 400 }
      );
    }

    // Obtenir le client de recherche
    const client = getTravelSearchClient();
    let result;

    // Effectuer la recherche en fonction du type
    switch (searchType) {
      case 'flights':
        if (!params.origin || !params.destination) {
          return NextResponse.json(
            { error: 'Les paramètres origin et destination sont requis pour la recherche de vols' },
            { status: 400 }
          );
        }
        result = await client.searchFlights(
          params.origin,
          params.destination,
          params.date,
          params.passengers
        );
        break;

      case 'hotels':
        if (!params.location) {
          return NextResponse.json(
            { error: 'Le paramètre location est requis pour la recherche d\'hôtels' },
            { status: 400 }
          );
        }
        result = await client.searchHotels(
          params.location,
          params.checkIn,
          params.checkOut,
          params.persons,
          params.priceRange
        );
        break;

      case 'restaurants':
        if (!params.location) {
          return NextResponse.json(
            { error: 'Le paramètre location est requis pour la recherche de restaurants' },
            { status: 400 }
          );
        }
        result = await client.searchRestaurants(
          params.location,
          params.cuisine,
          params.priceRange,
          params.rating
        );
        break;

      default:
        return NextResponse.json(
          { error: `Type de recherche non pris en charge: ${searchType}` },
          { status: 400 }
        );
    }

    // Retourner les résultats
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Erreur lors de la recherche de voyage:', error);
    return NextResponse.json(
      { error: `Erreur lors de la recherche: ${error}` },
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