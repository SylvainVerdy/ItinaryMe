import { API_DISABLED } from '../ai-instance';
// Importer en tant que LangchainOllama pour éviter la confusion
import { Ollama as LangchainOllama } from '@langchain/ollama';

// Classe simplifiée pour simuler Ollama
export class OllamaClient {
  private baseUrl: string;
  private model: string;
  private temperature: number;
  private topP?: number;

  constructor(options: { baseUrl: string; model: string; temperature?: number; topP?: number; keepAlive?: boolean }) {
    this.baseUrl = options.baseUrl;
    this.model = options.model;
    this.temperature = options.temperature || 0.7;
    this.topP = options.topP;
  }

  async call(prompt: string): Promise<string> {
    if (API_DISABLED) {
      console.log("API désactivée, utilisation de l'analyse locale uniquement");
      return "API désactivée. Utilisez l'analyse locale.";
    }

    try {
      console.log(`Tentative d'appel à l'API Ollama (${this.model}) - URL: ${this.baseUrl}`);
      console.log(`Prompt: ${prompt.substring(0, 100)}...`);
      
      // Vérifier que le serveur Ollama est en cours d'exécution
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const pingResponse = await fetch(`${this.baseUrl}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log(`Statut du ping Ollama: ${pingResponse.status} ${pingResponse.statusText}`);
      } catch (pingError) {
        console.error("Erreur lors du ping Ollama:", pingError);
        return "Le serveur Ollama n'est pas accessible. Assurez-vous qu'il est démarré et accessible à l'adresse configurée.";
      }
      
      // Appel à l'API Ollama avec timeout
      console.log("Envoi de la requête à Ollama...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          temperature: this.temperature,
          stream: false
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      // Vérifier si la réponse est OK
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Impossible de lire le corps de l'erreur");
        console.error(`Erreur API Ollama: ${response.status} ${response.statusText}`, errorText);
        
        if (response.status === 404) {
          return `Le modèle "${this.model}" n'est pas disponible. Utilisez la commande "ollama pull ${this.model}" pour le télécharger.`;
        }
        
        throw new Error(`Erreur API: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Traiter la réponse
      const data = await response.json();
      console.log("Réponse Ollama reçue avec succès!");
      return data.response || "";
    } catch (error) {
      console.error("Erreur détaillée lors de l'appel à l'API d'Ollama:", error);
      
      // Déterminer le type d'erreur pour un message plus utile
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return "Erreur de connexion au serveur Ollama. Vérifiez que le serveur est démarré et accessible.";
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        return "La requête à Ollama a expiré (timeout). Le serveur prend trop de temps pour répondre.";
      }
      
      return "Erreur lors de l'appel à l'API Ollama. " + (error instanceof Error ? error.message : String(error));
    }
  }
}

// Classe simplifiée pour simuler OllamaEmbeddings
export class OllamaEmbeddings {
  private baseUrl: string;
  private model: string;

  constructor(options: { baseUrl: string; model: string }) {
    this.baseUrl = options.baseUrl;
    this.model = options.model;
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    if (API_DISABLED) {
      console.log("API désactivée, embeddings simulés");
      return documents.map(() => Array(1536).fill(0));
    }

    try {
      console.log(`Embedding de ${documents.length} documents avec le modèle ${this.model}`);
      // Simuler des embeddings
      return documents.map(() => Array(1536).fill(0).map(() => Math.random()));
    } catch (error) {
      console.error("Erreur lors de l'embedding:", error);
      return documents.map(() => Array(1536).fill(0));
    }
  }

  async embedQuery(query: string): Promise<number[]> {
    if (API_DISABLED) {
      console.log("API désactivée, embeddings simulés");
      return Array(1536).fill(0);
    }

    try {
      console.log(`Embedding de la requête: ${query.substring(0, 50)}...`);
      // Simuler un embedding
      return Array(1536).fill(0).map(() => Math.random());
    } catch (error) {
      console.error("Erreur lors de l'embedding:", error);
      return Array(1536).fill(0);
    }
  }
}

// Configuration de l'instance Ollama
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL || 'mlaprise/gemma-3-4b-it-qat-q4_0-gguf';

// Création d'une instance Ollama avec configuration par défaut
export const ollamaModel = new OllamaClient({
  baseUrl: OLLAMA_BASE_URL,
  model: DEFAULT_MODEL,
  temperature: 0.7, // Niveau de créativité (0.0-1.0)
  topP: 0.9, // Probabilité cumulative pour le top-p sampling
  // Par défaut, pas de limite de tokens mais peut être configuré
  // maxTokens: 2048,
  keepAlive: true // Garder l'instance en vie pour des performances optimales
});

// Embeddings pour la recherche sémantique
export const ollamaEmbeddings = new OllamaEmbeddings({
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'deepseek-coder',
});

// Wrapper avec timeout pour éviter les appels qui se bloquent
export async function callWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Opération expirée après ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([
    promise.then((result) => {
      clearTimeout(timeoutId);
      return result;
    }),
    timeoutPromise,
  ]);
}

// Fonction utilitaire pour faire des appels à Ollama avec timeout
export async function callOllamaWithTimeout(
  prompt: string, 
  timeoutMs: number = 30000
): Promise<string> {
  return callWithTimeout(ollamaModel.call(prompt), timeoutMs);
}

// Exporter l'instance par défaut
export default ollamaModel; 