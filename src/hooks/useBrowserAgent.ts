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

export function useBrowserAgent(): UseBrowserAgentReturn {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [taskResult, setTaskResult] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);

  // Fonction générique pour effectuer les appels API
  const callAPI = async <T,>(action: string, data: Record<string, any> = {}): Promise<T> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/browser-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          ...data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }

      const result = await response.json();
      return result as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Initialiser l'agent de navigation avec des options
  const initialize = async (options?: BrowserAgentOptions): Promise<void> => {
    try {
      await callAPI('init', { options });
      setInitialized(true);
    } catch (err) {
      setInitialized(false);
      throw err;
    }
  };

  // Naviguer vers une URL
  const navigate = async (url: string): Promise<void> => {
    await callAPI('navigate', { url });
  };

  // Extraire le contenu de la page
  const extractContent = async (): Promise<string> => {
    const result = await callAPI<{ content: string }>('extract');
    setContent(result.content);
    return result.content;
  };

  // Analyser le contenu de la page avec LLM
  const analyzeContent = async (): Promise<string> => {
    const result = await callAPI<{ analysis: string }>('analyze');
    setAnalysis(result.analysis);
    return result.analysis;
  };

  // Prendre une capture d'écran
  const takeScreenshot = async (): Promise<string> => {
    const result = await callAPI<{ screenshot: string }>('screenshot');
    setScreenshotUrl(result.screenshot);
    return result.screenshot;
  };

  // Exécuter une tâche complexe
  const executeTask = async (task: string): Promise<string> => {
    const result = await callAPI<{ result: string }>('executeTask', { task });
    setTaskResult(result.result);
    return result.result;
  };

  // Cliquer sur un élément
  const clickElement = async (selector: string): Promise<void> => {
    await callAPI('click', { selector });
  };

  // Remplir un champ de saisie
  const fillInput = async (selector: string, text: string): Promise<void> => {
    await callAPI('fill', { selector, text });
  };

  // Fermer le navigateur
  const close = async (): Promise<void> => {
    await callAPI('close');
    setInitialized(false);
  };

  return {
    isLoading,
    error,
    content,
    analysis,
    screenshotUrl,
    taskResult,
    initialized,
    initialize,
    navigate,
    extractContent,
    analyzeContent,
    takeScreenshot,
    executeTask,
    clickElement,
    fillInput,
    close,
  };
} 