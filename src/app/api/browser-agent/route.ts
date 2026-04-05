import { NextRequest, NextResponse } from 'next/server';
import { WebBrowserAgent } from '@/ai/agents/web-browser-agent';

// Stocker l'instance de l'agent entre les requêtes (en production, utilisez une solution plus robuste)
let browserAgent: WebBrowserAgent | null = null;

export async function POST(request: NextRequest) {
  try {
    const { action, url, task, selector, text, options } = await request.json();

    // Initialiser l'agent si ce n'est pas déjà fait
    if (!browserAgent && action !== 'init') {
      browserAgent = new WebBrowserAgent();
      await browserAgent.init();
    }

    let result;

    switch (action) {
      case 'init':
        // Fermer l'agent précédent s'il existe
        if (browserAgent) {
          await browserAgent.close();
        }
        
        // Créer un nouvel agent avec les options fournies
        browserAgent = new WebBrowserAgent(options || {});
        await browserAgent.init();
        result = { status: 'initialized' };
        break;

      case 'navigate':
        if (!url) {
          return NextResponse.json({ error: 'URL requise' }, { status: 400 });
        }
        await browserAgent!.navigateTo(url);
        result = { status: 'navigated', url };
        break;

      case 'extract':
        const content = await browserAgent!.extractPageContent();
        result = { content };
        break;

      case 'analyze':
        const analysis = await browserAgent!.analyzePageContent();
        result = { analysis };
        break;

      case 'screenshot':
        // Générer un nom de fichier unique basé sur l'horodatage
        const filename = `screenshot-${Date.now()}.png`;
        const path = `./public/screenshots/${filename}`;
        await browserAgent!.takeScreenshot(path);
        result = { screenshot: `/screenshots/${filename}` };
        break;

      case 'executeTask':
        if (!task) {
          return NextResponse.json({ error: 'Tâche requise' }, { status: 400 });
        }
        const taskResult = await browserAgent!.executeTask(task);
        result = { result: taskResult };
        break;

      case 'click':
        if (!selector) {
          return NextResponse.json({ error: 'Sélecteur requis' }, { status: 400 });
        }
        await browserAgent!.clickElement(selector);
        result = { status: 'clicked', selector };
        break;

      case 'fill':
        if (!selector || text === undefined) {
          return NextResponse.json({ error: 'Sélecteur et texte requis' }, { status: 400 });
        }
        await browserAgent!.fillInput(selector, text);
        result = { status: 'filled', selector };
        break;

      case 'close':
        if (browserAgent) {
          await browserAgent.close();
          browserAgent = null;
        }
        result = { status: 'closed' };
        break;

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur de l'agent de navigation:", error);
    
    // Tenter de fermer le navigateur en cas d'erreur pour éviter les ressources zombies
    if (browserAgent) {
      try {
        await browserAgent.close();
        browserAgent = null;
      } catch (closeError) {
        console.error('Erreur lors de la fermeture du navigateur:', closeError);
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
} 