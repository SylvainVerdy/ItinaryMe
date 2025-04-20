// Service d'automatisation du navigateur utilisant browser-use
// Basé sur https://github.com/browser-use/browser-use

// Importation conditionnelle pour supporter client et serveur
const isServer = typeof window === 'undefined';

// Importations côté serveur uniquement
let spawn: any;
let fs: any;
let path: any;

// N'importer ces modules que côté serveur
if (isServer) {
  spawn = require('child_process').spawn;
  fs = require('fs');
  path = require('path');
} else {
  // Mock pour le client
  console.log("BrowserAgent s'exécute en mode client (API)");
}

interface BrowserAgentOptions {
  task: string;
  model?: string;
  maxSteps?: number;
  debug?: boolean;
  userQuery?: string;
  tripDetails?: {
    destination?: string;
    startDate?: string;
    endDate?: string;
    travelers?: number;
  };
}

interface BrowserAgentResult {
  success: boolean;
  message: string;
  screenshots?: string[];
  error?: string;
  content?: string;
  links?: {name: string, url: string}[];
}

/**
 * Service qui permet de lancer des tâches d'automatisation de navigateur
 * en utilisant la bibliothèque browser-use
 */
export class BrowserAgent {
  private static tempDir = isServer ? path.join(process.cwd(), 'temp') : '/temp';
  private static scriptsDir = isServer ? path.join(process.cwd(), 'scripts') : '/scripts';
  private options: BrowserAgentOptions;

  constructor(options?: Partial<BrowserAgentOptions>) {
    this.options = {
      task: options?.task || "Recherche web",
      model: options?.model || 'mlaprise/gemma-3-4b-it-qat-q4_0-gguf',
      maxSteps: options?.maxSteps || 15,
      debug: options?.debug || false,
      userQuery: options?.userQuery || "",
      tripDetails: options?.tripDetails || {}
    };

    // S'assurer que les répertoires existent (côté serveur uniquement)
    if (isServer) {
      if (!fs.existsSync(BrowserAgent.tempDir)) {
        fs.mkdirSync(BrowserAgent.tempDir, { recursive: true });
      }
      if (!fs.existsSync(BrowserAgent.scriptsDir)) {
        fs.mkdirSync(BrowserAgent.scriptsDir, { recursive: true });
      }
    }
  }

  /**
   * Exécute une tâche d'automatisation via browser-use
   */
  public async executeTask(options?: BrowserAgentOptions): Promise<BrowserAgentResult> {
    // Fusionner les options du constructeur avec celles passées à la méthode
    const mergedOptions = { ...this.options, ...options };
    const { task, model = 'mlaprise/gemma-3-4b-it-qat-q4_0-gguf', maxSteps = 15, debug = false, userQuery, tripDetails } = mergedOptions;
    
    // En mode client, utiliser l'API au lieu d'exécuter le code directement
    if (!isServer) {
      return this.executeTaskViaAPI(mergedOptions);
    }
    
    // Le code suivant ne s'exécute que côté serveur
    // Créer un ID unique pour cette tâche
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const outputDir = path.join(BrowserAgent.tempDir, taskId);
    
    // Créer le répertoire pour les résultats
    fs.mkdirSync(outputDir, { recursive: true });
    
    // Créer le script Python qui utilisera browser-use
    const scriptPath = path.join(BrowserAgent.scriptsDir, `${taskId}.py`);
    
    // Générer un script différent selon qu'il s'agit d'une recherche web ou d'une autre tâche
    if (userQuery) {
      this.generateSearchScript(scriptPath, userQuery, model, outputDir, maxSteps, debug);
    } else {
      this.generatePythonScript(scriptPath, task, model, outputDir, maxSteps, debug);
    }
    
    try {
      // Exécuter le script Python
      const result = await this.runPythonScript(scriptPath);
      
      // Vérifier les résultats
      const screenshots = this.collectScreenshots(outputDir);
      
      // Récupérer le contenu analysé si disponible
      const contentPath = path.join(outputDir, 'search_results.txt');
      let content = '';
      let links: {name: string, url: string}[] = [];
      
      if (fs.existsSync(contentPath)) {
        content = fs.readFileSync(contentPath, 'utf-8');
        
        // Essayer de récupérer les liens s'ils existent
        const linksPath = path.join(outputDir, 'links.json');
        if (fs.existsSync(linksPath)) {
          try {
            links = JSON.parse(fs.readFileSync(linksPath, 'utf-8'));
          } catch (e) {
            console.error("Erreur lors de la lecture des liens:", e);
          }
        }
      }
      
      return {
        success: result.success,
        message: result.message,
        screenshots,
        content: content || undefined,
        links: links.length > 0 ? links : undefined
      };
    } catch (error) {
      console.error("Erreur lors de l'exécution de la tâche browser-use:", error);
      return {
        success: false,
        message: "Une erreur s'est produite lors de l'exécution de la tâche",
        error: error instanceof Error ? error.message : String(error)
      };
    } finally {
      // Nettoyage
      this.cleanup(scriptPath);
    }
  }

  /**
   * Exécute une tâche via l'API (utilisé en mode client)
   */
  private async executeTaskViaAPI(options: BrowserAgentOptions): Promise<BrowserAgentResult> {
    try {
      console.log("Exécution de la tâche via API:", options.userQuery || options.task);
      
      // Appel à l'API /api/browser-agent
      const response = await fetch('/api/browser-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: options.userQuery || options.task,
          model: options.model,
          maxSteps: options.maxSteps,
          debug: options.debug,
          tripDetails: options.tripDetails
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Erreur lors de l'appel à l'API browser-agent:", error);
      return {
        success: false,
        message: "Erreur lors de l'appel à l'API browser-agent",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Effectue une recherche web avec gestion automatique des cookies
   */
  public async searchWeb(query?: string, model: string = 'mlaprise/gemma-3-4b-it-qat-q4_0-gguf'): Promise<BrowserAgentResult> {
    return this.executeTask({
      task: "Recherche web",
      model,
      userQuery: query || this.options.userQuery || "",
      debug: false,
      maxSteps: 20,
      tripDetails: this.options.tripDetails
    });
  }

  // Les méthodes suivantes ne sont utilisées que côté serveur
  private generateSearchScript(
    scriptPath: string, 
    userQuery: string,
    model: string,
    outputDir: string,
    maxSteps: number,
    debug: boolean
  ): void {
    if (!isServer) return;
    
    const scriptContent = `
import os
import asyncio
import json
from browser_use import Agent
from langchain_ollama import ChatOllama
from dotenv import load_dotenv
load_dotenv()

# Désactiver les vérifications d'API
os.environ["BROWSER_USE_SKIP_LLM_API_KEY_VERIFICATION"] = "true"
os.environ["BROWSER_USE_DISABLE_CONNECTION_CHECK"] = "true"

async def accept_cookies(agent):
    """Fonction spécifique pour gérer l'acceptation des cookies sur différents sites"""
    try:
        print("🍪 Tentative d'acceptation des cookies...")
        
        # Attendre que la page soit complètement chargée
        await agent.page.waitForLoadState('networkidle', {'timeout': 10000})
        
        # Liste des sélecteurs courants pour les boutons d'acceptation de cookies
        cookie_selectors = [
            "button[id*='accept']", 
            "button[aria-label*='Accept']",
            "button[aria-label*='Accepter']",
            "button[title*='Accept']",
            "button[title*='Accepter']",
            "button.accept-cookies",
            "button.cookie-accept",
            "button[data-testid='cookie-policy-dialog-accept-button']",
            "#L2AGLb",  # Bouton spécifique à Google "J'accepte"
            "#W0wltc",  # Autre bouton sur Google
            "button.fc-button",  # Boutons sur certains bandeaux de cookies
            "[aria-label='Consent']",
            "button:has-text('Accepter')",
            "button:has-text('Accept')",
            "button:has-text('Agree')",
            "button:has-text('J\\'accepte')",
            "button:has-text('Accepter tout')",
            "button:has-text('Accept all')"
        ]
        
        # Essayer tous les sélecteurs jusqu'à en trouver un qui fonctionne
        for selector in cookie_selectors:
            try:
                if await agent.page.$(selector):
                    print(f"Bouton de cookies trouvé avec le sélecteur: {selector}")
                    await agent.page.click(selector, {'timeout': 2000})
                    print("✅ Cookies acceptés avec succès")
                    await asyncio.sleep(1)  # Attendre que le dialogue disparaisse
                    return True
            except Exception as e:
                if debug:
                    print(f"Sélecteur {selector} non trouvé ou non cliquable: {str(e)}")
                continue
        
        # Si aucun des sélecteurs courants n'a fonctionné, essayer de cliquer sur des éléments contenant certains textes
        try:
            # Essai de recherche textuelle
            await agent.page.click("text='Accepter'", {'timeout': 2000})
            print("✅ Cookies acceptés via recherche textuelle 'Accepter'")
            return True
        except:
            try:
                await agent.page.click("text='Accept'", {'timeout': 2000})
                print("✅ Cookies acceptés via recherche textuelle 'Accept'")
                return True
            except:
                try:
                    await agent.page.click("text='Agree'", {'timeout': 2000})
                    print("✅ Cookies acceptés via recherche textuelle 'Agree'")
                    return True
                except:
                    print("❌ Aucun bouton de cookies trouvé ou page sans dialogue de cookies")
                    return False
    except Exception as e:
        print(f"Erreur lors de la tentative d'acceptation des cookies: {str(e)}")
        return False

async def extract_search_results(agent):
    try:
        # Récupérer le contenu de la page
        page_content = await agent.page.evaluate('document.body.innerText')
        
        # Sauvegarder le contenu brut
        with open("${outputDir.replace(/\\/g, '\\\\')}/raw_content.txt", "w", encoding="utf-8") as f:
            f.write(page_content)
            
        # Demander au modèle d'analyser les résultats
        prompt = f"""
        Analyse les résultats de recherche Google suivants pour la requête "${userQuery.replace(/"/g, '\\"')}".
        
        La requête de l'utilisateur: "${userQuery.replace(/"/g, '\\"')}" est composée d'éléments d'information spécifiques qu'il faut considérer comme un ensemble cohérent et important.
        
        Contenu de la page:
        {page_content[:10000]}
        
        Extrais les informations suivantes:
        1. Résumé des principaux résultats (5 points maximum) qui répondent DIRECTEMENT à la requête originale
        2. Liens pertinents pour réserver des hôtels, restaurants ou activités (format JSON: [{"name": "nom", "url": "url"}])
        3. Informations pratiques utiles pour un voyageur en lien avec la requête
        
        IMPORTANT: Assure-toi que chaque information et lien fournis est en rapport direct avec TOUS les éléments de la requête originale: "${userQuery.replace(/"/g, '\\"')}"
        Ne perds jamais de vue les détails spécifiques de la requête initiale.
        
        Format ta réponse ainsi:
        
        ## RÉSUMÉ
        - Point 1
        - Point 2
        ...
        
        ## LIENS
        [{"name": "Nom du site", "url": "URL complète"}]
        
        ## INFORMATIONS PRATIQUES
        - Info 1
        - Info 2
        ...
        """
        
        # Demander au modèle d'analyser
        result = await agent.llm.ainvoke(prompt)
        
        # Sauvegarder le résultat analysé
        with open("${outputDir.replace(/\\/g, '\\\\')}/search_results.txt", "w", encoding="utf-8") as f:
            f.write(result)
            
        # Extraire les liens JSON
        import re
        links_match = re.search(r'## LIENS\\s*(\\[.*?\\])', result, re.DOTALL)
        if links_match:
            try:
                links_json = links_match.group(1)
                links = json.loads(links_json)
                # Sauvegarder les liens séparément
                with open("${outputDir.replace(/\\/g, '\\\\')}/links.json", "w", encoding="utf-8") as f:
                    json.dump(links, f, ensure_ascii=False)
            except Exception as e:
                print(f"Erreur lors de l'extraction des liens JSON: {e}")
                
        print("Analyse des résultats terminée avec succès")
    except Exception as e:
        print(f"Erreur lors de l'analyse des résultats: {e}")
        import traceback
        traceback.print_exc()

async def main():
    try:
        print(f"Recherche à effectuer: '${userQuery.replace(/'/g, "\\'")}'")
        
        # Configuration du modèle
        llm = ChatOllama(
            model="${model}",
            temperature=0.5,
            num_ctx=4096
        )
        
        # Force la vérification à True
        llm._verified_api_keys = True
        
        # Instructions détaillées avec priorisation de la gestion des cookies
        detailed_instructions = f"""
        Exécute les étapes suivantes avec précision:
        
        1. Ouvre un navigateur et accède à "https://www.google.com"
        
        2. IMPORTANT - Gestion des cookies et consentements:
           - Si une boîte de dialogue ou bannière de cookies apparaît, cherche et clique sur:
             * "Tout accepter", "J'accepte", "Accept all", "Accept", "Agree", ou termes similaires
             * Dans certains cas, le bouton peut être en bas à droite de l'écran
             * Sur Google, cherche un grand bouton bleu qui accepte les cookies, généralement étiqueté "J'accepte"
             * Si tu vois plusieurs options, clique toujours sur celle qui accepte tous les cookies
           - Si une pop up apparaît, clique sur la croix pour la fermer
           - Si tu ne peux pas trouver le bouton d'acceptation, essaie de cliquer sur le bouton principal/le plus visible
           - Une fois les cookies acceptés, vérifie que tu peux utiliser le site normalement
        
        3. Une fois sur Google sans dialogue de cookies, saisis EXACTEMENT et INTÉGRALEMENT cette requête utilisateur: "${userQuery.replace(/"/g, '\\"')}"
           - Ne modifie jamais la requête et n'oublie aucun élément de celle-ci
           - Chaque mot et chaque détail de la requête est important
           - L'utilisateur cherche précisément l'ensemble des informations contenues dans cette requête
        
        4. Analyse les résultats de recherche en gardant TOUJOURS à l'esprit la requête COMPLÈTE:
           - Garde constamment en mémoire TOUS LES ÉLÉMENTS de la requête originale
           - Concentre-toi sur les résultats qui répondent à l'ENSEMBLE des critères de la requête
           - Si les résultats ne semblent pas pertinents pour la requête complète, essaie d'explorer les 2-3 premiers liens des résultats
           - Ne perds jamais de vue la requête originale et ne la simplifie pas
           
        5. Lors de la collecte d'informations:
           - Vérifie que les informations trouvées correspondent bien à TOUS les aspects de la requête
           - Conserve des liens vers des sites officiels et fiables
           - Note les prix, disponibilités et options de réservation pertinents pour la requête spécifique
           - Collecte des informations précises qui répondent directement à la requête originale complète
        """
        
        # Création de l'agent avec instructions détaillées
        print("Création de l'agent browser-use...")
        agent = Agent(
            task=detailed_instructions,
            llm=llm,
        )
        
        # Exécution de l'agent
        print("Démarrage de l'agent...")
        await agent.run()
        
        # Tenter d'accepter les cookies après le chargement initial
        await accept_cookies(agent)
        
        # Analyser les résultats de recherche
        await extract_search_results(agent)
        
        print("Recherche terminée avec succès!")
    except Exception as e:
        print(f"Erreur: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
`;

    fs.writeFileSync(scriptPath, scriptContent);
  }

  private generatePythonScript(
    scriptPath: string, 
    task: string, 
    model: string,
    outputDir: string,
    maxSteps: number,
    debug: boolean
  ): void {
    if (!isServer) return;
    
    const scriptContent = `
from langchain_ollama import ChatOllama
from browser_use import Agent
import asyncio
import os
from dotenv import load_dotenv
load_dotenv()

# Configuration de SerpAPI pour la recherche web
os.environ["SERPAPI_API_KEY"] = "${process.env.SERPAPI_API_KEY || '46ceae7f12b92954fc5bd8f0834cd0b797b6ea2542b343748874f9987c92f7f8'}"

async def main():
    agent = Agent(
        task="${task.replace(/"/g, '\\"')}",
        llm=ChatOllama(model="${model}"),
    )
    await agent.run()

if __name__ == "__main__":
    asyncio.run(main())
`;

    fs.writeFileSync(scriptPath, scriptContent);
  }

  private runPythonScript(scriptPath: string): Promise<{ success: boolean; message: string }> {
    if (!isServer) {
      return Promise.resolve({ success: false, message: "Cette méthode n'est pas disponible côté client" });
    }
    
    return new Promise((resolve, reject) => {
      const process = spawn('python', [scriptPath]);
      
      let output = '';
      
      process.stdout.on('data', (data: Buffer | string) => {
        output += data.toString();
        console.log(`[Browser-Use] ${data.toString()}`);
      });
      
      process.stderr.on('data', (data: Buffer | string) => {
        console.error(`[Browser-Use Error] ${data.toString()}`);
      });
      
      process.on('close', (code: number | null) => {
        if (code === 0) {
          resolve({ 
            success: true, 
            message: "Tâche exécutée avec succès" 
          });
        } else {
          resolve({ 
            success: false, 
            message: `Le script s'est terminé avec le code ${code}. Output: ${output}` 
          });
        }
      });
      
      process.on('error', (err: Error) => {
        reject(err);
      });
    });
  }

  private collectScreenshots(outputDir: string): string[] {
    if (!isServer) {
      return [];
    }
    
    try {
      const files = fs.readdirSync(outputDir);
      return files
        .filter((file: string) => file.endsWith('.png') || file.endsWith('.jpg'))
        .map((file: string) => path.join(outputDir, file));
    } catch (error) {
      console.error("Erreur lors de la collecte des captures d'écran:", error);
      return [];
    }
  }

  private cleanup(scriptPath: string): void {
    if (!isServer) return;
    
    try {
      fs.unlinkSync(scriptPath);
    } catch (error) {
      console.error("Erreur lors du nettoyage:", error);
    }
  }
} 