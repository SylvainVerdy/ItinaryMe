/**
 * Implémentation optimisée du modèle Ollama qui adapte le format des entrées/sorties
 * pour compatibilité avec OpenAI
 */

import { API_URL, API_MODEL, API_DISABLED } from './ai-instance';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// Suppression de l'import genkitx-ollama qui a été désinstallé
// import { ollama } from 'genkitx-ollama';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  content: string | null;
}

interface OpenAIModelOptions {
  baseUrl?: string;
  model?: string;
  temperature?: number;
}

// Le client Ollama est maintenant supprimé - on utilise directement l'API REST

export class OpenAIModel {
  public baseUrl: string;
  public model: string;
  public temperature: number;
  public disabled: boolean;

  constructor(options: OpenAIModelOptions = {}) {
    this.baseUrl = options.baseUrl || API_URL;
    this.model = options.model || API_MODEL || 'mlaprise/gemma-3-4b-it-qat-q4_0-gguf';
    this.temperature = options.temperature || 0.7;
    this.disabled = API_DISABLED;
  }

  /**
   * Effectue un appel au modèle de chat Ollama
   */
  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    // Si l'API est désactivée, retourner une réponse par défaut
    if (this.disabled || !this.baseUrl) {
      console.log("API désactivée, utilisation de l'analyse locale uniquement");
      return { content: JSON.stringify({ isValidTravelRequest: false }) };
    }

    try {
      console.log(`Appel à Ollama via l'API Next.js avec modèle ${this.model}`);
      
      // Extraire les messages système et utilisateur
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      
      // Obtenir tous les messages utilisateur et assistant ordonnés
      const chatMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => `${m.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${m.content}`)
        .join('\n\n');
      
      // Construire un prompt complet
      const combinedPrompt = `${systemMessage}\n\nHistorique de la conversation:\n\n${chatMessages}\n\nAssistant:`;
      
      // Appel à notre API interne pour éviter les problèmes CORS
      console.log("Appel à l'API Next.js qui fera le relais vers Ollama");
      // Utiliser l'URL complète au lieu d'une URL relative
      const apiUrl = this.baseUrl ? `${this.baseUrl}/api/chat` : 'http://localhost:9000/api/chat';
      console.log(`Utilisation de l'URL API: ${apiUrl}`);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          prompt: combinedPrompt,
          temperature: this.temperature,
          maxTokens: 2048
        })
      });

      // Vérifier si la réponse est OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erreur API (${response.status}): ${errorText}`);
        throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
      }

      // Traiter la réponse
      const data = await response.json();
      console.log("Réponse reçue via API Next.js");
      return {
        content: data.content || data.response || null
      };
    } catch (error) {
      console.error("Erreur lors de l'appel à l'API:", error);
      
      // En cas d'erreur, retourner une réponse par défaut
      return {
        content: "Je suis désolé, mais je n'ai pas pu traiter votre demande en raison d'une erreur de connexion avec l'IA. Veuillez vérifier que le service est bien démarré et accessible."
      };
    }
  }
}

function handleUserMessage(messageText: string) {
  // ... le corps de la fonction
} 