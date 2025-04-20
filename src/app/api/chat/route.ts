import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
const authOptions = { providers: [] };

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Vérification de l'authentification (désactivée temporairement)
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    // }

    const body = await req.json();
    const { model, prompt, temperature = 0.7, maxTokens = 2048 } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Le paramètre prompt est requis' },
        { status: 400 }
      );
    }

    // URL de l'API Ollama
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    
    // Modèle Ollama par défaut
    const ollamaModel = model || process.env.OLLAMA_MODEL || 'mlaprise/gemma-3-4b-it-qat-q4_0-gguf';

    console.log(`[API CHAT] Appel à Ollama: ${ollamaUrl}/api/generate, modèle: ${ollamaModel}`);
    
    try {
      // Appel à l'API Ollama
      const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: prompt,
          temperature: temperature,
          stream: false,
          options: {
            num_predict: maxTokens
          }
        })
      });

      if (!ollamaResponse.ok) {
        const errorText = await ollamaResponse.text();
        console.error(`[API CHAT] Erreur Ollama (${ollamaResponse.status}): ${errorText}`);
        return NextResponse.json(
          { error: `Erreur de l'API Ollama: ${ollamaResponse.statusText}` },
          { status: ollamaResponse.status }
        );
      }

      const data = await ollamaResponse.json();
      console.log(`[API CHAT] Réponse reçue de Ollama (${data.response?.length || 0} caractères)`);

      return NextResponse.json({
        content: data.response,
        model: ollamaModel
      });
    } catch (error) {
      console.error('[API CHAT] Erreur lors de l\'appel à Ollama:', error);
      return NextResponse.json(
        { 
          error: 'Erreur lors de l\'appel à Ollama',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API CHAT] Erreur globale:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 