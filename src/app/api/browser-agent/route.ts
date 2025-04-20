import { NextRequest, NextResponse } from 'next/server';
import { BrowserAgent } from '@/ai/browserAgent';
import { getServerSession } from 'next-auth';
// Créer un remplacement temporaire pour éviter l'erreur d'importation
// import { authOptions } from '@/lib/auth';
const authOptions = {
  providers: [],
};

// S'assurer que la clé SerpAPI est définie dans l'environnement
if (!process.env.SERPAPI_API_KEY) {
  process.env.SERPAPI_API_KEY = '46ceae7f12b92954fc5bd8f0834cd0b797b6ea2542b343748874f9987c92f7f8';
}

export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification (désactivé temporairement en développement)
    if (process.env.NODE_ENV === 'production') {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
      }
    }

    // Récupérer les paramètres
    const body = await req.json();
    const { task, model, maxSteps, debug, userQuery, tripDetails } = body;

    // Validation
    if (!task && !userQuery) {
      return NextResponse.json({ error: 'La tâche ou la requête est requise' }, { status: 400 });
    }

    // Créer et exécuter l'agent
    const browserAgent = new BrowserAgent({
      task,
      model,
      maxSteps,
      debug: debug || false,
      userQuery,
      tripDetails
    });

    // Exécuter la tâche ou la recherche
    const result = userQuery 
      ? await browserAgent.searchWeb(userQuery, model)
      : await browserAgent.executeTask();

    // Conversion des chemins d'image en URLs ou en données base64
    const imageData = await Promise.all(
      (result.screenshots || []).map(async (screenshot) => {
        // Dans un cas réel, vous voudriez peut-être stocker ces images dans un stockage comme S3
        // et renvoyer des URL, mais pour la démonstration, nous utilisons base64
        try {
          const fs = require('fs');
          const data = fs.readFileSync(screenshot);
          const base64 = Buffer.from(data).toString('base64');
          const extension = screenshot.split('.').pop()?.toLowerCase() || 'png';
          return `data:image/${extension === 'jpg' ? 'jpeg' : extension};base64,${base64}`;
        } catch (e) {
          console.error(`Erreur lors de la lecture de l'image ${screenshot}:`, e);
          return null;
        }
      })
    );

    // Filtrer les images nulles
    const validImages = imageData.filter(Boolean);

    // Retourner le résultat
    return NextResponse.json({
      ...result,
      screenshots: validImages
    });
  } catch (error) {
    console.error('Erreur lors du traitement de la requête browser-agent:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 