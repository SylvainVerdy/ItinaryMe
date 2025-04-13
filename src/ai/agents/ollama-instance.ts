import { Ollama } from 'langchain/llms/ollama';
import { OllamaEmbeddings } from '@langchain/ollama';

// Configuration de l'instance Ollama avec le modèle DeepSeek
export const ollamaModel = new Ollama({
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'deepseek-coder', // Utilisation de DeepSeek par défaut
  temperature: 0.7,
});

// Embeddings pour la recherche sémantique
export const ollamaEmbeddings = new OllamaEmbeddings({
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'deepseek-coder',
}); 