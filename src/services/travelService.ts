import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface TravelPlanInput {
  destination: string;
  dateDepart: string;
  dateRetour: string;
  nombreVoyageurs: number;
  notes?: string;
  activities?: string[];
}

export interface TravelPlan extends TravelPlanInput {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const TRAVEL_COLLECTION = 'travels';

export const travelService = {
  // Créer un nouveau voyage
  async createTravel(userId: string, travelData: TravelPlanInput): Promise<string> {
    try {
      console.log("Tentative de création de voyage avec les données:", { userId, ...travelData });
      
      const docRef = await addDoc(collection(db, TRAVEL_COLLECTION), {
        ...travelData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log("Voyage créé avec succès, ID:", docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error('Erreur détaillée lors de la création du voyage:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        details: error
      });
      throw new Error(`Erreur lors de la création du voyage: ${error.message || "Erreur inconnue"}`);
    }
  },

  // Récupérer tous les voyages d'un utilisateur
  async getUserTravels(userId: string): Promise<TravelPlan[]> {
    try {
      const q = query(
        collection(db, TRAVEL_COLLECTION),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const travels: TravelPlan[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        travels.push({
          id: doc.id,
          userId: data.userId,
          destination: data.destination,
          dateDepart: data.dateDepart,
          dateRetour: data.dateRetour,
          nombreVoyageurs: data.nombreVoyageurs,
          notes: data.notes || '',
          activities: data.activities || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });
      
      return travels;
    } catch (error) {
      console.error('Erreur lors de la récupération des voyages:', error);
      throw error;
    }
  },

  // Récupérer un voyage spécifique
  async getTravelById(travelId: string): Promise<TravelPlan | null> {
    try {
      const docRef = doc(db, TRAVEL_COLLECTION, travelId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        destination: data.destination,
        dateDepart: data.dateDepart,
        dateRetour: data.dateRetour,
        nombreVoyageurs: data.nombreVoyageurs,
        notes: data.notes || '',
        activities: data.activities || [],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    } catch (error) {
      console.error('Erreur lors de la récupération du voyage:', error);
      throw error;
    }
  },

  // Mettre à jour un voyage
  async updateTravel(travelId: string, updateData: Partial<TravelPlanInput>): Promise<void> {
    try {
      const docRef = doc(db, TRAVEL_COLLECTION, travelId);
      await updateDoc(docRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du voyage:', error);
      throw error;
    }
  },

  // Supprimer un voyage
  async deleteTravel(travelId: string): Promise<void> {
    try {
      const docRef = doc(db, TRAVEL_COLLECTION, travelId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Erreur lors de la suppression du voyage:', error);
      throw error;
    }
  }
}; 