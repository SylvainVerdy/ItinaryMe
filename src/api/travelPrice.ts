import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { travelService } from '@/services/travelService';
import { TravelPriceService } from '@/ai/services/travelPriceService';

// Clés API et configuration
const SERP_API_KEY = process.env.SERP_API_KEY || '';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'Créer un voyage à Rome du 15/04/2024 au 20/04/2024 pour 2 personnes';

// Service d'analyse de prix
const priceService = new TravelPriceService(
  SERP_API_KEY,
  OLLAMA_URL,
  OLLAMA_MODEL
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Vérifier l'authentification
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  
  // Vérifier la méthode
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  
  try {
    const { travelId } = req.body;
    
    if (!travelId) {
      return res.status(400).json({ error: 'ID de voyage requis' });
    }
    
    // Récupérer les détails du voyage
    const travel = await travelService.getTravelById(travelId);
    
    if (!travel) {
      return res.status(404).json({ error: 'Voyage non trouvé' });
    }
    
    // Vérifier que l'utilisateur est le propriétaire du voyage
    if (travel.userId !== session.user.id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    
    // Analyser les prix
    const priceAnalysis = await priceService.analyzeTravelPrices(travel);
    
    // Renvoyer les résultats
    res.status(200).json(priceAnalysis);
    
  } catch (error: any) {
    console.error('Erreur lors de l\'analyse des prix:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'analyse des prix', 
      message: error.message || 'Une erreur est survenue' 
    });
  }
}