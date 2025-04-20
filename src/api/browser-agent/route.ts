import { NextRequest, NextResponse } from 'next/server';
import { BrowserAgent } from '../../ai/browserAgent';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    // Récupérer les paramètres de la requête
    const body = await req.json();
    const { task, model, maxSteps, debug, userQuery, tripDetails } = body;

    // Vérifier que les paramètres minimaux sont présents
    if (!task && !userQuery) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Paramètre 'task' ou 'userQuery' manquant" 
        }, 
        { status: 400 }
      );
    }

    // Instantier l'agent de navigateur
    const browserAgent = new BrowserAgent({
      task,
      model,
      maxSteps,
      debug,
      userQuery,
      tripDetails
    });

    // Exécuter la tâche demandée
    let result;
    
    if (userQuery) {
      // Si une requête de recherche est spécifiée, utiliser searchWeb
      result = await browserAgent.searchWeb(userQuery, model);
    } else {
      // Sinon, exécuter la tâche générique
      result = await browserAgent.executeTask();
    }

    // Retourner le résultat
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur lors de l'exécution de l'agent de navigateur:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Une erreur s'est produite lors de l'exécution de l'agent de navigateur",
        error: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
} 