import { useState } from 'react';

interface BrowserAgentOptions {
  headless?: boolean;
  defaultViewport?: {
    width: number;
    height: number;
  };
}

interface UseBrowserAgentReturn {
  isLoading: boolean;
  error: string | null;
  content: string | null;
  analysis: string | null;
  screenshotUrl: string | null;
  taskResult: string | null;
  initialized: boolean;
  initialize: (options?: BrowserAgentOptions) => Promise<void>;
  navigate: (url: string) => Promise<void>;
  extractContent: () => Promise<string>;
  analyzeContent: () => Promise<string>;
  takeScreenshot: () => Promise<string>;
  executeTask: (task: string) => Promise<string>;
  clickElement: (selector: string) => Promise<void>;
  fillInput: (selector: string, text: string) => Promise<void>;
  close: () => Promise<void>;
}

interface UseBrowserAgentOptions {
  onSuccess?: (result: BrowserAgentResult) => void;
  onError?: (error: Error) => void;
}

export interface BrowserAgentResult {
  success: boolean;
  message: string;
  screenshots?: string[];
  error?: string;
}

export interface BrowserAgentTask {
  task: string;
  model?: string; // Nom du modèle Ollama (qwen2.5, llama3, etc.)
  maxSteps?: number;
  debug?: boolean;
}

/**
 * Hook pour utiliser l'agent de navigation browser-use avec Ollama
 */
export function useBrowserAgent(options: UseBrowserAgentOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BrowserAgentResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Exécute une tâche avec l'agent de navigation en utilisant un modèle Ollama
   */
  const executeTask = async (taskOptions: BrowserAgentTask) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/browser-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskOptions),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }

      const data = await response.json();
      setResult(data);

      if (options.onSuccess) {
        options.onSuccess(data);
      }

      return data;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);

      if (options.onError) {
        options.onError(errorObj);
      }

      throw errorObj;
    } finally {
      setLoading(false);
    }
  };

  return {
    executeTask,
    loading,
    result,
    error,
  };
} 