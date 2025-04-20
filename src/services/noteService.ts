import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Note } from '@/lib/types';
import { generateNoteContent as generateAiNoteContent } from '@/ai/flows/generate-note-content';
import { BrowserAgent } from '@/ai/browserAgent';
import { OpenAIModel } from '@/ai/openai-model';

// Récupérer les notes d'un voyage
export async function getNotesByTripId(userId: string, tripId: string): Promise<Note[]> {
  try {
    const q = query(
      collection(db, 'notes'),
      where('userId', '==', userId),
      where('tripId', '==', tripId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const notes: Note[] = [];
    
    querySnapshot.forEach((doc) => {
      notes.push({ id: doc.id, ...doc.data() } as Note);
    });
    
    return notes;
  } catch (error) {
    console.error('Erreur lors de la récupération des notes:', error);
    throw new Error('Impossible de récupérer les notes');
  }
}

// Ajouter une note
export async function addNote(note: Omit<Note, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'notes'), note);
    return docRef.id;
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la note:', error);
    throw new Error('Impossible d\'ajouter la note');
  }
}

// Mettre à jour une note
export async function updateNote(noteId: string, data: Partial<Note>): Promise<void> {
  try {
    await updateDoc(doc(db, 'notes', noteId), {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la note:', error);
    throw new Error('Impossible de mettre à jour la note');
  }
}

// Supprimer une note
export async function deleteNote(noteId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'notes', noteId));
  } catch (error) {
    console.error('Erreur lors de la suppression de la note:', error);
    throw new Error('Impossible de supprimer la note');
  }
}

// Générer du contenu de note basé sur une requête
export async function generateNoteContent(prompt: string, tripId: string): Promise<string> {
  try {
    // Récupérer les informations du voyage pour enrichir le contexte
    const tripDoc = await getDoc(doc(db, 'travels', tripId)); // 'travels' et non 'trips'
    
    if (!tripDoc.exists()) {
      throw new Error('Le voyage n\'existe pas');
    }
    
    const tripData = tripDoc.data();
    
    // Utiliser la nouvelle fonction de génération de contenu
    const result = await generateAiNoteContent({
      prompt,
      tripContext: {
        destination: tripData.destination,
        startDate: typeof tripData.startDate === 'string' ? tripData.startDate : tripData.dateDepart,
        endDate: typeof tripData.endDate === 'string' ? tripData.endDate : tripData.dateRetour,
        numPeople: tripData.numPeople || tripData.nombreVoyageurs || 1,
      }
    });
    
    if (!result.success) {
      return "Impossible de générer le contenu. Veuillez vérifier la connexion à Ollama.";
    }
    
    return result.content;
  } catch (error) {
    console.error('Erreur lors de la génération du contenu de la note:', error);
    throw new Error('Impossible de générer le contenu de la note');
  }
}

interface TripDetails {
  destination: string;
  startDate: string;
  endDate: string;
  numPeople: number;
  budget?: string;
  [key: string]: any;
}

/**
 * Service pour la gestion des notes de voyage
 */
export const noteService = {
  /**
   * Crée une nouvelle note pour un voyage
   */
  async createNote(note: Omit<Note, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = new Date();
      const noteRef = await addDoc(collection(db, 'notes'), {
        ...note,
        createdAt: now,
        updatedAt: now
      });
      return noteRef.id;
    } catch (error) {
      console.error('Erreur lors de la création de la note:', error);
      throw error;
    }
  },

  /**
   * Met à jour une note existante
   */
  async updateNote(id: string, data: Partial<Note>): Promise<void> {
    try {
      const noteRef = doc(db, 'notes', id);
      await updateDoc(noteRef, {
        ...data,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la note:', error);
      throw error;
    }
  },

  /**
   * Récupère toutes les notes pour un voyage
   */
  async getNotesByTripId(tripId: string): Promise<Note[]> {
    try {
      const notesQuery = query(
        collection(db, 'notes'),
        where('tripId', '==', tripId),
        orderBy('createdAt', 'desc')
      );
      
      const notesSnapshot = await getDocs(notesQuery);
      return notesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Note));
    } catch (error) {
      console.error('Erreur lors de la récupération des notes:', error);
      return [];
    }
  },

  /**
   * Supprime une note
   */
  async deleteNote(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'notes', id));
    } catch (error) {
      console.error('Erreur lors de la suppression de la note:', error);
      throw error;
    }
  },

  /**
   * Génère du contenu pour une note à partir d'une requête
   */
  async generateNoteContent(prompt: string, tripId: string): Promise<string> {
    try {
      // Récupérer les détails du voyage pour le contexte
      const tripDetails = await this.getTripDetails(tripId);
      
      // Analyser la requête pour déterminer si une recherche web est nécessaire
      const needsWebSearch = this.shouldPerformWebSearch(prompt);
      
      let searchResults = '';
      if (needsWebSearch) {
        // Effectuer une recherche web pour enrichir la réponse
        const webQuery = this.formatWebSearchQuery(prompt, tripDetails);
        searchResults = await this.performWebSearch(webQuery);
      }
      
      // Générer le contenu avec le modèle Ollama
      const model = new OpenAIModel({
        model: 'mlaprise/gemma-3-4b-it-qat-q4_0-gguf', 
        temperature: 0.5
      });
      
      // Préparer le contexte pour le modèle
      const systemPrompt = `
        Tu es un assistant de voyage expert qui aide à créer des notes détaillées pour un voyage.
        
        Contexte du voyage:
        - Destination: ${tripDetails.destination || 'Non spécifié'}
        - Dates: du ${tripDetails.startDate || 'Non spécifié'} au ${tripDetails.endDate || 'Non spécifié'}
        - Voyageurs: ${tripDetails.numPeople || 'Non spécifié'} personne(s)
        ${tripDetails.budget ? `- Budget: ${tripDetails.budget}` : ''}
        
        ${searchResults ? `Information supplémentaire de recherche web:\n${searchResults}` : ''}
        
        Ta tâche est de générer une note complète et utile en fonction de la requête de l'utilisateur.
        Réponds en français, de manière structurée avec des sections claires.
        N'invente pas d'informations factuelles comme des horaires précis, des prix exacts ou des adresses,
        sauf si ces informations sont fournies dans les résultats de recherche.
        
        Si des liens pertinents sont mentionnés dans les résultats de recherche, inclus-les dans ta réponse
        en utilisant le format Markdown avec des crochets pour le texte et des parenthèses pour l'URL.
        Exemple: [Réserver cet hôtel](https://example.com)
        
        Format ta réponse avec une structure claire et des puces pour plus de lisibilité.
      `;
      
      console.log("Appel du modèle Ollama pour générer une note");
      const result = await model.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]);
      
      // Retourner le contenu généré ou un message d'erreur
      return result.content || "Désolé, je n'ai pas pu générer de contenu pour cette note.";
      
    } catch (error) {
      console.error('Erreur lors de la génération du contenu de la note:', error);
      return "Une erreur s'est produite lors de la génération de la note. Veuillez réessayer plus tard.";
    }
  },
  
  /**
   * Récupère les détails d'un voyage
   */
  async getTripDetails(tripId: string): Promise<TripDetails> {
    try {
      const tripRef = doc(db, 'trips', tripId);
      const tripSnap = await getDoc(tripRef);
      
      if (tripSnap.exists()) {
        return tripSnap.data() as TripDetails;
      }
      
      return {
        destination: '',
        startDate: '',
        endDate: '',
        numPeople: 0
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du voyage:', error);
      return {
        destination: '',
        startDate: '',
        endDate: '',
        numPeople: 0
      };
    }
  },
  
  /**
   * Détermine si une recherche web est nécessaire
   */
  shouldPerformWebSearch(prompt: string): boolean {
    const webSearchPatterns = [
      /recherch(e|er|ez)/i,
      /trouv(e|er|ez)/i,
      /où (est|sont|trouver)/i,
      /quel(s|les)? (est|sont|serai(en)?t)/i,
      /comment (aller|visiter|réserver)/i,
      /meilleur(s|es)?/i,
      /recommand(e|er|ez)/i,
      /conseil(s)?/i,
      /suggestion(s)?/i,
      /hotel(s)?/i,
      /restaurant(s)?/i,
      /activit(é|e|es)/i,
      /visite(s|r)?/i,
      /transport(s)?/i,
      /billet(s)?/i,
      /réservation(s)?/i
    ];
    
    return webSearchPatterns.some(pattern => pattern.test(prompt));
  },
  
  /**
   * Formate la requête pour la recherche web
   */
  formatWebSearchQuery(prompt: string, tripDetails: TripDetails): string {
    // Extraire les mots-clés de la requête
    const keywords = prompt.replace(/[^\w\s]/gi, ' ')
                           .split(' ')
                           .filter(word => word.length > 3)
                           .join(' ');
    
    // Construire une requête enrichie avec les détails du voyage
    return `${keywords} ${tripDetails.destination} ${tripDetails.startDate && tripDetails.endDate ? `du ${tripDetails.startDate} au ${tripDetails.endDate}` : ''} ${tripDetails.numPeople > 1 ? `pour ${tripDetails.numPeople} personnes` : ''}`.trim();
  },
  
  /**
   * Effectue une recherche web pour enrichir la réponse
   */
  async performWebSearch(query: string): Promise<string> {
    try {
      console.log(`Recherche web pour: ${query}`);
      const browserAgent = new BrowserAgent();
      const result = await browserAgent.searchWeb(query, 'mlaprise/gemma-3-4b-it-qat-q4_0-gguf');
      
      if (result.success && result.content) {
        return result.content;
      }
      
      return '';
    } catch (error) {
      console.error('Erreur lors de la recherche web:', error);
      return '';
    }
  }
};

export async function createNote(note: Omit<Note, 'createdAt' | 'updatedAt'>): Promise<string> {
  return noteService.createNote(note);
} 