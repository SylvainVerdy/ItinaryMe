import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SearchService } from '@/ai/searchService';

export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer les paramètres de recherche
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');
    const type = searchParams.get('type');

    // Validation
    if (!query) {
      return NextResponse.json({ error: 'Paramètre de recherche requis' }, { status: 400 });
    }

    // Créer une instance du service de recherche
    const searchService = new SearchService();

    // Effectuer la recherche en fonction du type
    let result;
    switch (type) {
      case 'hotels':
        const destination = searchParams.get('destination') || query;
        const checkIn = searchParams.get('checkIn');
        const checkOut = searchParams.get('checkOut');
        result = await searchService.searchHotels(destination, checkIn || undefined, checkOut || undefined);
        break;
      
      case 'flights':
        const origin = searchParams.get('origin');
        const dest = searchParams.get('destination') || query;
        const departDate = searchParams.get('departDate');
        const returnDate = searchParams.get('returnDate');
        
        if (!origin) {
          return NextResponse.json({ error: 'Origine requise pour la recherche de vols' }, { status: 400 });
        }
        
        result = await searchService.searchFlights(origin, dest, departDate || undefined, returnDate || undefined);
        break;
      
      case 'activities':
        result = await searchService.searchActivities(query);
        break;
      
      case 'travel':
        const dates = searchParams.get('dates');
        result = await searchService.searchTravelInfo(query, dates || undefined);
        break;
      
      default:
        // Recherche générique
        result = await searchService.search({
          q: query,
          num: parseInt(searchParams.get('num') || '10'),
          hl: searchParams.get('hl') || 'fr',
          gl: searchParams.get('gl') || 'fr'
        });
    }

    // Retourner les résultats
    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 