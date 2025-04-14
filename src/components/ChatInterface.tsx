'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { interpretTravelRequest, detectBasicTravelInfo } from '@/ai/flows/interpret-travel-request';
import { analyzeBrowserContent } from '@/ai/flows/analyze-browser-content';
import { doc, getDoc, updateDoc, getFirestore, serverTimestamp, addDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useBrowserAgent } from '@/hooks/useBrowserAgent';
import { Pencil, Save, FileText, Plus, Calendar, MapPin, Users, AlertCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Trip, Note } from '@/lib/types';
import * as noteService from '@/services/noteService';

// Configuration pour Ollama (réactivé)
const OLLAMA_API_URL = 'http://localhost:11434/api';
const USE_OLLAMA = true; // Réactiver Ollama

// Interface pour la demande de voyage
interface TravelRequest {
  isValid: boolean;
  destination?: string;
  startDate?: string;
  endDate?: string;
  numPeople?: number;
  activities?: string[];
  budget?: string;
  context?: string;
}

// Fonctions pour l'agent intelligent
interface AgentDetection {
  hasItinerary: boolean;
  hasReservation: boolean;
  hasActivity: boolean;
  hasTravelInfo: boolean;
  destination?: string;
  startDate?: string;
  endDate?: string;
  numPeople?: number;
  budget?: string;
  preferences?: string;
  activities?: string[];
}

// Typage pour un nouveau voyage
interface NewTravelData {
  destination: string;
  dateDepart: string;
  dateRetour: string;
  nombreVoyageurs: number;
  notes?: string;
}

// Interface pour les données de voyage
interface Travel {
  id: string;
  destination: string;
  dateDepart: string;
  dateRetour: string;
  nombreVoyageurs: number;
  notes?: string;
  userId: string;
  [key: string]: any;
}

// Dans la partie des interfaces, ajouter cette fonction
interface ChatInterfaceProps {
  onDeleteTravel?: (travelId: string) => Promise<boolean>;
}

// Fonction pour vérifier la connexion à Firestore
const checkFirestoreConnection = async () => {
  try {
    console.log("Test de connexion à Firestore...");
    const testCollection = collection(db, 'travels');
    const testSnapshot = await getDocs(testCollection);
    
    console.log("Connexion à Firestore réussie, documents trouvés:", testSnapshot.size);
    return true;
  } catch (error) {
    console.error("Erreur lors du test de connexion à Firestore:", error);
    if (error instanceof Error) {
      console.error("Message d'erreur:", error.message);
      console.error("Stack trace:", error.stack);
    }
    return false;
  }
};

export const ChatInterface = (props: ChatInterfaceProps = {}) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Array<{ text: string; sender: 'user' | 'assistant' }>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [tripData, setTripData] = useState<Trip | null>(null);
  const [currentTravelId, setCurrentTravelId] = useState<string | null>(null);
  const [travelNotes, setTravelNotes] = useState<string>('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showCreateTravelModal, setShowCreateTravelModal] = useState(false);
  const [detectedTravelInfo, setDetectedTravelInfo] = useState<Partial<NewTravelData>>({});
  const [isOllamaDetecting, setIsOllamaDetecting] = useState(false);
  
  // Référence pour suivre les derniers messages de l'assistant
  const lastAssistantMessages = useRef<string[]>([]);
  
  // Utiliser notre hook d'agent de navigation
  const {
    initialize,
    navigate,
    analyzeContent,
    taskResult,
    isLoading,
    error
  } = useBrowserAgent();

  // Fonction pour récupérer les données du voyage depuis Firestore
  const fetchTripData = useCallback(async () => {
    try {
      // Récupérer l'ID du voyage depuis le localStorage ou l'URL
      const tripId = localStorage.getItem('currentTripId') || new URLSearchParams(window.location.search).get('travelId');
      
      if (!tripId) {
        // Si aucun ID de voyage n'est trouvé, afficher un message et revenir au tableau de bord
        setMessages([{ 
          text: "Aucune information de voyage trouvée. Vous pouvez commencer une conversation pour planifier un nouveau voyage.", 
          sender: 'assistant' 
        }]);
        return null;
      }
      
      setCurrentTravelId(tripId);
      
      // Récupérer les données du voyage depuis Firestore
      const travelRef = doc(db, 'travels', tripId);
      const travelSnapshot = await getDoc(travelRef);
      
      if (!travelSnapshot.exists()) {
        setMessages([{ 
          text: "Ce voyage n'existe plus. Veuillez retourner au tableau de bord pour planifier un nouveau voyage.", 
          sender: 'assistant' 
        }]);
        return null;
      }
      
      const travelData = { 
        id: travelSnapshot.id, 
        userId: travelSnapshot.data().userId || user?.uid || '',
        destination: travelSnapshot.data().destination || '',
        startDate: travelSnapshot.data().startDate || travelSnapshot.data().dateDepart || '',
        endDate: travelSnapshot.data().endDate || travelSnapshot.data().dateRetour || '',
        numPeople: travelSnapshot.data().numPeople || travelSnapshot.data().nombreVoyageurs || 1,
        createdAt: travelSnapshot.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        status: travelSnapshot.data().status || 'pending',
        notes: travelSnapshot.data().notes || ''
      } as unknown as Trip;
      
      // Mettre à jour les notes du voyage dans l'état local
      if (travelData.notes) {
        setTravelNotes(typeof travelData.notes === 'string' ? travelData.notes : '');
      }
      
      return travelData;
    } catch (error) {
      console.error('Erreur lors de la récupération des données du voyage:', error);
      setMessages([{ 
        text: "Une erreur est survenue lors de la récupération des informations de voyage. Veuillez réessayer.", 
        sender: 'assistant' 
      }]);
      return null;
    }
  }, [user]);

  // Fonction pour appeler Ollama pour détecter une demande de voyage (maintenant désactivée par défaut)
  const detectTravelRequestWithOllama = async (userMessage: string): Promise<TravelRequest> => {
    try {
      // Si Ollama est désactivé, retourner directement une réponse par défaut
      if (!USE_OLLAMA) {
        console.error("Ollama est désactivé, utilisation de l'analyse locale");
        return { isValid: false };
      }
      
      setIsOllamaDetecting(true);
      
      // Construire le prompt pour Ollama
      const prompt = `
        Analyse le message suivant et détermine s'il s'agit d'une demande de voyage ou non.
        Si c'est une demande de voyage, extrais les informations pertinentes.
        
        Message: "${userMessage}"
        
        Format de réponse (JSON uniquement):
        {
          "isValid": true/false, // vrai s'il s'agit d'une demande de voyage
          "destination": "nom de la destination", // si détectée
          "startDate": "date de début", // si détectée
          "endDate": "date de fin", // si détectée
          "numPeople": nombre, // si détecté
          "activities": ["activité 1", "activité 2"], // si détectées
          "budget": "budget mentionné", // si détecté
          "context": "contexte supplémentaire" // autres informations pertinentes
        }
      `;
      
      // Appeler l'API Ollama
      const response = await fetch(`${OLLAMA_API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3', // Utiliser votre modèle Ollama préféré
          prompt: prompt,
          stream: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur API Ollama: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extraire la réponse JSON de Ollama
      let jsonResponse: TravelRequest;
      try {
        // Essayer de trouver et de parser le JSON dans la réponse
        const jsonMatch = data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonResponse = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Pas de JSON trouvé");
        }
      } catch (e) {
        console.error("Erreur de parsing JSON:", e);
        // Réponse par défaut si le parsing échoue
        jsonResponse = { isValid: false };
      }
      
      console.log("Résultat de la détection Ollama:", jsonResponse);
      return jsonResponse;
      
    } catch (error) {
      console.error("Erreur lors de la détection avec Ollama:", error);
      return { isValid: false };
    } finally {
      setIsOllamaDetecting(false);
    }
  };

  // Fonction pour créer un voyage à partir d'une détection Ollama
  const createTravelFromOllamaDetection = async (detection: TravelRequest, messageText: string) => {
    if (!detection.isValid || !detection.destination) return null;
    
    try {
      // Formater les données du voyage
      const newTravelData: NewTravelData = {
        destination: detection.destination,
        dateDepart: detection.startDate || new Date().toISOString().split('T')[0],
        dateRetour: detection.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        nombreVoyageurs: detection.numPeople || 1,
        notes: `Voyage détecté automatiquement:\n\n${messageText}\n\n` +
          (detection.activities?.length ? `Activités: ${detection.activities.join(', ')}\n` : '') +
          (detection.budget ? `Budget: ${detection.budget}\n` : '') +
          (detection.context ? `Contexte: ${detection.context}` : '')
      };
      
      // Demander confirmation à l'utilisateur
      const shouldCreateTravel = window.confirm(
        `J'ai détecté une demande de voyage pour ${detection.destination}. Souhaitez-vous créer une nouvelle fiche de voyage?`
      );
      
      if (shouldCreateTravel) {
        const newTravelId = await createNewTravel(newTravelData);
        
        if (newTravelId) {
          // Mettre à jour le contexte de la conversation
          setCurrentTravelId(newTravelId);
          setTravelNotes(newTravelData.notes || '');
          
          // Informer l'utilisateur
          setMessages(prev => [...prev, { 
            text: `J'ai créé un nouveau voyage à ${newTravelData.destination} et j'ai enregistré ces informations.`, 
            sender: 'assistant' 
          }]);
          
          return newTravelId;
        }
      }
      
      return null;
    } catch (error) {
      console.error("Erreur lors de la création du voyage à partir de la détection Ollama:", error);
      return null;
    }
  };

  // Fonction pour lancer la recherche automatisée
  const startAutomatedSearch = useCallback(async (tripData: any) => {
    if (!tripData) return;
    
    try {
      setIsSearching(true);
      
      // Message initial
      setMessages([{ 
        text: `Bonjour ! Je vais vous aider à planifier votre voyage à ${tripData.destination} du ${tripData.startDate} au ${tripData.endDate} pour ${tripData.numPeople} personne(s). Je commence mes recherches...`, 
        sender: 'assistant' 
      }]);
      
      // Initialiser l'agent de navigation
      await initialize({ headless: false });
      
      // Naviguer vers un site de voyage (exemple avec Booking.com)
      setMessages(prev => [...prev, { 
        text: "Je consulte Booking.com pour trouver des hébergements qui correspondent à vos dates...", 
        sender: 'assistant' 
      }]);
      
      await navigate(`https://www.booking.com/searchresults.fr.html?ss=${encodeURIComponent(tripData.destination)}&checkin=${tripData.startDate}&checkout=${tripData.endDate}&group_adults=${tripData.numPeople}`);
      
      // Analyser le contenu de la page
      setMessages(prev => [...prev, { 
        text: "Analyse des résultats...", 
        sender: 'assistant' 
      }]);
      
      const analysis = await analyzeContent();
      
      // Afficher les résultats
      setMessages(prev => [...prev, { 
        text: `Voici ce que j'ai trouvé sur Booking.com:\n\n${analysis}`, 
        sender: 'assistant' 
      }]);
      
      // Message de suivi
      setMessages(prev => [...prev, { 
        text: "Avez-vous des préférences particulières pour affiner cette recherche ? Par exemple, souhaitez-vous un quartier spécifique, un budget particulier, ou certains équipements ?", 
        sender: 'assistant' 
      }]);
      
      } catch (error) {
      console.error('Erreur lors de la recherche automatisée:', error);
      setMessages(prev => [...prev, { 
        text: "Je n'ai pas pu effectuer la recherche automatisée. Vous pouvez me dire ce que vous recherchez pour votre voyage et je vous aiderai.", 
        sender: 'assistant' 
      }]);
    } finally {
      setIsSearching(false);
    }
  }, [initialize, navigate, analyzeContent]);

  // Charger les données du voyage et lancer la recherche automatisée au chargement
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
      return;
    }

    const initSearch = async () => {
      const data = await fetchTripData();
      if (data) {
        setTripData(data);
        startAutomatedSearch(data);
      }
    };

    if (!loading && user) {
      initSearch();
    }
  }, [loading, user, router, fetchTripData, startAutomatedSearch]);

  // Fonction pour mettre à jour les notes de voyage
  const updateTravelNotes = async (noteContent: string) => {
    if (!currentTravelId || !user) return false;
    
    try {
      setIsSavingNotes(true);
      
      // Mettre à jour les notes dans Firestore
      const travelRef = doc(db, 'travels', currentTravelId);
      await updateDoc(travelRef, {
        notes: noteContent,
        updatedAt: serverTimestamp()
      });
      
      // Mettre à jour l'état local
      setTravelNotes(noteContent);
      
      toast({
        title: "Notes mises à jour",
        description: "Les notes de voyage ont été enregistrées avec succès",
        variant: "default",
      });
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des notes:', error);
      
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les notes",
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsSavingNotes(false);
    }
  };

  const generateNoteFromMessage = async (message: string) => {
    if (!tripData) return;
    
    try {
      // Extraire le contenu utile du message
      const noteContent = message.replace(/^Traitement de votre demande\.\.\./, '').trim();
      
      if (!noteContent) return;
      
      // Créer une nouvelle note dans Firestore
      const newNote = {
        userId: user?.uid as string,
        tripId: tripData.id as string,
        title: `Note du ${new Date().toLocaleDateString('fr-FR')}`,
        content: noteContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        isImportant: false
      };
      
      // Ajouter la note à Firestore via le service
      await noteService.addNote(newNote);
      
      // Notification à l'utilisateur
      setMessages(prev => [...prev, { 
        text: "J'ai créé une note avec ces informations pour vous. Vous pouvez la retrouver dans la section notes.", 
        sender: 'assistant' 
      }]);
    } catch (error) {
      console.error('Erreur lors de la création de la note:', error);
    }
  };

  // Vérifier la connexion Firestore au chargement
  useEffect(() => {
    const verifyFirestore = async () => {
      const isConnected = await checkFirestoreConnection();
      console.log("Statut de connexion Firestore:", isConnected ? "Connecté" : "Non connecté");
      
      if (!isConnected) {
        toast({
          title: "Erreur de connexion",
          description: "Impossible de se connecter à la base de données. Veuillez vérifier votre connexion internet.",
          variant: "destructive",
        });
      }
    };
    
    verifyFirestore();
  }, [toast]);

  // Fonction pour créer un nouveau voyage
  const createNewTravel = async (travelData: NewTravelData) => {
    if (!user) {
      console.error("Impossible de créer un voyage: aucun utilisateur connecté");
      alert("Erreur: Utilisateur non connecté");
      return null;
    }
    
    try {
      console.error("DÉBUT DE CRÉATION D'UN NOUVEAU VOYAGE:", travelData);
      alert("Début de création du voyage à " + travelData.destination);
      
      // Créer un nouveau document de voyage dans Firestore
      const newTravel = {
        ...travelData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'pending' // Ajouter un statut par défaut pour respecter le schéma Trip
      };
      
      console.error("Données prêtes pour Firestore:", newTravel);
      
      const travelRef = await addDoc(collection(db, 'travels'), newTravel);
      
      console.error("VOYAGE CRÉÉ AVEC SUCCÈS AVEC L'ID:", travelRef.id);
      alert("Voyage créé avec succès. ID: " + travelRef.id);
      
      // Mettre à jour l'état local
      setCurrentTravelId(travelRef.id);
      setTravelNotes(travelData.notes || '');
      
      toast({
        title: "Voyage créé avec succès",
        description: `Votre voyage à ${travelData.destination} a été créé`,
        variant: "default",
      });
      
      return travelRef.id;
    } catch (error) {
      console.error('ERREUR LORS DE LA CRÉATION DU VOYAGE:', error);
      alert("Erreur lors de la création du voyage: " + (error instanceof Error ? error.message : "erreur inconnue"));
      
      // Afficher plus de détails sur l'erreur
      if (error instanceof Error) {
        console.error('Message d\'erreur:', error.message);
        console.error('Stack trace:', error.stack);
      }
      
      toast({
        title: "Erreur",
        description: "Impossible de créer le voyage",
        variant: "destructive",
      });
      
      return null;
    }
  };
  
  // Agent intelligent pour analyser le contenu des messages
  const analyzeMessageContent = useCallback((text: string): AgentDetection => {
    const detection: AgentDetection = {
      hasItinerary: false,
      hasReservation: false,
      hasActivity: false,
      hasTravelInfo: false
    };
    
    // Détecter les informations de voyage
    const destinationRegex = /(?:à|à destination de|vers|pour|visiter)\s+([A-Z][a-zÀ-ÿ]+(?:[\s'-][A-Z][a-zÀ-ÿ]+)*)/i;
    const destinationMatch = text.match(destinationRegex);
    if (destinationMatch) {
      detection.destination = destinationMatch[1].trim();
      detection.hasTravelInfo = true;
    }
    
    // Détecter les mentions de voyages
    const travelIntent = /(?:voyage|séjour|vacances|partir|visiter|découvrir|explorer)/i.test(text);
    if (travelIntent) {
      detection.hasTravelInfo = true;
    }
    
    // Détecter les dates
    const datePattern = /(?:du|le|pour le)\s+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{2,4})\s+(?:au|jusqu'au|jusqu'à)\s+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{2,4})/i;
    const dateMatch = text.match(datePattern);
    if (dateMatch) {
      detection.startDate = dateMatch[1].trim();
      detection.endDate = dateMatch[2].trim();
      detection.hasTravelInfo = true;
    }
    
    // Détecter les dates simples (sans plage)
    const singleDatePattern = /(?:(?:le|partir le|arriver le|voyager le|départ le)\s+)(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{2,4})/i;
    const singleDateMatch = text.match(singleDatePattern);
    if (singleDateMatch && !dateMatch) {
      detection.startDate = singleDateMatch[1].trim();
      // Par défaut, ajouter 7 jours pour la date de fin
      detection.hasTravelInfo = true;
    }
    
    // Détecter les durées
    const durationPattern = /(?:pour|pendant|durant)\s+(\d+)\s+(?:jour|jours|semaine|semaines|nuit|nuits)/i;
    const durationMatch = text.match(durationPattern);
    if (durationMatch && detection.startDate && !detection.endDate) {
      // Si nous avons une date de début et une durée, calculer la date de fin
      detection.hasTravelInfo = true;
    }
    
    // Détecter le nombre de voyageurs
    const peoplePattern = /(?:pour|avec)\s+(\d+)\s+(?:personne|personnes|voyageur|voyageurs|adulte|adultes|enfant|enfants)/i;
    const peopleMatch = text.match(peoplePattern);
    if (peopleMatch) {
      detection.numPeople = parseInt(peopleMatch[1], 10);
      detection.hasTravelInfo = true;
    }
    
    // Détecter le budget
    const budgetPattern = /(?:budget|coût|prix|montant|dépenser).*?(\d+\s*(?:€|euros|EUR|dollars|\$|USD))/i;
    const budgetMatch = text.match(budgetPattern);
    if (budgetMatch) {
      detection.budget = budgetMatch[1].trim();
      detection.hasTravelInfo = true;
    }
    
    // Détecter les préférences de voyage
    const prefsPattern = /(?:préfère|souhaite|aimerai|voudrais|aimerais|veux).*?(hôtel|airbnb|auberge|camping|luxe|économique|confort|familial|romantique|aventure|détente|culturel|gastronomique)/i;
    const prefsMatch = text.match(prefsPattern);
    if (prefsMatch) {
      detection.preferences = prefsMatch[1].trim();
      detection.hasTravelInfo = true;
    }
    
    // Détecter les itinéraires
    detection.hasItinerary = /(?:itinéraire|programme|planning|jour\s+\d+|journée\s+\d+|matin|après-midi|soir|visite[rz]?|explore[rz]?)/i.test(text);
    
    // Détecter les réservations
    detection.hasReservation = /(?:réserv(?:ation|é|er)|hôtel|restaurant|table|chambre|vol|avion|train|billet)/i.test(text);
    
    // Détecter les activités
    detection.hasActivity = /(?:activité|visite|musée|monument|parc|plage|randonnée|excursion|tour|découverte|expérience)/i.test(text);
    
    return detection;
  }, []);
  
  // Traitement automatique des réponses d'Ollama
  const processAssistantMessage = useCallback(async (messageText: string) => {
    if (!messageText || messageText.length < 50) return;
    
    // Mise à jour de l'historique des messages de l'assistant
    lastAssistantMessages.current = [...lastAssistantMessages.current.slice(-4), messageText];
    
    // Analyser le dernier message
    const currentAnalysis = analyzeMessageContent(messageText);
    
    // Vérifier si le message contient des informations pertinentes pour les notes de voyage
    if (currentAnalysis.hasItinerary || currentAnalysis.hasReservation || currentAnalysis.hasActivity) {
      if (currentTravelId) {
        // Si un voyage existe déjà, proposer d'ajouter aux notes
        const shouldAddToNotes = window.confirm(
          "J'ai détecté des informations utiles pour votre voyage dans notre conversation. Souhaitez-vous les ajouter à vos notes de voyage?"
        );
        
        if (shouldAddToNotes) {
          // Formater intelligemment en extrayant le contenu pertinent
          let noteContent = "Informations ajoutées automatiquement:\n\n";
          
          if (currentAnalysis.hasItinerary) {
            noteContent += "📍 ITINÉRAIRE/PROGRAMME:\n";
            // Extraction intelligente des paragraphes pertinents
            const itineraryPattern = /(jour\s+\d+|journée\s+\d+|matin|après-midi|soir).*?(?=\n\n|\n(jour\s+\d+|journée\s+\d+|matin|après-midi|soir)|$)/gi;
            const itineraryMatches = messageText.match(itineraryPattern);
            
            if (itineraryMatches) {
              noteContent += itineraryMatches.join("\n\n") + "\n\n";
            } else {
              // Si pas de structure claire, ajouter simplement le message
              noteContent += messageText + "\n\n";
            }
          }
          
          if (currentAnalysis.hasReservation) {
            noteContent += "🏨 RÉSERVATIONS:\n";
            const reservationPattern = /(?:réserv(?:ation|é|er)|hôtel|restaurant|table|chambre|vol|avion|train|billet).*?(?=\n\n|$)/gi;
            const reservationMatches = messageText.match(reservationPattern);
            
            if (reservationMatches) {
              noteContent += reservationMatches.join("\n\n") + "\n\n";
            }
          }
          
          if (currentAnalysis.hasActivity) {
            noteContent += "🎭 ACTIVITÉS:\n";
            const activityPattern = /(?:activité|visite|musée|monument|parc|plage|randonnée|excursion|tour|découverte|expérience).*?(?=\n\n|$)/gi;
            const activityMatches = messageText.match(activityPattern);
            
            if (activityMatches) {
              noteContent += activityMatches.join("\n\n") + "\n\n";
            }
          }
          
          // Mettre à jour les notes
          const updatedNotes = travelNotes 
            ? `${travelNotes}\n\n${noteContent}` 
            : noteContent;
          
          await updateTravelNotes(updatedNotes);
          
          // Informer l'utilisateur du succès
          setMessages(prev => [...prev, { 
            text: "J'ai automatiquement ajouté ces informations à vos notes de voyage.", 
            sender: 'assistant' 
          }]);
        }
      } else if (currentAnalysis.hasTravelInfo) {
        // Si c'est une nouvelle conversation avec des informations de voyage, proposer de créer un voyage
        const detectedInfo: Partial<NewTravelData> = {
          destination: currentAnalysis.destination || "Destination inconnue",
        };
        
        // Tenter de formater les dates
        if (currentAnalysis.startDate) {
          detectedInfo.dateDepart = currentAnalysis.startDate;
        }
        
        if (currentAnalysis.endDate) {
          detectedInfo.dateRetour = currentAnalysis.endDate;
        }
        
        if (currentAnalysis.numPeople) {
          detectedInfo.nombreVoyageurs = currentAnalysis.numPeople;
        } else {
          detectedInfo.nombreVoyageurs = 1; // Par défaut
        }
        
        // Stocker les informations détectées
        setDetectedTravelInfo(detectedInfo);
        
        // Demander à l'utilisateur s'il souhaite créer un nouveau voyage
        const shouldCreateTravel = window.confirm(
          `J'ai détecté des informations sur un voyage à ${detectedInfo.destination}. Souhaitez-vous créer une nouvelle fiche de voyage pour enregistrer ces informations?`
        );
        
        if (shouldCreateTravel) {
          // Créer le voyage avec les notes initiales
          const initialNotes = messageText;
          const newTravelData: NewTravelData = {
            destination: detectedInfo.destination || "Destination inconnue",
            dateDepart: detectedInfo.dateDepart || new Date().toISOString().split('T')[0],
            dateRetour: detectedInfo.dateRetour || new Date().toISOString().split('T')[0],
            nombreVoyageurs: detectedInfo.nombreVoyageurs || 1,
            notes: initialNotes
          };
          
          const newTravelId = await createNewTravel(newTravelData);
          
          if (newTravelId) {
            // Mettre à jour le contexte de la conversation
            setCurrentTravelId(newTravelId);
            setTravelNotes(initialNotes);
            setMessages(prev => [...prev, { 
              text: `J'ai créé un nouveau voyage à ${newTravelData.destination} et j'ai enregistré ces informations dans vos notes.`, 
              sender: 'assistant' 
            }]);
          }
        }
      }
    }
  }, [currentTravelId, travelNotes, analyzeMessageContent, updateTravelNotes, createNewTravel]);

  // Surveiller les nouveaux messages de l'assistant pour analyse
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'assistant') {
        processAssistantMessage(lastMessage.text);
      }
    }
  }, [messages, processAssistantMessage]);

  // Test direct de création de voyage (pour débugger)
  const testCreateTravel = async () => {
    try {
      alert("DÉBUT DU TEST DE CRÉATION DE VOYAGE");
      console.error("DÉBUT DU TEST DE CRÉATION DE VOYAGE");
      
      if (!user || !user.uid) {
        alert("Erreur: utilisateur non connecté.");
        console.error("Utilisateur non connecté");
        return false;
      }
      
      const testData = {
        destination: "Test " + new Date().toISOString().split('T')[0],
        dateDepart: new Date().toISOString().split('T')[0],
        dateRetour: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        nombreVoyageurs: 2,
        notes: "Voyage de test",
        userId: user.uid,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.error("DONNÉES DE TEST:", testData);
      
      // Test direct sur la collection Firestore
      const travelsCollection = collection(db, 'travels');
      const docRef = await addDoc(travelsCollection, testData);
      
      alert("VOYAGE DE TEST CRÉÉ AVEC SUCCÈS: " + docRef.id);
      console.error("VOYAGE DE TEST CRÉÉ:", docRef.id);
      
      return docRef.id;
    } catch (error) {
      alert("ERREUR DU TEST: " + (error instanceof Error ? error.message : String(error)));
      console.error("ERREUR DU TEST:", error);
      return false;
    }
  };

  // Ajouter cette fonction pour supprimer un voyage
  const deleteTravel = async (travelId: string) => {
    if (!travelId || !user) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer ce voyage",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      // Demander confirmation à l'utilisateur
      const shouldDelete = window.confirm(
        "Êtes-vous sûr de vouloir supprimer ce voyage ? Cette action est irréversible."
      );
      
      if (!shouldDelete) return false;
      
      // Si une fonction personnalisée est fournie (par exemple depuis un composant parent)
      if (props.onDeleteTravel) {
        return await props.onDeleteTravel(travelId);
      }
      
      // Sinon, supprimer directement le voyage de Firestore
      const travelRef = doc(db, 'travels', travelId);
      await deleteDoc(travelRef);
      
      // Mettre à jour l'état local
      setCurrentTravelId(null);
      setTravelNotes('');
      
      // Notifier l'utilisateur
      toast({
        title: "Voyage supprimé",
        description: "Le voyage a été supprimé avec succès",
        variant: "default",
      });
      
      // Ajouter un message dans la conversation
      setMessages(prev => [...prev, { 
        text: "Le voyage a été supprimé avec succès. Vous pouvez en créer un nouveau quand vous le souhaitez.", 
        sender: 'assistant' 
      }]);
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du voyage:', error);
      
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le voyage",
        variant: "destructive",
      });
      
      return false;
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === '') {
      return;
    }

    // Ajouter le message de l'utilisateur
    setMessages(prev => [...prev, { text: inputValue, sender: 'user' }]);
    
    const userMessage = inputValue;
    setInputValue('');

    try {
      // Afficher un indicateur de chargement
      setMessages(prev => [...prev, { text: "Traitement de votre demande...", sender: 'assistant' }]);
      
      console.error("ANALYSE DU MESSAGE UTILISATEUR:", userMessage);
      
      // Vérifier si l'utilisateur souhaite supprimer le voyage actuel
      const deleteRegex = /supprimer( ce| le)? voyage/i;
      if (currentTravelId && deleteRegex.test(userMessage)) {
        const success = await deleteTravel(currentTravelId);
        
        if (!success) {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages.pop(); // Supprimer le message "Traitement de votre demande..."
            return [...newMessages, { 
              text: "Je n'ai pas pu supprimer ce voyage. Veuillez réessayer ultérieurement.", 
              sender: 'assistant' 
            }];
          });
        }
        
        return;
      }
      
      // Test direct de création de voyage
      if (userMessage.toLowerCase().includes("test voyage")) {
        console.error("DÉMARRAGE TEST DIRECT");
        
        const testResult = await testCreateTravel();
        
        if (testResult) {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages.pop(); // Supprimer le message "Traitement de votre demande..."
            return [...newMessages, { 
              text: `Test réussi! Voyage créé avec l'ID: ${testResult}`, 
              sender: 'assistant' 
            }];
          });
        } else {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages.pop(); // Supprimer le message "Traitement de votre demande..."
            return [...newMessages, { 
              text: "Le test a échoué. Vérifiez la console et les alertes pour plus de détails.", 
              sender: 'assistant' 
            }];
          });
        }
        return;
      }
      
      // Commandes explicites pour créer un voyage (plus simple et plus direct)
      const directCommands = [
        "creer un voyage",
        "créer un voyage", 
        "nouveau voyage", 
        "organiser un voyage", 
        "planifier un voyage",
        "je veux voyager",
        "je voudrais voyager"
      ];
      
      // Vérifier si le message contient une commande directe
      const hasDirectCommand = directCommands.some(cmd => 
        userMessage.toLowerCase().includes(cmd.toLowerCase())
      );
      
      // Vérifier pour une destination spécifique
      const destinationMatch = userMessage.match(/(?:à|a|en|au|aux|vers|pour)\s+([A-Z][a-zÀ-ÿ]+(?:[\s'-][A-Z][a-zÀ-ÿ]+)*)/i);
      const destination = destinationMatch ? destinationMatch[1].trim() : null;
      
      // Vérifier pour des dates
      const dateMatch = userMessage.match(/(?:du|le|pour le)\s+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{2,4})\s+(?:au|jusqu'au|jusqu'à)\s+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{2,4})/i);
      const startDate = dateMatch ? dateMatch[1].trim() : null;
      const endDate = dateMatch ? dateMatch[2].trim() : null;
      
      // Vérifier pour le nombre de personnes
      const peopleMatch = userMessage.match(/(?:pour|avec)\s+(\d+)\s+(?:personne|personnes|voyageur|voyageurs|adulte|adultes|enfant|enfants)/i);
      const numPeople = peopleMatch ? parseInt(peopleMatch[1], 10) : null;
      
      // Déterminer si c'est une intention de voyage
      const isVoyageRequest = hasDirectCommand || 
                             (destination && (dateMatch || peopleMatch)) || 
                             (destination && userMessage.includes("voyage"));
      
      // Si aucun voyage actif et intention de voyage détectée, créer un nouveau voyage
      if (!currentTravelId && isVoyageRequest) {
        console.log("Intention de voyage détectée");
        
        // Définir une destination par défaut si aucune n'est détectée
        const finalDestination = destination || "Destination à préciser";
        
        // Définir des dates par défaut si aucune n'est détectée
        const today = new Date();
        const oneWeekLater = new Date();
        oneWeekLater.setDate(today.getDate() + 7);
        
        const formattedStartDate = startDate || today.toISOString().split('T')[0];
        const formattedEndDate = endDate || oneWeekLater.toISOString().split('T')[0];
        
        // Créer les notes initiales
        let contextNotes = `Voyage créé à partir de la demande:\n\n"${userMessage}"\n\n`;
        contextNotes += `Destination: ${finalDestination}\n`;
        contextNotes += `Date de départ: ${formattedStartDate}\n`;
        contextNotes += `Date de retour: ${formattedEndDate}\n`;
        
        if (numPeople) {
          contextNotes += `Nombre de personnes: ${numPeople}\n`;
        }
        
        // Créer l'objet de données de voyage
        const newTravelData: NewTravelData = {
          destination: finalDestination,
          dateDepart: formattedStartDate,
          dateRetour: formattedEndDate,
          nombreVoyageurs: numPeople || 1,
          notes: contextNotes
        };
        
        console.log("Données de voyage:", newTravelData);
        
        // Tenter de créer le voyage directement sans demander confirmation (simplification)
        console.log("Création automatique du voyage...");
        const newTravelId = await createNewTravel(newTravelData);
        
        if (newTravelId) {
          // Mettre à jour le contexte de la conversation
          setCurrentTravelId(newTravelId);
          setTravelNotes(contextNotes);
          
          // Informer l'utilisateur
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages.pop(); // Supprimer le message "Traitement de votre demande..."
            return [...newMessages, { 
              text: `J'ai créé un nouveau voyage à ${finalDestination}. Voici les détails enregistrés :
              
Destination: ${finalDestination}
Date de départ: ${formattedStartDate}
Date de retour: ${formattedEndDate}
${numPeople ? `Nombre de personnes: ${numPeople}` : ''}

Vous pouvez maintenant me poser des questions sur ce voyage ou me demander des suggestions!`, 
              sender: 'assistant' 
            }];
          });
          
          // Générer un itinéraire après un court délai
          setTimeout(() => {
            generateTravelItinerary(finalDestination, formattedStartDate, formattedEndDate, numPeople || 1);
          }, 1000);
          
          return;
        } else {
          // Si la création a échoué, informer l'utilisateur
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages.pop(); // Supprimer le message "Traitement de votre demande..."
            return [...newMessages, { 
              text: "Je n'ai pas pu créer de voyage à cause d'une erreur technique. Veuillez réessayer ultérieurement.", 
              sender: 'assistant' 
            }];
          });
          return;
        }
      }
      
      // ... rest of the existing code ...

      // Interpréter la demande de voyage
      const travelRequest = await interpretTravelRequest({ request: userMessage });
      
      // Remplacer l'indicateur de chargement par la réponse
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); // Supprimer le message "Traitement de votre demande..."
        
        // Ajouter la réponse avec les détails du voyage
        let responseText = "Voici ce que j'ai compris de votre demande :";
        
        if (travelRequest.destination) {
          responseText += `\n- Destination : ${travelRequest.destination}`;
        }
        
        if (travelRequest.startDate) {
          responseText += `\n- Date de départ : ${travelRequest.startDate}`;
        }
        
        if (travelRequest.endDate) {
          responseText += `\n- Date de retour : ${travelRequest.endDate}`;
        }
        
        responseText += "\n\nJe vais rechercher des options pour vous. Avez-vous des préférences particulières pour le logement ou les activités ?";
        
        return [...newMessages, { text: responseText, sender: 'assistant' }];
      });
      
      // Créer une note automatiquement si le message commence par "note:"
      if (userMessage.toLowerCase().startsWith('note:')) {
        const noteContent = userMessage.substring(5).trim();
        
        if (noteContent) {
          // Créer une nouvelle note
          const newNote = {
            userId: user?.uid as string,
            tripId: tripData?.id as string,
            title: `Note du ${new Date().toLocaleDateString('fr-FR')}`,
            content: noteContent,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [],
            isImportant: false
          };
          
          // Ajouter la note à Firestore
          await noteService.addNote(newNote);
          
          // Informer l'utilisateur
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages.pop(); // Supprimer le message "Traitement de votre demande..."
            return [...newMessages, { 
              text: "J'ai créé une note avec votre message. Vous pouvez la retrouver dans la section notes.", 
              sender: 'assistant' 
            }];
          });
          
          return;
        }
      }
      
    } catch (error) {
      console.error('Erreur lors du traitement du message:', error);
      
      // Afficher plus de détails sur l'erreur
      if (error instanceof Error) {
        console.error('Message d\'erreur:', error.message);
        console.error('Stack trace:', error.stack);
      }
      
      // Remplacer l'indicateur de chargement par un message d'erreur
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); // Supprimer le message "Traitement de votre demande..."
        return [...newMessages, { 
          text: "Je suis désolé, une erreur est survenue lors du traitement de votre demande. Veuillez réessayer.", 
          sender: 'assistant' 
        }];
      });
    }
  };

  // Génération d'un itinéraire de voyage basé sur les informations détectées
  const generateTravelItinerary = async (destination: string, startDate: string, endDate: string, numPeople: number) => {
    if (!destination || destination === "destination non spécifiée") return;
    
    try {
      // Ajouter un message d'attente
      setMessages(prev => [...prev, { 
        text: `Je prépare des suggestions pour votre voyage à ${destination}...`, 
        sender: 'assistant' 
      }]);
      
      // Calculer la durée du voyage
      const start = new Date(startDate);
      const end = new Date(endDate);
      const durationInDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Préparer un itinéraire simple
      let itinerary = `# Itinéraire suggéré pour ${destination}\n\n`;
      
      // Jour d'arrivée
      itinerary += `## Jour 1 (${new Date(startDate).toLocaleDateString('fr-FR')})\n`;
      itinerary += `- Arrivée à ${destination}\n`;
      itinerary += `- Installation à l'hôtel\n`;
      itinerary += `- Exploration des environs pour se familiariser avec le lieu\n`;
      itinerary += `- Dîner dans un restaurant local\n\n`;
      
      // Jours intermédiaires
      for (let day = 2; day < durationInDays; day++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + day - 1);
        
        itinerary += `## Jour ${day} (${currentDate.toLocaleDateString('fr-FR')})\n`;
        
        // Alterner les activités selon les jours
        if (day % 2 === 0) {
          itinerary += `- Visite des attractions principales\n`;
          itinerary += `- Déjeuner au marché local\n`;
          itinerary += `- Après-midi libre pour explorer\n`;
        } else {
          itinerary += `- Excursion dans les environs\n`;
          itinerary += `- Activité culturelle\n`;
          itinerary += `- Soirée détente\n`;
        }
        itinerary += `\n`;
      }
      
      // Jour de départ
      itinerary += `## Jour ${durationInDays} (${new Date(endDate).toLocaleDateString('fr-FR')})\n`;
      itinerary += `- Dernières visites si le temps le permet\n`;
      itinerary += `- Préparation au départ\n`;
      itinerary += `- Départ de ${destination}\n\n`;
      
      // Ajouter des conseils généraux
      itinerary += `## Conseils pratiques\n`;
      itinerary += `- Vérifiez les documents de voyage requis\n`;
      itinerary += `- Réservez votre hébergement à l'avance\n`;
      itinerary += `- Renseignez-vous sur la météo locale\n`;
      
      // Ajouter l'itinéraire aux notes du voyage
      if (currentTravelId) {
        const updatedNotes = travelNotes 
          ? `${travelNotes}\n\n${itinerary}` 
          : itinerary;
        
        await updateTravelNotes(updatedNotes);
      }
      
      // Envoyer l'itinéraire comme message
      setMessages(prev => {
        // Remplacer le message d'attente par l'itinéraire
        const newMessages = [...prev];
        newMessages.pop(); // Supprimer le message "Je prépare des suggestions..."
        
        return [...newMessages, { 
          text: `Voici un itinéraire suggéré pour votre voyage à ${destination} du ${new Date(startDate).toLocaleDateString('fr-FR')} au ${new Date(endDate).toLocaleDateString('fr-FR')} pour ${numPeople} personne(s):\n\n${itinerary}`, 
          sender: 'assistant' 
        }];
      });
      
    } catch (error) {
      console.error("Erreur lors de la génération de l'itinéraire:", error);
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-6 space-y-5 bg-gradient-to-br from-green-50 to-beige-50 rounded-2xl shadow-lg">
      {currentTravelId && (
        <>
          {/* En-tête du voyage avec le bouton de suppression */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100 mb-2">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-teal-700">
                {tripData ? `Voyage à ${tripData.destination}` : 'Voyage actif'}
              </h3>
              <Button 
                onClick={() => deleteTravel(currentTravelId)} 
                variant="destructive" 
                size="sm"
                className="flex items-center bg-red-500 hover:bg-red-600 text-white"
              >
                <Trash2 className="h-4 w-4 mr-1" /> Supprimer ce voyage
              </Button>
            </div>
            
            {tripData && (
              <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-3">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-teal-600" />
                  <span>Du {new Date(tripData.startDate.toString()).toLocaleDateString('fr-FR')} au {new Date(tripData.endDate.toString()).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1 text-teal-600" />
                  <span>{tripData.numPeople} {tripData.numPeople > 1 ? 'personnes' : 'personne'}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Section Notes de voyage */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium text-teal-700">Notes de voyage</h3>
              <div className="flex space-x-2">
                {!isEditingNotes ? (
                  <Button 
                    onClick={() => setIsEditingNotes(true)} 
                    variant="outline" 
                    size="sm"
                    className="flex items-center"
                  >
                    <Pencil className="h-4 w-4 mr-1" /> Modifier les notes
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={async () => {
                        await updateTravelNotes(travelNotes);
                        setIsEditingNotes(false);
                      }} 
                      variant="outline" 
                      size="sm"
                      disabled={isSavingNotes}
                      className="flex items-center"
                    >
                      <Save className="h-4 w-4 mr-1" /> Enregistrer
                    </Button>
                    <Button 
                      onClick={() => setIsEditingNotes(false)} 
                      variant="outline" 
                      size="sm"
                      className="flex items-center"
                    >
                      Annuler
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {!isEditingNotes ? (
              <div className="bg-gray-50 p-3 rounded-md whitespace-pre-wrap max-h-40 overflow-y-auto text-sm">
                {travelNotes ? travelNotes : 'Aucune note pour ce voyage.'}
              </div>
            ) : (
              <Textarea 
                value={travelNotes}
                onChange={(e) => setTravelNotes(e.target.value)}
                className="min-h-[120px]"
                placeholder="Ajoutez vos notes de voyage ici..."
              />
            )}
          </div>
        </>
      )}
      
      <div className="flex-grow overflow-y-auto space-y-3 p-2">
        {messages.length > 0 ? (
          messages.map((message, index) => (
          <div
            key={index}
              className={`px-4 py-3 rounded-xl ${
                message.sender === 'user' 
                  ? 'bg-teal-100 text-gray-800 ml-auto' 
                  : 'bg-white text-gray-800'
              } shadow-md text-sm max-w-[80%] ${
                message.sender === 'user' ? 'ml-auto' : 'mr-auto'
              } relative group`}
            >
              {message.text}
              
              {message.sender === 'assistant' && message.text.length > 30 && (
                <button
                  onClick={() => generateNoteFromMessage(message.text)}
                  className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 hover:bg-gray-200 p-1 rounded-full"
                  title="Créer une note à partir de ce message"
                >
                  <Pencil className="h-4 w-4 text-gray-600" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 italic">
              {loading || isSearching || isOllamaDetecting
                ? "Chargement en cours..." 
                : "Aucun message. Commencez à discuter avec l'assistant de voyage."}
            </p>
          </div>
        )}
        
        {(isSearching || isOllamaDetecting) && (
          <div className="flex items-center justify-center">
            <div className="animate-pulse flex space-x-2">
              <div className="h-2 w-2 bg-teal-500 rounded-full"></div>
              <div className="h-2 w-2 bg-teal-500 rounded-full"></div>
              <div className="h-2 w-2 bg-teal-500 rounded-full"></div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex space-x-3">
        <Textarea
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Posez vos questions sur votre voyage..."
          className="flex-grow rounded-md border-green-200 bg-white text-gray-700 shadow-sm focus:border-green-400 focus:ring-green-400"
          disabled={isSearching || isOllamaDetecting}
        />
        <Button
          onClick={handleSendMessage}
          className="bg-gradient-to-r from-teal-400 to-green-500 text-white font-semibold rounded-md shadow-md hover:from-teal-500 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1"
          disabled={isSearching || isOllamaDetecting || inputValue.trim() === ''}
        >
          Envoyer
        </Button>
      </div>
    </div>
  );
};

