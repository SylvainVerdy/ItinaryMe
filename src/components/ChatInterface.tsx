'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { interpretTravelRequest } from '@/ai/flows/interpret-travel-request';
import { analyzeBrowserContent } from '@/ai/flows/analyze-browser-content';
import { doc, getDoc, updateDoc, getFirestore, serverTimestamp, addDoc, collection, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useBrowserAgent } from '@/hooks/useBrowserAgent';
import { Pencil, Save, FileText, Plus, Calendar, MapPin, Users, AlertCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Trip, Note } from '@/lib/types';
import * as noteService from '@/services/noteService';

// Configuration pour Ollama (réactivé)
const OLLAMA_API_URL = 'http://localhost:11434/api';
const USE_OLLAMA = true;
const OLLAMA_MODEL = 'qwen3.5:9b';

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

// Interface pour les préférences utilisateur
interface UserPreferences {
  accommodationTypes?: string[];
  activities?: string[];
  foodPreferences?: string[];
  transportModes?: string[];
  budgetLevel?: string;
  accessibility?: string[];
  interests?: string[];
  travelStyle?: string;
  [key: string]: any;
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

// Interface pour l'analyse complète du message utilisateur
interface MessageAnalysisResult {
  travelRequest: TravelRequest;
  userPreferences: UserPreferences;
  needsResponse: boolean;
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
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({});
  const [debugMode, setDebugMode] = useState(true); // Mode debug activé par défaut
  const [debugLogs, setDebugLogs] = useState<string[]>([]); // Pour stocker les logs de debug
  
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

  // Fonction utilitaire pour ajouter un log de débogage
  const addDebugLog = (message: string) => {
    console.log(message);
    if (debugMode) {
      setDebugLogs(prev => [...prev.slice(-19), message]);
      
      // Également afficher en toast pour les logs importants
      if (message.includes("INTENTION DE VOYAGE DÉTECTÉE") || 
          message.includes("Voyage créé") ||
          message.includes("Préférences détectées")) {
        toast({
          title: "Log de débogage",
          description: message,
          variant: "default",
        });
      }
    }
  };

  // Fonction pour analyser complètement un message utilisateur avec Ollama (analyse tout en une seule fois)
  const analyzeUserMessageWithOllama = async (userMessage: string): Promise<MessageAnalysisResult> => {
    try {
      addDebugLog("==== DÉBUT ANALYSE AVEC OLLAMA ====");
      addDebugLog("Message à analyser: " + userMessage);
      
      // Si Ollama est désactivé, retourner directement une réponse par défaut
      if (!USE_OLLAMA) {
        addDebugLog("Ollama est désactivé, utilisation de l'analyse locale");
        return {
          travelRequest: { isValid: false },
          userPreferences: detectPreferencesLocally(userMessage),
          needsResponse: true
        };
      }
      
      setIsOllamaDetecting(true);
      addDebugLog(`Connexion à Ollama (${OLLAMA_API_URL}) avec le modèle ${OLLAMA_MODEL}...`);
      
      // Construire le prompt pour Ollama (analyse complète en une seule requête)
      const prompt = `
        Analyse le message suivant de l'utilisateur et réponds avec un JSON contenant :
        1. Une analyse des intentions de voyage
        2. Une analyse des préférences du voyageur
        3. Une indication si le message nécessite une réponse directe
        
        Message: "${userMessage}"
        
        Format de réponse (JSON uniquement):
        {
          "travelRequest": {
            "isValid": true/false,
            "destination": "nom de la destination",
            "startDate": "date de début",
            "endDate": "date de fin",
            "numPeople": nombre,
            "activities": ["activité 1", "activité 2"],
            "budget": "budget mentionné",
            "context": "contexte supplémentaire"
          },
          "userPreferences": {
            "accommodationTypes": [],
            "activities": [],
            "foodPreferences": [],
            "transportModes": [],
            "budgetLevel": "",
            "accessibility": [],
            "interests": [],
            "travelStyle": ""
          },
          "needsResponse": true/false
        }
      `;
      
      console.log("Envoi de la requête à Ollama...");
      
      // Appeler l'API Ollama
      const response = await fetch(`${OLLAMA_API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: false
        })
      });
      
      if (!response.ok) {
        addDebugLog(`Erreur Ollama: ${response.status} ${response.statusText}`);
        throw new Error(`Erreur API Ollama: ${response.status}`);
      }
      
      addDebugLog("Réponse reçue d'Ollama, traitement...");
      const data = await response.json();
      
      // Extraire la réponse JSON de Ollama
      let jsonResponse: MessageAnalysisResult;
      try {
        // Essayer de trouver et de parser le JSON dans la réponse
        const jsonMatch = data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[0];
          console.log("JSON extrait:", extractedJson);
          jsonResponse = JSON.parse(extractedJson);
          addDebugLog("===== RÉSULTAT DE L'ANALYSE =====");
          addDebugLog("Intention de voyage détectée: " + (jsonResponse.travelRequest.isValid ? "OUI" : "NON"));
          if (jsonResponse.travelRequest.isValid) {
            addDebugLog("Destination: " + (jsonResponse.travelRequest.destination || "non détectée"));
            addDebugLog("Date départ: " + (jsonResponse.travelRequest.startDate || "non détectée"));
            addDebugLog("Date retour: " + (jsonResponse.travelRequest.endDate || "non détectée"));
            addDebugLog("Nombre personnes: " + (jsonResponse.travelRequest.numPeople || "non détecté"));
          }
          addDebugLog("Préférences détectées: " + JSON.stringify(jsonResponse.userPreferences, null, 2));
    } else {
          addDebugLog("Pas de JSON trouvé dans la réponse d'Ollama");
          console.log("Réponse brute:", data.response);
          throw new Error("Pas de JSON trouvé");
        }
      } catch (e) {
        addDebugLog("Erreur de parsing JSON: " + (e instanceof Error ? e.message : "erreur inconnue"));
        console.log("Réponse complète:", data.response);
        // Réponse par défaut si le parsing échoue
        jsonResponse = {
          travelRequest: { isValid: false },
          userPreferences: detectPreferencesLocally(userMessage),
          needsResponse: true
        };
        addDebugLog("Utilisation des préférences détectées localement");
      }
      
      addDebugLog("==== FIN ANALYSE AVEC OLLAMA ====");
      return jsonResponse;
      
    } catch (error) {
      addDebugLog("Erreur lors de l'analyse avec Ollama: " + (error instanceof Error ? error.message : "erreur inconnue"));
      return {
        travelRequest: { isValid: false },
        userPreferences: detectPreferencesLocally(userMessage),
        needsResponse: true
      };
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
      loadUserPreferences(); // Charger les préférences utilisateur
      checkOllamaStatus(); // Vérifier si Ollama est accessible
    }
  }, [loading, user, router, fetchTripData, startAutomatedSearch]);

  // Fonction pour vérifier si Ollama est accessible
  const checkOllamaStatus = async () => {
    if (!USE_OLLAMA) {
      addDebugLog("Ollama est désactivé dans la configuration");
      setOllamaStatus('disconnected');
      toast({
        title: "Ollama désactivé",
        description: "L'utilisation d'Ollama est désactivée dans la configuration",
        variant: "default",
      });
      return;
    }

    setOllamaStatus('checking');
    try {
      addDebugLog("Vérification de l'état d'Ollama...");
      const response = await fetch(`${OLLAMA_API_URL}/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        addDebugLog("Ollama est accessible ✅");
        
        // Vérifier si le modèle configuré est disponible
        const models = data.models || [];
        const modelExists = models.some((model: any) => model.name === OLLAMA_MODEL);
        
        if (modelExists) {
          addDebugLog(`Le modèle ${OLLAMA_MODEL} est disponible ✅`);
          setOllamaStatus('connected');
          toast({
            title: "Ollama connecté",
            description: `Le modèle ${OLLAMA_MODEL} est prêt à être utilisé`,
            variant: "default",
          });
        } else {
          const availableModels = models.map((m: any) => m.name).join(', ');
          addDebugLog(`⚠️ Le modèle ${OLLAMA_MODEL} n'est pas disponible! Modèles disponibles: ${availableModels || 'aucun'}`);
          setOllamaStatus('disconnected');
          toast({
            title: "Attention",
            description: `Le modèle ${OLLAMA_MODEL} n'est pas disponible dans Ollama`,
            variant: "destructive",
          });
        }
      } else {
        setOllamaStatus('disconnected');
        toast({
          title: "Erreur de connexion",
          description: `Erreur HTTP lors de la connexion à Ollama: ${response.status}`,
          variant: "destructive",
        });
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
    } catch (error) {
      setOllamaStatus('disconnected');
      addDebugLog(`❌ Ollama n'est pas accessible: ${error instanceof Error ? error.message : 'erreur de connexion'}`);
      addDebugLog("Veuillez démarrer Ollama en exécutant 'ollama serve' dans un terminal");
      
      toast({
        title: "Ollama non connecté",
        description: "Impossible de se connecter à Ollama. Veuillez vérifier qu'il est en cours d'exécution.",
        variant: "destructive",
      });
    }
  };

  // Ajouter un état pour stocker l'état de la connexion à Ollama
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Fonction pour charger les préférences utilisateur depuis Firebase
  const loadUserPreferences = async () => {
    if (!user) return;
    
    try {
      console.log("Chargement des préférences utilisateur...");
      const preferencesCollection = collection(db, 'preferences');
      
      // Obtenir les préférences pour le voyage actuel si disponible
      if (currentTravelId) {
        const tripPrefQuery = query(
          preferencesCollection,
          where('userId', '==', user.uid),
          where('travelId', '==', currentTravelId)
        );
        
        const tripPrefSnapshot = await getDocs(tripPrefQuery);
        
        if (!tripPrefSnapshot.empty) {
          const prefData = tripPrefSnapshot.docs[0].data();
          console.log("Préférences pour ce voyage trouvées:", prefData.preferences);
          setUserPreferences(prefData.preferences || {});
          return;
        }
      }
      
      // Si pas de préférences spécifiques au voyage, charger les préférences globales
      const globalPrefQuery = query(
        preferencesCollection,
        where('userId', '==', user.uid),
        where('isGlobal', '==', true)
      );
      
      const globalPrefSnapshot = await getDocs(globalPrefQuery);
      
      if (!globalPrefSnapshot.empty) {
        const prefData = globalPrefSnapshot.docs[0].data();
        console.log("Préférences globales trouvées:", prefData.preferences);
        setUserPreferences(prefData.preferences || {});
        return;
      }
      
      console.log("Aucune préférence utilisateur trouvée");
    } catch (error) {
      console.error("Erreur lors du chargement des préférences:", error);
    }
  };

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
      console.error("DÉMARRAGE TEST DIRECT DE CRÉATION DE VOYAGE");
      
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

  // Fonction pour détecter et enregistrer les préférences utilisateur dans les conversations
  const detectUserPreferences = async (userMessage: string): Promise<UserPreferences> => {
    try {
      // Si Ollama est désactivé, utiliser une approche simplifiée
      if (!USE_OLLAMA) {
        console.log("Détection de préférences en mode local");
        return detectPreferencesLocally(userMessage);
      }
      
      // Construire le prompt pour Ollama pour détecter les préférences
      const prompt = `
        Analyse ce message et identifie les préférences de voyage exprimées par l'utilisateur.
        
        Message: "${userMessage}"
        
        Extrais les préférences dans ces catégories :
        1. Types d'hébergement (hôtel, airbnb, camping, etc.)
        2. Activités préférées
        3. Préférences alimentaires
        4. Modes de transport
        5. Niveau de budget
        6. Besoins d'accessibilité
        7. Centres d'intérêt
        8. Style de voyage (luxe, aventure, culturel, etc.)
        
        Réponds uniquement au format JSON:
        {
          "accommodationTypes": [],
          "activities": [],
          "foodPreferences": [],
          "transportModes": [],
          "budgetLevel": "",
          "accessibility": [],
          "interests": [],
          "travelStyle": ""
        }
      `;
      
      // Appeler l'API Ollama
      const response = await fetch(`${OLLAMA_API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur API Ollama: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extraire la réponse JSON
      let jsonResponse: UserPreferences = {};
      try {
        const jsonMatch = data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonResponse = JSON.parse(jsonMatch[0]);
          console.log("Préférences détectées:", jsonResponse);
        } else {
          throw new Error("Pas de JSON trouvé");
        }
      } catch (e) {
        console.error("Erreur de parsing JSON:", e);
        return detectPreferencesLocally(userMessage);
      }
      
      return jsonResponse;
    } catch (error) {
      console.error("Erreur lors de la détection des préférences:", error);
      return detectPreferencesLocally(userMessage);
    }
  };
  
  // Fonction de détection locale simplifiée comme fallback
  const detectPreferencesLocally = (message: string): UserPreferences => {
    const preferences: UserPreferences = {};
    
    // Détecter le type d'hébergement
    const accommodationTypes = [];
    if (message.match(/hotel|hôtel/i)) accommodationTypes.push('hôtel');
    if (message.match(/airbnb|appartement|location/i)) accommodationTypes.push('location');
    if (message.match(/camping|tente|caravane/i)) accommodationTypes.push('camping');
    if (message.match(/auberge|hostel/i)) accommodationTypes.push('auberge');
    if (accommodationTypes.length > 0) preferences.accommodationTypes = accommodationTypes;
    
    // Détecter les activités
    const activities = [];
    if (message.match(/randonn(é|e)|hik(e|ing)/i)) activities.push('randonnée');
    if (message.match(/plage|mer|ocean|bain/i)) activities.push('plage');
    if (message.match(/mus(é|e)e|exposition|art/i)) activities.push('musée');
    if (message.match(/monument|histoire|historique|patrimoine/i)) activities.push('monuments');
    if (message.match(/gastronomie|cuisine|restaurant|manger/i)) activities.push('gastronomie');
    if (activities.length > 0) preferences.activities = activities;
    
    // Détecter le budget
    if (message.match(/pas cher|économique|budget limité|petit budget/i)) {
      preferences.budgetLevel = 'économique';
    } else if (message.match(/luxe|haut de gamme|premium|5 étoiles/i)) {
      preferences.budgetLevel = 'luxe';
    } else if (message.match(/moyen|standard|normal|correct/i)) {
      preferences.budgetLevel = 'moyen';
    }
    
    // Détecter le style de voyage
    if (message.match(/famille|enfant/i)) {
      preferences.travelStyle = 'familial';
    } else if (message.match(/aventure|sport|actif/i)) {
      preferences.travelStyle = 'aventure';
    } else if (message.match(/culture|histoire|découverte/i)) {
      preferences.travelStyle = 'culturel';
    } else if (message.match(/détente|relaxation|repos|calme/i)) {
      preferences.travelStyle = 'détente';
    }
    
    return preferences;
  };
  
  // Fonction pour sauvegarder les préférences dans le profil de l'utilisateur ou le voyage actuel
  const saveUserPreferences = async (newPreferences: UserPreferences) => {
    if (!user || Object.keys(newPreferences).length === 0) return;
    
    try {
      // Fusionner avec les préférences existantes
      const mergedPreferences = { ...userPreferences };
      
      // Pour chaque catégorie, fusionner les tableaux sans doublons
      Object.keys(newPreferences).forEach(key => {
        if (Array.isArray(newPreferences[key])) {
          if (!mergedPreferences[key]) {
            mergedPreferences[key] = [];
          }
          
          // Ajouter uniquement les nouvelles valeurs
          newPreferences[key]?.forEach((item: string) => {
            if (!mergedPreferences[key]?.includes(item)) {
              mergedPreferences[key]?.push(item);
            }
          });
        } else {
          // Pour les valeurs simples, prendre la plus récente
          mergedPreferences[key] = newPreferences[key];
        }
      });
      
      // Mettre à jour l'état local
      setUserPreferences(mergedPreferences);
      
      // Si un voyage est actif, ajouter les préférences aux notes
      if (currentTravelId) {
        // Formater les préférences pour les notes
        let preferencesNote = "\n\n## Préférences détectées\n";
        
        Object.keys(mergedPreferences).forEach(key => {
          if (mergedPreferences[key] && (
            Array.isArray(mergedPreferences[key]) ? mergedPreferences[key].length > 0 : mergedPreferences[key]
          )) {
            const formattedKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
            preferencesNote += `- ${formattedKey}: `;
            
            if (Array.isArray(mergedPreferences[key])) {
              preferencesNote += mergedPreferences[key].join(', ');
            } else {
              preferencesNote += mergedPreferences[key];
            }
            preferencesNote += '\n';
          }
        });
        
        // Ajouter aux notes si elles ne sont pas déjà incluses
        if (!travelNotes.includes("## Préférences détectées")) {
          await updateTravelNotes(travelNotes + preferencesNote);
        }
        
        // Sauvegarder dans la collection 'preferences'
        const preferencesCollection = collection(db, 'preferences');
        
        // Vérifier si une préférence existe déjà pour ce voyage
        const prefQuery = query(
          preferencesCollection, 
          where('userId', '==', user.uid),
          where('travelId', '==', currentTravelId)
        );
        
        const prefSnapshot = await getDocs(prefQuery);
        
        if (prefSnapshot.empty) {
          // Créer une nouvelle préférence
          await addDoc(preferencesCollection, {
            userId: user.uid,
            travelId: currentTravelId,
            preferences: mergedPreferences,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          console.log("Nouvelles préférences utilisateur sauvegardées dans la collection 'preferences'");
        } else {
          // Mettre à jour la préférence existante
          const prefDoc = prefSnapshot.docs[0];
          await updateDoc(doc(db, 'preferences', prefDoc.id), {
            preferences: mergedPreferences,
            updatedAt: serverTimestamp()
          });
          
          console.log("Préférences utilisateur mises à jour dans la collection 'preferences'");
        }
      } else {
        // Si pas de voyage actif, sauvegarder comme préférences globales
        const preferencesCollection = collection(db, 'preferences');
        
        // Vérifier si des préférences globales existent déjà pour cet utilisateur
        const prefQuery = query(
          preferencesCollection, 
          where('userId', '==', user.uid),
          where('isGlobal', '==', true)
        );
        
        const prefSnapshot = await getDocs(prefQuery);
        
        if (prefSnapshot.empty) {
          // Créer de nouvelles préférences globales
          await addDoc(preferencesCollection, {
            userId: user.uid,
            isGlobal: true,
            preferences: mergedPreferences,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          console.log("Nouvelles préférences globales sauvegardées dans la collection 'preferences'");
        } else {
          // Mettre à jour les préférences globales existantes
          const prefDoc = prefSnapshot.docs[0];
          await updateDoc(doc(db, 'preferences', prefDoc.id), {
            preferences: mergedPreferences,
            updatedAt: serverTimestamp()
          });
          
          console.log("Préférences globales mises à jour dans la collection 'preferences'");
        }
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des préférences:", error);
    }
  };

  const handleSendMessage = async (message: string, isRegeneration = false) => {
    if (!message.trim() && !isRegeneration) return;

    if (!isRegeneration) {
      // Ajouter le message de l'utilisateur au chat
      const newUserMessage: Message = {
        content: message,
        role: 'user',
        createdAt: new Date().toISOString(),
      };

      // Mettre à jour les messages dans l'état local
      setMessages(prev => [...prev, newUserMessage]);
      
      // Réinitialiser les erreurs
      setError(null);
      
      // Vérifier les commandes directes
      if (message.toLowerCase().startsWith('/create travel') || message.toLowerCase().startsWith('/creer voyage')) {
        testCreateTravel();
        return;
      }
      
      // Vérifier si l'utilisateur veut supprimer le voyage actuel
      if (currentTravelId && /supprimer( ce| le)? voyage/i.test(message.toLowerCase())) {
        deleteTravel(currentTravelId);
        return;
      }
      
      // Détecter si le message contient une intention de voyage
      const { isTravel, confidence, data } = detectTravelRequestFromMessage(message);
      
      if (isTravel) {
        // Si la confiance est élevée, créer automatiquement
        if (confidence >= 70) {
          createTravelFromDetection(data);
          return;
        } else if (confidence >= 40) {
          // Demander confirmation à l'utilisateur avant de créer
          await askForTravelConfirmation(data);
          return;
        }
      }
    }
    
    // Si ce n'est pas une création de voyage ou si c'est une régénération,
    // continuer avec le flux normal de messages
    setIsLoading(true);

    try {
      // Le reste de la fonction reste inchangé...
      // ...
    } catch (error) {
      // ...
    } finally {
      setIsLoading(false);
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

      // Personnaliser l'itinéraire en fonction des préférences de l'utilisateur
      const personalizedActivities = generatePersonalizedActivities(destination);
      
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
        
        // Intégrer des activités personnalisées si disponibles
        if (personalizedActivities.length > 0) {
          // Distribuer les activités personnalisées sur différents jours
          const activityIndex = (day - 2) % personalizedActivities.length;
          itinerary += `- ${personalizedActivities[activityIndex]}\n`;
          
          // Compléter avec des activités génériques
          if (day % 2 === 0) {
            itinerary += `- Déjeuner au marché local\n`;
            itinerary += `- Après-midi libre pour explorer\n`;
          } else {
            itinerary += `- Activité culturelle\n`;
            itinerary += `- Soirée détente\n`;
          }
        } else {
          // Activités génériques si pas de préférences spécifiques
          if (day % 2 === 0) {
            itinerary += `- Visite des attractions principales\n`;
            itinerary += `- Déjeuner au marché local\n`;
            itinerary += `- Après-midi libre pour explorer\n`;
          } else {
            itinerary += `- Excursion dans les environs\n`;
            itinerary += `- Activité culturelle\n`;
            itinerary += `- Soirée détente\n`;
          }
        }
        itinerary += `\n`;
      }
      
      // Jour de départ
      itinerary += `## Jour ${durationInDays} (${new Date(endDate).toLocaleDateString('fr-FR')})\n`;
      itinerary += `- Dernières visites si le temps le permet\n`;
      itinerary += `- Préparation au départ\n`;
      itinerary += `- Départ de ${destination}\n\n`;
      
      // Ajouter des conseils généraux personnalisés
      itinerary += generatePersonalizedTips();
      
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

  // Fonction pour générer des activités personnalisées selon les préférences
  const generatePersonalizedActivities = (destination: string): string[] => {
    const activities: string[] = [];
    
    // Si l'utilisateur n'a pas de préférences enregistrées, retourner un tableau vide
    if (!userPreferences || Object.keys(userPreferences).length === 0) {
      return activities;
    }
    
    // Personnaliser selon les préférences d'activités
    if (userPreferences.activities && userPreferences.activities.length > 0) {
      userPreferences.activities.forEach(activity => {
        switch (activity.toLowerCase()) {
          case 'randonnée':
          case 'hiking':
            activities.push(`Randonnée dans les environs de ${destination}`);
            break;
          case 'plage':
          case 'mer':
          case 'océan':
            activities.push(`Journée détente à la plage`);
            break;
          case 'musée':
          case 'art':
            activities.push(`Visite des principaux musées et galeries d'art`);
            break;
          case 'monuments':
          case 'histoire':
          case 'patrimoine':
            activities.push(`Visite guidée des sites historiques de ${destination}`);
            break;
          case 'gastronomie':
          case 'cuisine':
          case 'food':
            activities.push(`Tour gastronomique pour découvrir les spécialités locales`);
            break;
          default:
            activities.push(`Exploration de ${activity} à ${destination}`);
        }
      });
    }
    
    // Personnaliser selon le style de voyage
    if (userPreferences.travelStyle) {
      switch (userPreferences.travelStyle.toLowerCase()) {
        case 'familial':
          activities.push(`Activité familiale adaptée aux enfants`);
          break;
        case 'aventure':
          activities.push(`Activité d'aventure ou sport local`);
          break;
        case 'culturel':
          activities.push(`Participation à un événement culturel local`);
          break;
        case 'détente':
          activities.push(`Séance de bien-être ou spa local`);
          break;
      }
    }
    
    return activities;
  };
  
  // Fonction pour générer des conseils personnalisés
  const generatePersonalizedTips = (): string => {
    let tips = `## Conseils pratiques personnalisés\n`;
    
    // Conseils de base pour tout le monde
    tips += `- Vérifiez les documents de voyage requis\n`;
    
    // Si l'utilisateur n'a pas de préférences enregistrées, retourner les conseils de base
    if (!userPreferences || Object.keys(userPreferences).length === 0) {
      tips += `- Réservez votre hébergement à l'avance\n`;
      tips += `- Renseignez-vous sur la météo locale\n`;
      return tips;
    }
    
    // Conseils personnalisés selon le type d'hébergement
    if (userPreferences.accommodationTypes && userPreferences.accommodationTypes.length > 0) {
      if (userPreferences.accommodationTypes.includes('hôtel')) {
        tips += `- Recherchez des hôtels avec de bonnes évaluations au centre-ville\n`;
      }
      if (userPreferences.accommodationTypes.includes('location') || userPreferences.accommodationTypes.includes('airbnb')) {
        tips += `- Pour les locations, vérifiez les commentaires et la proximité des transports\n`;
      }
      if (userPreferences.accommodationTypes.includes('camping') || userPreferences.accommodationTypes.includes('auberge')) {
        tips += `- Réservez votre hébergement économique bien à l'avance car les bonnes options partent vite\n`;
      }
    } else {
      tips += `- Réservez votre hébergement à l'avance\n`;
    }
    
    // Conseils personnalisés selon le budget
    if (userPreferences.budgetLevel) {
      switch (userPreferences.budgetLevel.toLowerCase()) {
        case 'économique':
          tips += `- Recherchez les attractions gratuites et les cartes touristiques avec réductions\n`;
          tips += `- Privilégiez les transports en commun et les repas dans les marchés locaux\n`;
          break;
        case 'luxe':
          tips += `- Réservez des restaurants gastronomiques à l'avance\n`;
          tips += `- Envisagez des services VIP pour vos transferts et visites\n`;
          break;
        case 'moyen':
          tips += `- Équilibrez entre quelques expériences premium et options économiques\n`;
          break;
      }
    }
    
    // Conseils supplémentaires selon les intérêts
    if (userPreferences.activities && userPreferences.activities.length > 0) {
      if (userPreferences.activities.includes('randonnée')) {
        tips += `- Emportez des chaussures de marche confortables et vérifiez la météo avant vos randonnées\n`;
      }
      if (userPreferences.activities.includes('plage')) {
        tips += `- N'oubliez pas crème solaire, chapeau et lunettes de soleil\n`;
      }
      if (userPreferences.activities.includes('musée') || userPreferences.activities.includes('monuments')) {
        tips += `- Vérifiez les jours de fermeture des sites culturels et achetez vos billets en ligne\n`;
      }
    }
    
    // Conseils selon le style de voyage
    if (userPreferences.travelStyle) {
      switch (userPreferences.travelStyle.toLowerCase()) {
        case 'familial':
          tips += `- Recherchez des activités adaptées aux enfants et des restaurants family-friendly\n`;
          break;
        case 'aventure':
          tips += `- Vérifiez que votre assurance voyage couvre bien les activités à risque\n`;
          break;
      }
    }
    
    return tips;
  };

  // Fonction pour offrir des recommandations personnalisées
  const offerPersonalizedRecommendations = () => {
    if (!tripData || !userPreferences || Object.keys(userPreferences).length === 0) return;
    
    try {
      // Préparer le message de recommandations
      let message = `Sur la base de vos préférences, voici quelques recommandations personnalisées pour votre voyage à ${tripData.destination} :\n\n`;
      
      // Recommandations d'hébergement
      if (userPreferences.accommodationTypes && userPreferences.accommodationTypes.length > 0) {
        message += "🏨 **Hébergement** : ";
        if (userPreferences.accommodationTypes.includes('hôtel')) {
          message += "Je vous recommande de rechercher des hôtels ";
          
          if (userPreferences.budgetLevel === 'luxe') {
            message += "de luxe dans le centre-ville avec une vue panoramique. ";
          } else if (userPreferences.budgetLevel === 'économique') {
            message += "bien notés mais abordables, peut-être un peu en dehors du centre pour économiser. ";
          } else {
            message += "avec un bon rapport qualité-prix à proximité des transports publics. ";
          }
        } else if (userPreferences.accommodationTypes.includes('location')) {
          message += "Les appartements ou maisons de location offrent plus d'espace et la possibilité de préparer vos repas. ";
        } else if (userPreferences.accommodationTypes.includes('camping')) {
          message += "Il existe plusieurs campings bien équipés à proximité de la nature. ";
        }
        message += "\n\n";
      }
      
      // Recommandations d'activités
      if (userPreferences.activities && userPreferences.activities.length > 0) {
        message += "🎭 **Activités recommandées** : Voici des activités qui correspondent à vos préférences :\n";
        
        userPreferences.activities.forEach(activity => {
          switch (activity.toLowerCase()) {
            case 'randonnée':
              message += `- Les sentiers de randonnée autour de ${tripData.destination} comme [rechercher les sentiers populaires]\n`;
              break;
            case 'plage':
              message += `- Les plus belles plages de la région sont [rechercher les plages populaires]\n`;
              break;
            case 'musée':
              message += `- Les musées incontournables : [rechercher les principaux musées]\n`;
              break;
            case 'monuments':
              message += `- Les sites historiques à ne pas manquer : [rechercher les monuments importants]\n`;
              break;
            case 'gastronomie':
              message += `- Les restaurants les mieux notés : [rechercher les restaurants populaires]\n`;
              break;
            default:
              message += `- ${activity}: [rechercher des options]\n`;
          }
        });
        message += "\n";
      }
      
      // Recommandations basées sur le style de voyage
      if (userPreferences.travelStyle) {
        message += `✨ **Style de voyage** : Pour un voyage ${userPreferences.travelStyle.toLowerCase()}, je vous recommande :\n`;
        
        switch (userPreferences.travelStyle.toLowerCase()) {
          case 'familial':
            message += "- Privilégiez les hébergements avec piscine ou activités pour enfants\n";
            message += "- Recherchez les parcs, zoos et attractions adaptées aux enfants\n";
            message += "- Prévoyez des moments de repos dans votre itinéraire\n";
            break;
          case 'aventure':
            message += "- Explorez les options de sports et d'activités de plein air\n";
            message += "- Renseignez-vous sur les sentiers moins fréquentés par les touristes\n";
            message += "- Contactez des guides locaux pour des expériences authentiques\n";
            break;
          case 'culturel':
            message += "- Visitez les musées, monuments et sites historiques\n";
            message += "- Assistez à des spectacles ou événements culturels locaux\n";
            message += "- Envisagez une visite guidée avec un expert en histoire locale\n";
            break;
          case 'détente':
            message += "- Réservez un hôtel avec spa ou piscine\n";
            message += "- Choisissez des restaurants avec vue et ambiance relaxante\n";
            message += "- Prévoyez des journées peu chargées pour profiter de moments de détente\n";
            break;
        }
        message += "\n";
      }
      
      // Recommandations de restaurants basées sur les préférences alimentaires
      if (userPreferences.foodPreferences && userPreferences.foodPreferences.length > 0) {
        message += "🍽️ **Gastronomie** : Pour vos préférences alimentaires, je suggère :\n";
        userPreferences.foodPreferences.forEach(pref => {
          message += `- Restaurants ${pref}: [rechercher des options]\n`;
        });
        message += "\n";
      }
      
      // Message de conclusion
      message += "Ces recommandations sont basées sur vos préférences. Souhaitez-vous que je recherche des options plus spécifiques pour l'une de ces catégories ?";
      
      // Envoyer le message de recommandations
      setMessages(prev => [...prev, { 
        text: message, 
        sender: 'assistant' 
      }]);
      
    } catch (error) {
      console.error("Erreur lors de la génération des recommandations personnalisées:", error);
    }
  };

  // Surveiller les changements de voyage et de préférences pour offrir des recommandations
  useEffect(() => {
    // Si on a à la fois un voyage actif et des préférences
    if (tripData && userPreferences && Object.keys(userPreferences).length > 0) {
      // Attendre un peu pour ne pas envoyer trop de messages d'un coup
      const timer = setTimeout(() => {
        offerPersonalizedRecommendations();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [tripData, userPreferences]);

  // Fonction pour détecter si l'utilisateur souhaite créer un voyage directement depuis son message
  const detectTravelRequestFromMessage = (message: string): { isTravel: boolean, confidence: number, data: Partial<Trip> } => {
    const lowerMessage = message.toLowerCase();
    
    // Modèles de détection améliorés avec plus de cas d'usage
    const travelPatterns = [
      // Motifs directs pour une demande de voyage
      /(?:je\s+(?:veux|souhaite|aimerais|désire)\s+(?:faire\s+un|créer\s+un|planifier\s+un|organiser\s+un|)?voyage)/i,
      /(?:organise(?:r|z)?|planifie(?:r|z)?|prépare(?:r|z)?)\s+(?:un|mon|notre)\s+(?:voyage|séjour|déplacement)/i,
      /(?:je\s+(?:veux|souhaite|aimerais|désire)\s+(?:aller|partir|me\s+rendre|visiter))/i,
      /(?:voyage(?:r|)|séjourne(?:r|)|part(?:ir|))\s+(?:à|a|au|en|aux)/i,
      /(?:réserve(?:r|z)?|cherche(?:r|z)?)\s+(?:un|des)\s+(?:hôtel|hébèrgement|logement|billet|vol)/i,
      /^(?:crée(?:r|z)?|fait(?:es|)|ajoute(?:r|z)?)\s+(?:un|le)\s+voyage/i,
    ];
    
    // Recherche d'indicateurs de destination
    const destinationPatterns = [
      /(?:à|a|au|en|aux|pour|vers|direction)\s+([A-Z][a-zÀ-ÿ\s-]+)(?:\s|,|.|$)/i,
      /(?:visiter|découvrir|explorer)\s+([A-Z][a-zÀ-ÿ\s-]+)(?:\s|,|.|$)/i,
    ];
    
    // Recherche d'indicateurs de dates
    const datePatterns = [
      /(?:du|à partir du|depuis le)\s+(\d{1,2}(?:\s+)?(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|janv|févr|fév|mar|avr|mai|juin|juil|août|sept|oct|nov|déc)(?:\s+)?(?:\d{2,4})?)/i,
      /(?:au|jusqu'au|le)\s+(\d{1,2}(?:\s+)?(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|janv|févr|fév|mar|avr|mai|juin|juil|août|sept|oct|nov|déc)(?:\s+)?(?:\d{2,4})?)/i,
      /(?:pendant|durant|pour)\s+(\d+)\s+(?:jour|jours|semaine|semaines|nuit|nuits)/i,
      /(?:la\s+semaine\s+prochaine|le\s+mois\s+prochain|ce\s+week-end|les\s+prochains\s+jours)/i,
    ];
    
    // Recherche d'indicateurs de nombre de personnes
    const peoplePatterns = [
      /(?:avec|pour|accompagné de)\s+(\d+)\s+(?:personne|personnes|voyageur|voyageurs|ami|amis|adulte|adultes|enfant|enfants)/i,
      /(?:nous\s+sommes|en\s+groupe\s+de)\s+(\d+)(?:\s+personnes|\s+voyageurs)?/i,
    ];
    
    // Calculer un score basé sur la présence de ces modèles
    let confidence = 0;
    let destination: string | null = null;
    let startDate: string | undefined = undefined;
    let endDate: string | undefined = undefined;
    let numPeople: number | null = null;
    
    // Vérifier l'intention de voyage
    const travelIntent = travelPatterns.some(pattern => pattern.test(lowerMessage));
    if (travelIntent) {
      confidence += 40; // Une forte confiance pour une intention explicite
    }
    
    // Rechercher une destination
    for (const pattern of destinationPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        destination = match[1].trim();
        confidence += 20;
        break;
      }
    }
    
    // Rechercher des dates
    let dateMatches: string[] = [];
    for (const pattern of datePatterns) {
      const matches = [...message.matchAll(new RegExp(pattern, 'gi'))];
      if (matches.length > 0) {
        dateMatches = [...dateMatches, ...matches.map(m => m[1] as string)];
        confidence += 15;
      }
    }
    
    // Utiliser des dates si disponibles
    if (dateMatches.length >= 1) {
      const now = new Date();
      
      // Essayer de comprendre les dates (logique simplifiée pour l'exemple)
      if (message.includes('semaine prochaine')) {
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 7);
        startDate = nextWeek.toISOString().split('T')[0];
        
        const weekAfter = new Date(nextWeek);
        weekAfter.setDate(nextWeek.getDate() + 7);
        endDate = weekAfter.toISOString().split('T')[0];
      } else if (message.includes('mois prochain')) {
        const nextMonth = new Date(now);
        nextMonth.setMonth(now.getMonth() + 1);
        startDate = nextMonth.toISOString().split('T')[0];
        
        const monthAfter = new Date(nextMonth);
        monthAfter.setDate(nextMonth.getDate() + 7); // Une semaine dans le mois prochain
        endDate = monthAfter.toISOString().split('T')[0];
      } else if (message.includes('week-end')) {
        // Trouver le prochain vendredi
        const nextWeekend = new Date(now);
        nextWeekend.setDate(now.getDate() + (5 - now.getDay() + 7) % 7);
        startDate = nextWeekend.toISOString().split('T')[0];
        
        const weekendEnd = new Date(nextWeekend);
        weekendEnd.setDate(nextWeekend.getDate() + 2); // Dimanche
        endDate = weekendEnd.toISOString().split('T')[0];
      }
      
      // Si aucune correspondance spécifique, utiliser des dates génériques comme placeholders
      if (!startDate) {
        const futureStart = new Date(now);
        futureStart.setDate(now.getDate() + 30); // Un mois à partir d'aujourd'hui
        startDate = futureStart.toISOString().split('T')[0];
        
        const futureEnd = new Date(futureStart);
        futureEnd.setDate(futureStart.getDate() + 7); // Une semaine de séjour
        endDate = futureEnd.toISOString().split('T')[0];
      }
    }
    
    // Rechercher le nombre de personnes
    for (const pattern of peoplePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        numPeople = parseInt(match[1], 10);
        confidence += 15;
        break;
      }
    }
    
    // Si le message contient "nous", "notre" ou "on" sans préciser le nombre, supposer au moins 2 personnes
    if (!numPeople && 
        (lowerMessage.includes(' nous ') || 
         lowerMessage.includes('notre ') || 
         lowerMessage.includes(' on ') || 
         lowerMessage.includes(' ensemble '))) {
      numPeople = 2;
      confidence += 5;
    } else if (!numPeople) {
      // Par défaut 1 personne
      numPeople = 1;
    }
    
    // Identifier si c'est une demande de voyage en fonction du score de confiance
    const isTravel = confidence >= 40; // Seuil raisonnable
    
    // Si c'est un voyage, préparer les données basiques
    const data: Partial<Trip> = isTravel ? {
      destination: destination || 'Destination à préciser',
      startDate,
      endDate,
      numPeople
    } : {};
    
    addDebugLog(`Détection de voyage dans le message: ${isTravel ? 'OUI' : 'NON'} (confiance: ${confidence}%)`);
    if (isTravel) {
      addDebugLog(`Détails détectés: Destination=${data.destination}, Dates=${data.startDate} à ${data.endDate}, Personnes=${data.numPeople}`);
    }
    
    return { isTravel, confidence, data };
  };

  return (
    <div className="flex flex-col h-full w-full p-6 space-y-5 bg-gradient-to-br from-green-50 to-beige-50 rounded-2xl shadow-lg">
      {/* Indicateur de l'état d'Ollama */}
      {USE_OLLAMA && (
        <div className="flex items-center justify-end mb-0 py-0">
          <button 
            onClick={checkOllamaStatus}
            className={`text-xs flex items-center gap-1 px-2 py-1 rounded
              ${ollamaStatus === 'connected' ? 'bg-green-100 text-green-700' : 
                ollamaStatus === 'disconnected' ? 'bg-red-100 text-red-700' : 
                'bg-yellow-100 text-yellow-700'}`}
          >
            <span className={`w-2 h-2 rounded-full 
              ${ollamaStatus === 'connected' ? 'bg-green-500' : 
                ollamaStatus === 'disconnected' ? 'bg-red-500' : 
                'bg-yellow-500'}`}></span>
            Ollama: {ollamaStatus === 'connected' ? 'Connecté' : 
              ollamaStatus === 'disconnected' ? 'Déconnecté' : 
              'Vérification...'}
          </button>
        </div>
      )}

      {/* Debug panel visible uniquement en mode debug */}
      {debugMode && (
        <div className="bg-gray-800 text-white p-3 rounded-lg text-xs font-mono overflow-y-auto max-h-40">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">Mode Débogage</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setDebugLogs([])}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              >
                Effacer
              </button>
              <button
                onClick={() => setDebugMode(false)}
                className="px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
          <div className="space-y-1">
            {debugLogs.length === 0 ? (
              <p>Aucun log pour le moment. Envoyez un message pour voir les logs.</p>
            ) : (
              debugLogs.map((log, i) => (
                <div key={i} className="border-b border-gray-700 pb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
                : "Aucun message. Commencez à discuter avec l'assistant de voyage. Tapez 'debug' pour activer/désactiver le mode débogage."}
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

