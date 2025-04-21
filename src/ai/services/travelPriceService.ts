import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { createOllamaTransport } from '../utils/ollamaTransport';
import { SerpApiService } from '../utils/serpApiService';
import { TravelPlan } from '../../services/travelService';

/**
 * Interface pour un résultat de prix analysé
 */
export interface PriceAnalysisResult {
  category: 'transport' | 'logement' | 'nourriture' | 'activités';
  estimation: string; 
  description: string;
  sources: Array<{
    title: string;
    url: string;
  }>;
}

/**
 * Interface pour le rapport complet d'analyse de prix
 */
export interface PriceAnalysisReport {
  destination: string;
  duréeSéjour: number;
  nombreVoyageurs: number;
  estimationTotale: string;
  résultats: PriceAnalysisResult[];
  sommaire: string;
  créatedAt: string;
}

/**
 * Service d'analyse des prix de voyage
 */
export class TravelPriceService {
  private serpApi: SerpApiService;
  private llmTransport: any;
  private apiKey: string;
  private ollamaUrl: string;
  private ollamaModel: string;

  /**
   * Initialise le service d'analyse des prix
   * @param serpApiKey Clé API pour SerpApi
   * @param ollamaUrl URL de l'API Ollama (par défaut: http://localhost:11434)
   * @param ollamaModel Modèle à utiliser (par défaut: mistral)
   */
  constructor(
    serpApiKey: string,
    ollamaUrl: string = 'http://localhost:11434',
    ollamaModel: string = 'mlaprise/gemma-3-4b-it-qat-q4_0-gguf'
  ) {
    this.apiKey = serpApiKey;
    this.serpApi = new SerpApiService(serpApiKey);
    this.ollamaUrl = ollamaUrl;
    this.ollamaModel = ollamaModel;
    this.llmTransport = createOllamaTransport(ollamaUrl, ollamaModel);
  }

  /**
   * Analyse les prix pour un voyage spécifique
   * @param travel Informations sur le voyage
   * @returns Rapport d'analyse des prix
   */
  async analyzeTravelPrices(travel: TravelPlan): Promise<PriceAnalysisReport> {
    // Formater les dates
    const dateDepart = travel.dateDepart ? format(new Date(travel.dateDepart), 'dd MMMM yyyy', { locale: fr }) : '';
    const dateRetour = travel.dateRetour ? format(new Date(travel.dateRetour), 'dd MMMM yyyy', { locale: fr }) : '';
    
    // Calculer la durée du séjour
    const duréeSéjour = travel.dateDepart && travel.dateRetour 
      ? Math.ceil((new Date(travel.dateRetour).getTime() - new Date(travel.dateDepart).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Collecter les données de prix
    const resultats: PriceAnalysisResult[] = [];
    
    // 1. Prix du transport
    try {
      const transportData = await this.getTransportPrices(
        'Paris', // Lieu de départ par défaut (à améliorer)
        travel.destination,
        dateDepart
      );
      resultats.push(transportData);
    } catch (error) {
      console.error("Erreur lors de l'analyse des prix de transport:", error);
      resultats.push({
        category: 'transport',
        estimation: 'Non disponible',
        description: "Impossible d'obtenir des estimations de prix pour le transport.",
        sources: []
      });
    }
    
    // 2. Prix des logements
    try {
      const logementData = await this.getAccommodationPrices(
        travel.destination,
        dateDepart,
        dateRetour
      );
      resultats.push(logementData);
    } catch (error) {
      console.error("Erreur lors de l'analyse des prix de logement:", error);
      resultats.push({
        category: 'logement',
        estimation: 'Non disponible',
        description: "Impossible d'obtenir des estimations de prix pour les logements.",
        sources: []
      });
    }
    
    // 3. Prix de la nourriture
    try {
      const nourritureData = await this.getFoodPrices(travel.destination);
      resultats.push(nourritureData);
    } catch (error) {
      console.error("Erreur lors de l'analyse des prix de nourriture:", error);
      resultats.push({
        category: 'nourriture',
        estimation: 'Non disponible',
        description: "Impossible d'obtenir des estimations de prix pour la nourriture.",
        sources: []
      });
    }
    
    // 4. Prix des activités
    try {
      const activitésData = await this.getActivityPrices(travel.destination);
      resultats.push(activitésData);
    } catch (error) {
      console.error("Erreur lors de l'analyse des prix des activités:", error);
      resultats.push({
        category: 'activités',
        estimation: 'Non disponible',
        description: "Impossible d'obtenir des estimations de prix pour les activités.",
        sources: []
      });
    }
    
    // Générer un résumé avec le LLM
    const sommaire = await this.generatePriceSummary(
      travel.destination,
      duréeSéjour,
      travel.nombreVoyageurs || 1,
      resultats
    );
    
    // Calculer l'estimation totale (simpliste pour l'instant)
    const estimationTotale = this.calculateTotalEstimate(resultats);
    
    return {
      destination: travel.destination,
      duréeSéjour,
      nombreVoyageurs: travel.nombreVoyageurs || 1,
      estimationTotale,
      résultats: resultats,
      sommaire,
      créatedAt: new Date().toISOString()
    };
  }

  /**
   * Obtient des informations sur les prix de transport
   */
  private async getTransportPrices(from: string, to: string, date?: string): Promise<PriceAnalysisResult> {
    const searchResults = await this.serpApi.searchTransportPrices(from, to, date);
    
    if (!searchResults.organic_results || searchResults.organic_results.length === 0) {
      return {
        category: 'transport',
        estimation: 'Non disponible',
        description: "Aucune information trouvée sur les prix de transport.",
        sources: []
      };
    }
    
    // Extraire les résultats pertinents
    const sources = searchResults.organic_results.slice(0, 5).map(result => ({
      title: result.title,
      url: result.link
    }));
    
    // Utiliser le LLM pour analyser les résultats
    const analysisPrompt = `
      Voici des informations sur les prix de transport de ${from} à ${to}${date ? ` le ${date}` : ''}:
      
      ${searchResults.organic_results.slice(0, 5).map(r => 
        `- Titre: ${r.title}\n  Description: ${r.snippet}`
      ).join('\n\n')}
      
      Basé sur ces informations, fournis:
      1. Une estimation du prix moyen en euros
      2. Une description concise des options disponibles (150 caractères max)
    `;
    
    const analysisResult = await this.llmTransport.complete({ prompt: analysisPrompt });
    const analysisText = analysisResult.completion || '';
    
    // Extraire l'estimation et la description
    const estimationMatch = analysisText.match(/\d+[\s-]?\d*\s*(?:€|euros)/i);
    const estimation = estimationMatch ? estimationMatch[0].trim() : 'Variable';
    
    // Extraire la description (prendre les 150 premiers caractères après l'estimation)
    const descriptionMatch = analysisText.replace(estimation, '').trim();
    const description = descriptionMatch.length > 150 
      ? descriptionMatch.substring(0, 147) + '...' 
      : descriptionMatch;
    
    return {
      category: 'transport',
      estimation,
      description,
      sources
    };
  }

  /**
   * Obtient des informations sur les prix de logement
   */
  private async getAccommodationPrices(location: string, checkIn?: string, checkOut?: string): Promise<PriceAnalysisResult> {
    const searchResults = await this.serpApi.searchHotels(location, checkIn, checkOut);
    
    if (!searchResults.organic_results || searchResults.organic_results.length === 0) {
      return {
        category: 'logement',
        estimation: 'Non disponible',
        description: "Aucune information trouvée sur les prix de logement.",
        sources: []
      };
    }
    
    // Extraire les résultats pertinents
    const sources = searchResults.organic_results.slice(0, 5).map(result => ({
      title: result.title,
      url: result.link
    }));
    
    // Utiliser le LLM pour analyser les résultats
    const analysisPrompt = `
      Voici des informations sur les prix de logement à ${location}${checkIn && checkOut ? ` du ${checkIn} au ${checkOut}` : ''}:
      
      ${searchResults.organic_results.slice(0, 5).map(r => 
        `- Titre: ${r.title}\n  Description: ${r.snippet}`
      ).join('\n\n')}
      
      Basé sur ces informations, fournis:
      1. Une estimation du prix moyen par nuit en euros
      2. Une description concise des options disponibles (150 caractères max)
    `;
    
    const analysisResult = await this.llmTransport.complete({ prompt: analysisPrompt });
    const analysisText = analysisResult.completion || '';
    
    // Extraire l'estimation et la description
    const estimationMatch = analysisText.match(/\d+[\s-]?\d*\s*(?:€|euros)/i);
    const estimation = estimationMatch ? estimationMatch[0].trim() : 'Variable';
    
    // Extraire la description
    const descriptionMatch = analysisText.replace(estimation, '').trim();
    const description = descriptionMatch.length > 150 
      ? descriptionMatch.substring(0, 147) + '...' 
      : descriptionMatch;
    
    return {
      category: 'logement',
      estimation,
      description,
      sources
    };
  }

  /**
   * Obtient des informations sur les prix de nourriture
   */
  private async getFoodPrices(location: string): Promise<PriceAnalysisResult> {
    const searchResults = await this.serpApi.searchRestaurants(location);
    
    if (!searchResults.organic_results || searchResults.organic_results.length === 0) {
      return {
        category: 'nourriture',
        estimation: 'Non disponible',
        description: "Aucune information trouvée sur les prix de nourriture.",
        sources: []
      };
    }
    
    // Extraire les résultats pertinents
    const sources = searchResults.organic_results.slice(0, 5).map(result => ({
      title: result.title,
      url: result.link
    }));
    
    // Utiliser le LLM pour analyser les résultats
    const analysisPrompt = `
      Voici des informations sur les prix de restaurants à ${location}:
      
      ${searchResults.organic_results.slice(0, 5).map(r => 
        `- Titre: ${r.title}\n  Description: ${r.snippet}`
      ).join('\n\n')}
      
      Basé sur ces informations, fournis:
      1. Une estimation du budget moyen par jour et par personne en euros pour la nourriture
      2. Une description concise des options disponibles (150 caractères max)
    `;
    
    const analysisResult = await this.llmTransport.complete({ prompt: analysisPrompt });
    const analysisText = analysisResult.completion || '';
    
    // Extraire l'estimation et la description
    const estimationMatch = analysisText.match(/\d+[\s-]?\d*\s*(?:€|euros)/i);
    const estimation = estimationMatch ? estimationMatch[0].trim() : '30-60€';
    
    // Extraire la description
    const descriptionMatch = analysisText.replace(estimation, '').trim();
    const description = descriptionMatch.length > 150 
      ? descriptionMatch.substring(0, 147) + '...' 
      : descriptionMatch;
    
    return {
      category: 'nourriture',
      estimation,
      description,
      sources
    };
  }

  /**
   * Obtient des informations sur les prix des activités
   */
  private async getActivityPrices(location: string): Promise<PriceAnalysisResult> {
    const query = `activités touristiques à ${location} prix`;
    const searchResults = await this.serpApi.search(query);
    
    if (!searchResults.organic_results || searchResults.organic_results.length === 0) {
      return {
        category: 'activités',
        estimation: 'Non disponible',
        description: "Aucune information trouvée sur les prix des activités.",
        sources: []
      };
    }
    
    // Extraire les résultats pertinents
    const sources = searchResults.organic_results.slice(0, 5).map(result => ({
      title: result.title,
      url: result.link
    }));
    
    // Utiliser le LLM pour analyser les résultats
    const analysisPrompt = `
      Voici des informations sur les prix d'activités touristiques à ${location}:
      
      ${searchResults.organic_results.slice(0, 5).map(r => 
        `- Titre: ${r.title}\n  Description: ${r.snippet}`
      ).join('\n\n')}
      
      Basé sur ces informations, fournis:
      1. Une estimation du budget moyen par jour et par personne en euros pour les activités
      2. Une description concise des options disponibles (150 caractères max)
    `;
    
    const analysisResult = await this.llmTransport.complete({ prompt: analysisPrompt });
    const analysisText = analysisResult.completion || '';
    
    // Extraire l'estimation et la description
    const estimationMatch = analysisText.match(/\d+[\s-]?\d*\s*(?:€|euros)/i);
    const estimation = estimationMatch ? estimationMatch[0].trim() : '20-50€';
    
    // Extraire la description
    const descriptionMatch = analysisText.replace(estimation, '').trim();
    const description = descriptionMatch.length > 150 
      ? descriptionMatch.substring(0, 147) + '...' 
      : descriptionMatch;
    
    return {
      category: 'activités',
      estimation,
      description,
      sources
    };
  }

  /**
   * Génère un résumé des prix avec le LLM
   */
  private async generatePriceSummary(
    destination: string,
    duréeSéjour: number,
    nombreVoyageurs: number,
    resultats: PriceAnalysisResult[]
  ): Promise<string> {
    const summaryPrompt = `
      Crée un résumé concis (maximum 200 mots) des coûts estimés pour un voyage à ${destination} 
      d'une durée de ${duréeSéjour} jours pour ${nombreVoyageurs} personne(s).
      
      Informations sur les prix:
      ${resultats.map(r => 
        `- ${r.category.charAt(0).toUpperCase() + r.category.slice(1)}: ${r.estimation}\n  ${r.description}`
      ).join('\n\n')}
      
      Le résumé doit:
      1. Indiquer le budget total estimé pour l'ensemble du voyage
      2. Présenter les coûts par catégorie
      3. Suggérer des astuces pour économiser
      4. Mentionner les variations possibles selon la saison ou les choix personnels
    `;
    
    const summaryResult = await this.llmTransport.complete({ 
      prompt: summaryPrompt,
      options: {
        temperature: 0.7,
        max_tokens: 500
      }
    });
    
    return summaryResult.completion || '';
  }

  /**
   * Calcule l'estimation totale à partir des résultats individuels
   */
  private calculateTotalEstimate(resultats: PriceAnalysisResult[]): string {
    // Convertir les estimations en valeurs numériques
    const estimates = resultats.map(r => {
      const match = r.estimation.match(/(\d+)[\s-]?(\d+)?/);
      if (!match) return 0;
      
      // Si c'est une fourchette (ex: "30-60€"), prendre la moyenne
      if (match[2]) {
        return (parseInt(match[1]) + parseInt(match[2])) / 2;
      }
      
      return parseInt(match[1]);
    });
    
    // Calculer le total
    const total = estimates.reduce((sum, val) => sum + val, 0);
    
    return `${Math.round(total)}€`;
  }
} 