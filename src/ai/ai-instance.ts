// Mock pour les fonctionnalités GenKit qui ont été désinstallées
// Configuration après désinstallation de genkit pour éviter les erreurs

// Modèle Ollama à utiliser par défaut
const DEFAULT_OLLAMA_MODEL = 'mlaprise/gemma-3-4b-it-qat-q4_0-gguf';

// Mock pour l'API GenKit (package désinstallé)
const ai = {
  definePrompt: () => ({ 
    input: {}, 
    output: {},
    prompt: ''
  }),
  defineFlow: () => async (input: any) => ({ output: {} }),
};

// Configuration de l'API Ollama
export const API_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
export const API_MODEL = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;

// Activer les appels à l'API - toujours actif pour permettre la détection et génération
export const API_DISABLED = false;

export { ai };
