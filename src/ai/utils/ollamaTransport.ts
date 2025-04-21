import axios from 'axios';

/**
 * Interface pour les options de complétion
 */
interface CompletionOptions {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  stop?: string[];
}

/**
 * Interface pour la demande de complétion
 */
interface CompletionRequest {
  prompt: string;
  options?: CompletionOptions;
}

/**
 * Interface pour la réponse de complétion
 */
interface CompletionResponse {
  completion: string;
}

/**
 * Interface pour un transport de modèle
 */
interface ModelTransport {
  complete(request: CompletionRequest): Promise<CompletionResponse>;
}

/**
 * Crée un transport pour communiquer avec Ollama
 * @param baseUrl URL de base pour l'API Ollama
 * @param model Nom du modèle à utiliser
 * @returns Un objet de transport pour effectuer des requêtes
 */
export function createOllamaTransport(baseUrl: string, model: string): ModelTransport {
  return {
    async complete({ prompt, options = {} }: CompletionRequest): Promise<CompletionResponse> {
      try {
        const response = await axios.post(`${baseUrl}/api/generate`, {
          model,
          prompt,
          system: "Tu es un assistant spécialisé dans l'analyse d'informations de voyage.",
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens,
          top_p: options.top_p,
          top_k: options.top_k,
          stop: options.stop,
          stream: false
        });

        return {
          completion: response.data.response || ''
        };
      } catch (error: any) {
        console.error("Erreur lors de la communication avec Ollama:", error.message);
        throw new Error(`Erreur Ollama: ${error.message}`);
      }
    }
  };
} 