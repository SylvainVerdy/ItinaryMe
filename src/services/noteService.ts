import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Note } from '@/lib/types';
import { interpretTravelRequest } from '@/ai/flows/interpret-travel-request';

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
    const tripDoc = await getDoc(doc(db, 'trips', tripId));
    
    if (!tripDoc.exists()) {
      throw new Error('Le voyage n\'existe pas');
    }
    
    const tripData = tripDoc.data();
    
    // Construire un contexte enrichi pour la génération
    const context = `
      Voyage à ${tripData.destination}
      Du ${tripData.startDate} au ${tripData.endDate}
      Pour ${tripData.numPeople} personne(s)
      
      Requête: ${prompt}
    `;
    
    // Utiliser l'API d'IA existante pour générer le contenu
    const response = await interpretTravelRequest({ request: context });
    
    // Formater la réponse pour qu'elle soit utilisable comme note
    let formattedResponse = '';
    
    if (response.destination) {
      formattedResponse += `Destination: ${response.destination}\n\n`;
    }
    
    if (response.activities) {
      formattedResponse += `Activités recommandées:\n`;
      response.activities.forEach((activity: string, index: number) => {
        formattedResponse += `${index + 1}. ${activity}\n`;
      });
      formattedResponse += '\n';
    }
    
    if (response.recommendations) {
      formattedResponse += `Recommandations:\n${response.recommendations}\n\n`;
    }
    
    if (response.notes) {
      formattedResponse += `Notes supplémentaires:\n${response.notes}`;
    }
    
    return formattedResponse || 'Aucune information générée. Veuillez essayer avec une requête plus précise.';
  } catch (error) {
    console.error('Erreur lors de la génération du contenu de la note:', error);
    throw new Error('Impossible de générer le contenu de la note');
  }
} 