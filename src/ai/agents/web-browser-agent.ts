import puppeteer, { Browser, Page } from 'puppeteer';
import { ollamaModel } from './ollama-instance';

interface BrowserAgentOptions {
  headless?: boolean;
  defaultViewport?: {
    width: number;
    height: number;
  };
}

export class WebBrowserAgent {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private options: BrowserAgentOptions;

  constructor(options: BrowserAgentOptions = {}) {
    this.options = {
      headless: false, // Mode visible par défaut pour le débogage
      defaultViewport: { width: 1280, height: 800 },
      ...options,
    };
  }

  /**
   * Initialiser le navigateur
   */
  async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      defaultViewport: this.options.defaultViewport,
    });
    this.page = await this.browser.newPage();
  }

  /**
   * Fermer le navigateur
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Naviguer vers une URL
   */
  async navigateTo(url: string): Promise<void> {
    if (!this.page) throw new Error("Le navigateur n'est pas initialisé");
    await this.page.goto(url, { waitUntil: 'networkidle2' });
  }

  /**
   * Prendre une capture d'écran
   */
  async takeScreenshot(path: string): Promise<void> {
    if (!this.page) throw new Error("Le navigateur n'est pas initialisé");
    await this.page.screenshot({ path });
  }

  /**
   * Extraire le contenu de la page
   */
  async extractPageContent(): Promise<string> {
    if (!this.page) throw new Error("Le navigateur n'est pas initialisé");
    return await this.page.evaluate(() => document.body.innerText);
  }

  /**
   * Extraire le HTML de la page
   */
  async extractPageHTML(): Promise<string> {
    if (!this.page) throw new Error("Le navigateur n'est pas initialisé");
    return await this.page.content();
  }

  /**
   * Analyser le contenu de la page avec le modèle LLM
   */
  async analyzePageContent(): Promise<string> {
    if (!this.page) throw new Error("Le navigateur n'est pas initialisé");
    
    const content = await this.extractPageContent();
    
    // Utiliser le modèle Ollama pour analyser le contenu
    const prompt = `
      Analyse le contenu de cette page web et fais un résumé concis des informations principales.
      Contenu:
      ${content.substring(0, 8000)} // Limiter le contenu pour éviter de dépasser les limites du contexte
    `;
    
    return await ollamaModel.call(prompt);
  }

  /**
   * Exécuter une action complexe guidée par l'IA
   */
  async executeTask(task: string): Promise<string> {
    if (!this.page) throw new Error("Le navigateur n'est pas initialisé");
    
    const pageContent = await this.extractPageContent();
    const pageHTML = await this.extractPageHTML();
    
    // Construire un prompt pour guider l'action
    const prompt = `
      Tu es un assistant d'automatisation web. Analyse le contenu de cette page web et guide-moi 
      pour accomplir la tâche suivante: "${task}".
      
      Contenu textuel de la page:
      ${pageContent.substring(0, 4000)}
      
      Structure HTML simplifiée:
      ${pageHTML.substring(0, 4000)}
      
      Fournir un plan d'actions détaillé pour accomplir cette tâche, sous forme d'étapes numérotées.
      Pour chaque élément avec lequel interagir, fournir des sélecteurs CSS ou XPath précis.
    `;
    
    // Obtenir les instructions d'automatisation du modèle LLM
    return await ollamaModel.call(prompt);
  }
  
  /**
   * Exécuter un sélecteur et cliquer sur l'élément
   */
  async clickElement(selector: string): Promise<void> {
    if (!this.page) throw new Error("Le navigateur n'est pas initialisé");
    await this.page.waitForSelector(selector);
    await this.page.click(selector);
  }
  
  /**
   * Remplir un champ de formulaire
   */
  async fillInput(selector: string, text: string): Promise<void> {
    if (!this.page) throw new Error("Le navigateur n'est pas initialisé");
    await this.page.waitForSelector(selector);
    await this.page.type(selector, text);
  }
} 