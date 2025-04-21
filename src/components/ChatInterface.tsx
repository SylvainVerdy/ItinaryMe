'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { interpretTravelRequest, detectBasicTravelInfo } from '@/ai/flows/interpret-travel-request';
import { analyzeBrowserContent } from '@/ai/flows/analyze-browser-content';
import { doc, getDoc, updateDoc, getFirestore, serverTimestamp, addDoc, collection, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useBrowserAgent, BrowserAgentResult, BrowserAgentTask } from '@/hooks/useBrowserAgent';
import { useTrip } from '@/hooks/useTrip';
import { Pencil, Save, FileText, Plus, Calendar, MapPin, Users, AlertCircle, Trash2, LinkIcon, Send, Globe, Search, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Trip, Note, ChatMessage } from '@/lib/types';
import * as noteService from '@/services/noteService';
import { TripSelector } from '@/components/TripSelector';
import { TravelForm } from '@/components/TravelForm';
import { Dialog } from '@/components/ui/dialog';
import { MessageItem } from './MessageItem';
import { BrowserAgent } from '@/ai/browserAgent';
import { createNote } from '@/services/noteService';
import { Ollama as LangchainOllama } from '@langchain/ollama';

// Configuration Ollama
const USE_OLLAMA = false; // Désactiver Ollama par défaut pour éviter les multiples requêtes
const OLLAMA_API_URL = "http://localhost:11434/api";
const DISABLE_POPUPS = true; // Désactiver tous les popups pour une meilleure UX
const DISABLE_TOASTS = true; // Désactiver les toasts pour une meilleure UX
const DISABLE_ALL_AI_REQUESTS = false; // Activer les requêtes AI pour permettre l'utilisation d'Ollama

// Interface pour la demande de voyage
interface TravelRequest {
  destination: string;
  dateDepart: string;
  dateRetour: string;
  nombreVoyageurs: number;
  typeVoyage?: string;
  budget?: string;
  message?: string;
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
  foodPreferences?: string[] | string;
  transportModes?: string[] | string;
  budgetLevel?: string;
  accessibility?: string[];
  interests?: string[] | string;
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
  tripContext?: Trip | null; // Ajouter cette propriété
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

// Component pour afficher les résultats de l'agent de navigation
const BrowserAgentResults = ({ result }: { result: BrowserAgentResult }) => {
  if (!result) return null;

  return (
    <div className="bg-white border border-[#e6e0d4] rounded-lg p-4 mt-4 max-w-full">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="text-blue-500" size={16} />
        <h3 className="font-medium">Actions effectuées dans le navigateur</h3>
      </div>

      <div className="text-sm text-gray-700 mb-3">
        <div className="flex items-center gap-1 mb-1">
          <div className={`h-2 w-2 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{result.success ? 'Action réussie' : 'Action échouée'}</span>
        </div>
        <p className="ml-3">{result.message}</p>
        {result.error && (
          <p className="ml-3 text-red-500">{result.error}</p>
        )}
      </div>

      {result.screenshots && result.screenshots.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Captures d'écran</h4>
          <div className="grid grid-cols-1 gap-3">
            {result.screenshots.map((screenshot, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <img 
                  src={screenshot} 
                  alt={`Capture d'écran ${index + 1}`} 
                  className="w-full h-auto"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ChatInterface: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Bonjour ! Je suis votre assistant de voyage. Comment puis-je vous aider avec votre itinéraire aujourd'hui ?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tripData, setTripData] = useState<Trip | null>(null);
  const [currentTravelId, setCurrentTravelId] = useState<string | null>(null);
  const [travelNotes, setTravelNotes] = useState<string>("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showCreateTravelModal, setShowCreateTravelModal] = useState(false);
  const [detectedTravelInfo, setDetectedTravelInfo] = useState<NewTravelData | null>(null);
  const [isOllamaDetecting, setIsOllamaDetecting] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({});
  const [debugMode, setDebugMode] = useState(true); // Mode debug activé par défaut
  const [debugLogs, setDebugLogs] = useState<string[]>([]); // Pour stocker les logs de debug
  const [showTripSelector, setShowTripSelector] = useState(false); // Pour afficher/masquer le sélecteur de voyage
  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);
  const [userMessage, setUserMessage] = useState<string>('');
  const [travelRequest, setTravelRequest] = useState<TravelRequest | null>(null);
  
  // Référence pour suivre les derniers messages de l'assistant
  const lastAssistantMessages = useRef<string[]>([]);
  // Référence pour faire défiler vers le bas
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Initialiser l'agent de navigation
  const browserAgent = useBrowserAgent({
    onSuccess: (result) => {
      // Désactiver l'état de chargement
      setMessages(messages => messages.map((msg, idx) => 
        idx === messages.length - 1 && msg.isLoading ? { ...msg, isLoading: false } : msg
      ));
      
      // Ajouter la réponse de l'agent au chat
      if (result.success) {
        const agentResponseMessage: ChatMessage = {
          role: 'assistant',
          content: `J'ai effectué l'action que vous avez demandée. Voici le résultat: ${result.message}`,
          timestamp: new Date(),
        };
        
        setMessages((prevMessages) => [...prevMessages, agentResponseMessage]);
      } else {
        const agentErrorMessage: ChatMessage = {
          role: 'assistant',
          content: `Je n'ai pas pu effectuer l'action demandée. Erreur: ${result.error || result.message}`,
          timestamp: new Date(),
        };
        
        setMessages((prevMessages) => [...prevMessages, agentErrorMessage]);
      }
      
      scrollToBottom();
    },
    onError: (error) => {
      // Ajouter un message d'erreur au chat
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Une erreur s'est produite lors de l'exécution de l'action: ${error.message}`,
        timestamp: new Date(),
      };
      
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
      scrollToBottom();
    },
  });

  // Ajouter un état pour suivre si un message est analysé
  const [isMessageAnalyzed, setIsMessageAnalyzed] = useState<boolean>(false);

  // Ajouter un état pour contrôler les appels API trop fréquents
  const [lastApiCallTime, setLastApiCallTime] = useState<number>(0);
  const MIN_API_INTERVAL = 2000; // Minimum 2 secondes entre les appels

  // Variables pour le cache de statut d'Ollama
  const OLLAMA_STATUS_CACHE_DURATION = 60000; // 1 minute
  const [ollamaLastChecked, setOllamaLastChecked] = useState<number>(0);
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [ollamaCheckInProgress, setOllamaCheckInProgress] = useState<boolean>(false);

  // Référence pour stocker handleUserMessage et résoudre les dépendances circulaires
  const handleUserMessageRef = useRef<(message: string) => Promise<void>>();

  // Utiliser le tripContext si fourni
  useEffect(() => {
    if (tripData) {
      setCurrentTravelId(tripData.id || null);
      
      // Charger les notes si disponibles
      if (tripData.notes) {
        setTravelNotes(typeof tripData.notes === 'string' 
          ? tripData.notes 
          : '');
      }
      
      // Ajouter un message d'accueil spécifique au voyage
      const formattedStartDate = typeof tripData.startDate === 'string'
        ? new Date(tripData.startDate).toLocaleDateString('fr-FR')
        : tripData.startDate.toLocaleDateString('fr-FR');
        
      const formattedEndDate = typeof tripData.endDate === 'string'
        ? new Date(tripData.endDate).toLocaleDateString('fr-FR')
        : tripData.endDate.toLocaleDateString('fr-FR');
      
      setMessages([{
        role: 'assistant',
        content: `Voyage sélectionné : ${tripData.destination} du ${formattedStartDate} au ${formattedEndDate} pour ${tripData.numPeople} voyageur${tripData.numPeople > 1 ? 's' : ''}. Comment puis-je vous aider avec ce voyage ?`,
        timestamp: new Date()
      }]);
    }
  }, [tripData]);

  // Fonction pour récupérer les données du voyage depuis Firestore
  const fetchTripData = useCallback(async (tripIdToFetch?: string) => {
    const tripId = tripIdToFetch || currentTravelId; // Utiliser l'argument ou l'état actuel
    if (!tripId) return null;
    if (!user) return null; // S'assurer que l'utilisateur est connecté

    try {
      const travelRef = doc(db, 'travels', tripId);
      const travelSnapshot = await getDoc(travelRef);
      
      if (!travelSnapshot.exists()) {
        console.error(`Voyage ${tripId} non trouvé.`);
        setCurrentTravelId(null); // Réinitialiser si le voyage n'existe pas
        setTripData(null);
        setTravelNotes('');
        localStorage.removeItem('currentTripId');
        return null;
      }
      
      const data = travelSnapshot.data();
      
      // Vérifier que le voyage appartient bien à l'utilisateur actuel
      if (data.userId !== user.uid) {
        console.error(`Voyage ${tripId} n'appartient pas à l'utilisateur actuel.`);
        setCurrentTravelId(null);
        setTripData(null);
        setTravelNotes('');
        localStorage.removeItem('currentTripId');
        toast({
          title: "Erreur d'accès",
          description: "Ce voyage n'existe pas ou vous n'avez pas les droits pour y accéder.",
          variant: "destructive",
        });
        return null;
      }
      
      const fetchedTripData: Trip = {
        id: travelSnapshot.id, 
        userId: data.userId || user.uid || '',
        destination: data.destination || '',
        startDate: data.startDate || data.dateDepart || '',
        endDate: data.endDate || data.dateRetour || '',
        numPeople: data.numPeople || data.nombreVoyageurs || 1,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        status: data.status || 'pending',
        notes: data.notes || ''
      };

      // Mise à jour conditionnelle de l'état pour éviter les boucles
      if (currentTravelId !== fetchedTripData.id) {
        setCurrentTravelId(fetchedTripData.id ?? null);
      }
      if (JSON.stringify(tripData) !== JSON.stringify(fetchedTripData)) {
        setTripData(fetchedTripData);
      }
      const currentNotes = typeof fetchedTripData.notes === 'string' ? fetchedTripData.notes : '';
      if (travelNotes !== currentNotes) {
         setTravelNotes(currentNotes);
      }
      
      return fetchedTripData;
    } catch (error) {
      console.error("Erreur fetchTripData:", error);
      // Gérer l'erreur de manière appropriée (ex: afficher un toast)
      return null;
    }
  }, [user, currentTravelId, tripData, travelNotes, toast]);

  // Fonction utilitaire pour afficher une notification seulement si elles ne sont pas désactivées
  const showToastIfEnabled = (toastData: { title: string; description: string; variant: "default" | "destructive" }) => {
    if (!DISABLE_TOASTS) {
      toast(toastData);
    }
  };

  // Formatage de date pour l'affichage
  const formatDate = (dateString?: string | Date): string => {
    if (!dateString) return "Date non définie";
    
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      console.error("Erreur de formatage de date:", error);
      return "Date invalide";
    }
  };

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

  // Fonction pour créer un nouveau voyage
  const createNewTravel = useCallback(async (travelData: NewTravelData): Promise<string | null> => {
    if (!user) {
      console.error("User not logged in");
      return null;
    }
    try {
      const newTravel = { ...travelData, userId: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), status: 'pending' };
      const travelRef = await addDoc(collection(db, 'travels'), newTravel);
      
      // Après création, recharger les données du nouveau voyage pour mettre à jour l'état
      const newlyCreatedTrip = await fetchTripData(travelRef.id);
      if (newlyCreatedTrip) {
        // Pas besoin de setTripData/setCurrentTravelId ici, fetchTripData s'en charge
         showToastIfEnabled({
           title: "Voyage créé",
           description: `Voyage à ${newlyCreatedTrip.destination} créé avec succès.`,
           variant: "default",
         });
        return travelRef.id;
      } else {
         throw new Error("Failed to fetch newly created trip data.");
      }
    } catch (error) {
      console.error("Erreur createNewTravel:", error);
      showToastIfEnabled({ title: "Erreur", description: "Impossible de créer le voyage", variant: "destructive" });
      return null;
    }
  }, [user, fetchTripData, showToastIfEnabled]); // Dépend de fetchTripData

  // Fonction pour demander confirmation avant de créer un voyage
  const askForTravelConfirmation = useCallback(async (data: Partial<Trip>) => {
    const startDateString = formatDate(data.startDate ? new Date(data.startDate) : new Date());
    const endDateString = formatDate(data.endDate ? new Date(data.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    
    // Message plus clair et plus visible avec des emojis et mise en forme
    const confirmationMessage: ChatMessage = {
      role: 'assistant',
      content: `🔍 J'ai détecté que vous souhaitez planifier un **nouveau voyage** à **${data.destination || "destination non spécifiée"}** du **${startDateString}** au **${endDateString}** pour **${data.numPeople || 1}** personne(s).\n\n⚠️ **IMPORTANT: Voulez-vous que je crée ce voyage pour vous?**\n\n👉 Répondez simplement par **"oui"** pour confirmer, ou précisez d'autres détails si nécessaire.`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, confirmationMessage]);

    // Logging pour déboguer
    console.log("Demande de confirmation de voyage:", {
      destination: data.destination,
      startDate: startDateString,
      endDate: endDateString,
      numPeople: data.numPeople || 1
    });

    // Si un voyage actif existe, ajouter un message expliquant le changement
    if (tripData) {
          setMessages(prev => [...prev, { 
        role: 'assistant',
        content: `⚠️ Note: Cela créera un nouveau voyage distinct de votre voyage actuel à ${tripData.destination}.`,
        timestamp: new Date()
      }]);
    }

    const travelInfo: NewTravelData = {
      destination: data.destination || "Destination à préciser",
      dateDepart: typeof data.startDate === 'string' ? data.startDate : startDateString,
      dateRetour: typeof data.endDate === 'string' ? data.endDate : endDateString,
      nombreVoyageurs: data.numPeople || 1,
      notes: `Voyage proposé basé sur la conversation: voyage à ${data.destination} détecté dans le message de l'utilisateur.`
    };
    
    // Logging supplémentaire
    console.log("Stockage des données de voyage pour confirmation ultérieure:", travelInfo);
    
    setDetectedTravelInfo(travelInfo);
  }, [formatDate, tripData]);

  // Gestionnaire pour le sélecteur de voyages
  const handleSelectTrip = (trip: Trip | null) => {
    if (!trip) {
      setCurrentTravelId(null);
      setTripData(null);
      return;
    }
    
    // Vérifier et compléter les données manquantes
    const completeTrip = {
      ...trip,
      startDate: trip.startDate || new Date().toISOString(),
      endDate: trip.endDate || new Date().toISOString(),
      destination: trip.destination || "Destination inconnue",
      numPeople: trip.numPeople || 1
    };
    
    // Mettre à jour l'état
    setCurrentTravelId(trip.id);
    setTripData(completeTrip);
    
    // Enregistrer l'ID du voyage dans le localStorage
    localStorage.setItem('currentTripId', trip.id);
  };

  // Fonction pour charger les préférences utilisateur depuis Firebase
  const loadUserPreferences = useCallback(async (forTripId?: string) => {
    if (!user) return;
    
    try {
      const preferencesCollection = collection(db, 'preferences');
      let prefQuery;

      if (forTripId) {
        console.log(`Chargement des préférences pour le voyage ${forTripId}...`);
        prefQuery = query(
          preferencesCollection,
          where('userId', '==', user.uid),
          where('travelId', '==', forTripId)
        );
      } else {
        console.log("Chargement des préférences globales...");
        prefQuery = query(
        preferencesCollection,
        where('userId', '==', user.uid),
        where('isGlobal', '==', true)
      );
      }
      
      const prefSnapshot = await getDocs(prefQuery);
      
      if (!prefSnapshot.empty) {
        const prefData = prefSnapshot.docs[0].data();
        console.log("Préférences trouvées:", prefData.preferences);
        setUserPreferences(prefData.preferences || {});
      } else {
        console.log("Aucune préférence spécifique/globale trouvée.");
        // Optionnel: Réinitialiser si aucune préférence n'est trouvée pour ce contexte?
        // setUserPreferences({}); 
      }
    } catch (error) {
      console.error("Erreur lors du chargement des préférences:", error);
    }
  }, [user]); // Dépend seulement de user

  // ---- Déclarations des fonctions manquantes ----
  const detectPreferencesLocally = useCallback((message: string): UserPreferences => { 
    console.log("Detecting prefs locally"); 
    return {}; 
  }, []);

  const saveUserPreferences = useCallback(async (prefs: UserPreferences) => { 
    console.log("Saving prefs", prefs);
    // Ici, fusionner avec l'état existant
    setUserPreferences((prev: UserPreferences) => ({...prev, ...prefs})); 
    // Ajouter la logique de sauvegarde Firestore si nécessaire
  }, []);

  const generatePersonalizedActivities = useCallback((destination: string): string[] => { 
    return userPreferences?.activities || []; 
  }, [userPreferences]);

  const generatePersonalizedTips = useCallback((): string => { 
    return "Conseils."; 
  }, [userPreferences]);
  // ------------------------------------------

  // Fonction pour initialiser depuis le dashboard
  const initializeFromDashboard = useCallback((tripId?: string, initialMessage?: string) => {
    if (tripId) {
      // Si un ID de voyage est fourni, charger les données de ce voyage
      fetchTripData(tripId).then(loadedTripData => {
        if (loadedTripData && initialMessage) {
          // Ajouter message user + appeler via ref après timeout
          setMessages(prev => [...prev, { role: 'assistant', content: `Voyage sélectionné : ${loadedTripData.destination}...`, timestamp: new Date() }, { role: 'user', content: initialMessage, timestamp: new Date() }]);
          setTimeout(() => {
            handleUserMessageRef.current?.(initialMessage);
          }, 500);
        } else if (loadedTripData) {
          setMessages(prev => [...prev, { role: 'assistant', content: `Voyage sélectionné : ${loadedTripData.destination}...`, timestamp: new Date() }]);
        }
      });
    } else {
      // Pas de tripId : nouvelle conversation
      setCurrentTravelId(null);
      setTripData(null);
      setTravelNotes('');
      localStorage.removeItem('currentTripId');
      
      // Message de bienvenue encourageant la description d'un voyage
      setMessages([{ 
        role: 'assistant',
        content: "Bonjour ! Je suis votre assistant de voyage. Décrivez-moi le voyage que vous souhaitez planifier (destination, dates, nombre de voyageurs) et je vous aiderai à l'organiser.", 
        timestamp: new Date() 
      }]);
      
      if (initialMessage) {
        // Ajouter le message de l'utilisateur
        setMessages(prev => [...prev, { role: 'user', content: initialMessage, timestamp: new Date() }]);
        
        // Détecter si le message contient des informations de voyage
        setTimeout(async () => {
          try {
            // Analyser le message pour détecter une demande de voyage
            const basicDetection = await detectBasicTravelInfo(initialMessage);
            
            // Si une demande de voyage est détectée
            if (basicDetection.isValidTravelRequest && basicDetection.destination) {
              const tripDetails: Partial<Trip> = {
                destination: basicDetection.destination,
                startDate: basicDetection.startDate,
                endDate: basicDetection.endDate,
                numPeople: basicDetection.numPeople || 1
              };
              
              // Proposer la création automatique
              await askForTravelConfirmation(tripDetails);
            } else {
              // Si pas de détection de voyage, traiter comme message normal
              handleUserMessageRef.current?.(initialMessage);
            }
          } catch (error) {
            console.error("Erreur lors de l'analyse du message initial:", error);
            // En cas d'erreur, traiter comme message normal
            handleUserMessageRef.current?.(initialMessage);
          }
        }, 500);
      }
    }
  }, [fetchTripData, detectBasicTravelInfo, askForTravelConfirmation]);

  // Ajouter un bouton pour créer un voyage manuellement
  const renderManualTravelButton = () => {
    if (!debugMode) return null;
    
    return (
      <div className="flex justify-center mt-4 mb-2">
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => {
            // Afficher un message pour demander les informations
          setMessages(prev => [...prev, { 
              role: 'assistant',
              content: "Pour créer un voyage manuellement, merci de fournir les informations suivantes :\n\n" +
                "1. Destination\n" +
                "2. Date de départ (format: JJ/MM/AAAA)\n" +
                "3. Date de retour (format: JJ/MM/AAAA)\n" +
                "4. Nombre de personnes\n\n" +
                "Exemple: 'Créer un voyage à Rome du 15/04/2024 au 20/04/2024 pour 2 personnes'",
              timestamp: new Date()
            }]);
          }}
        >
          <Plus size={16} />
          Créer un voyage manuellement
        </Button>
      </div>
    );
  };

  // Gérer la création d'un nouveau voyage
  const handleCreateTravel = useCallback(async (newTravelData: NewTravelData) => {
    try {
      if (!user) {
      toast({
        title: "Erreur",
          description: "Vous devez être connecté pour créer un voyage",
          variant: "destructive"
      });
      return false;
    }
    
      // Créer un nouveau document dans la collection travels
      const travelRef = collection(db, 'travels');
      const newTravel = {
        userId: user.uid,
        destination: newTravelData.destination,
        startDate: newTravelData.dateDepart,
        endDate: newTravelData.dateRetour,
        numPeople: newTravelData.nombreVoyageurs,
        notes: newTravelData.notes || '',
        createdAt: serverTimestamp(),
        status: 'pending'
      };

      const docRef = await addDoc(travelRef, newTravel);
      
      // Mettre à jour l'état local
      const tripData: Trip = {
        id: docRef.id,
        userId: user.uid,
        destination: newTravelData.destination,
        startDate: newTravelData.dateDepart,
        endDate: newTravelData.dateRetour,
        numPeople: newTravelData.nombreVoyageurs,
        notes: newTravelData.notes || '',
        createdAt: new Date().toISOString(),
        status: 'pending'
      };
      
      setTripData(tripData);
      setCurrentTravelId(docRef.id);
      localStorage.setItem('currentTripId', docRef.id);
      
      // Ajouter un message de confirmation
      setMessages(prev => [...prev, { 
        role: 'assistant',
        content: `Voyage à ${newTravelData.destination} créé avec succès !`, 
        timestamp: new Date() 
      }]);
      
      return true;
    } catch (error) {
      console.error("Erreur lors de la création du voyage:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le voyage. Veuillez réessayer.",
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast]);

  // Traitement du message utilisateur
  const handleSendMessage = useCallback(async (messageContent: string) => {
    if (!messageContent.trim()) return;
    setIsLoading(true);

    // Ajouter le message de l'utilisateur à la liste des messages
    setMessages(prev => [...prev, { role: 'user', content: messageContent, timestamp: new Date() }]);
    setInput("");

    try {
      const lowerCaseMessage = messageContent.toLowerCase().trim();
      
      // Gestion de la confirmation
      const positiveResponses = ['oui', 'yes', 'ok', 'okay', 'd\'accord', 'bien sûr', 'bien sur', 'je confirme', 'confirmer', 'créer', 'creer', 'accepter'];
      const containsPositiveResponse = positiveResponses.some(response => lowerCaseMessage.includes(response));
      
      // Débug
      console.log("=== DÉTECTION DE CONFIRMATION ===");
      console.log("Message:", lowerCaseMessage);
      console.log("Contient réponse positive:", containsPositiveResponse);
      console.log("DetectedTravelInfo:", detectedTravelInfo);
      
      // Si on attend une confirmation et qu'on a une réponse positive
      if (detectedTravelInfo && containsPositiveResponse) {
        console.log("🎯 CONFIRMATION DÉTECTÉE! Création du voyage en cours...");
        
        try {
          const dataToCreate = { ...detectedTravelInfo };
          console.log("Données de voyage à créer:", dataToCreate);
          
          // Créer le voyage
          const newTravelId = await createNewTravel(dataToCreate);
          console.log("Nouveau voyage créé avec ID:", newTravelId);
          
          if (newTravelId) {
            // Réinitialiser l'info détectée après utilisation
            setDetectedTravelInfo(null);
            
            // Message de confirmation
            setMessages(prev => [...prev, { 
              role: 'assistant',
              content: `✅ Parfait ! J'ai créé votre voyage pour ${dataToCreate.destination} du ${formatDate(dataToCreate.dateDepart)} au ${formatDate(dataToCreate.dateRetour)} pour ${dataToCreate.nombreVoyageurs} personne(s). Comment puis-je vous aider maintenant ?`, 
              timestamp: new Date() 
            }]);
            setIsLoading(false);
            return; // Stopper le traitement ici
          } else {
            console.error("Échec de création du voyage: aucun ID retourné");
            // Continuer avec le traitement normal
          }
        } catch (error) {
          console.error("Erreur lors de la création du voyage après confirmation:", error);
          setMessages(prev => [...prev, { 
            role: 'assistant',
            content: `❌ Désolé, je n'ai pas pu créer votre voyage. Une erreur s'est produite. Veuillez réessayer.`, 
            timestamp: new Date() 
          }]);
          setIsLoading(false);
          return; // Stopper le traitement ici
        }
      }

      // === NOUVELLE PARTIE: DÉTECTION D'ITINÉRAIRE ===
      try {
        // Importer dynamiquement (pour éviter les dépendances circulaires)
        const { detectItineraryRequest, generateTravelItinerary } = await import('@/ai/flows/detect-travel-itinerary');
        
        // Vérifier si le message demande un itinéraire
        const itineraryDetection = await detectItineraryRequest(messageContent);
        console.log("Détection d'itinéraire:", itineraryDetection);
        
        if (itineraryDetection.isItineraryRequest && itineraryDetection.travelInfo) {
          // Indiquer que nous traitons la demande
          setMessages(prev => [...prev, { 
            role: 'assistant',
            content: `Je détecte que vous souhaitez un itinéraire de voyage pour ${itineraryDetection.travelInfo.destination}. Je vais préparer cela pour vous. Cela peut prendre quelques instants...`, 
            timestamp: new Date() 
          }]);
          
          // Créer un voyage d'abord si nécessaire
          let travelId = currentTravelId;
          
          if (!currentTravelId) {
            // Préparer les données pour la création du voyage
            const travelData: NewTravelData = {
              destination: itineraryDetection.travelInfo.destination || "Destination non spécifiée",
              dateDepart: itineraryDetection.travelInfo.startDate || new Date().toISOString(),
              dateRetour: itineraryDetection.travelInfo.endDate || new Date().toISOString(),
              nombreVoyageurs: itineraryDetection.travelInfo.numPeople || 1,
              notes: `Voyage créé automatiquement suite à une demande d'itinéraire.`
            };
            
            // Créer le voyage
            travelId = await createNewTravel(travelData);
            
            if (!travelId) {
              throw new Error("Impossible de créer le voyage pour l'itinéraire");
            }
            
            // Message de confirmation de création
            setMessages(prev => [...prev, { 
              role: 'assistant',
              content: `J'ai créé un nouveau voyage pour vous à ${travelData.destination}. Maintenant, je vais générer un itinéraire détaillé...`, 
              timestamp: new Date() 
            }]);
          }
          
          // Générer l'itinéraire
          const itinerary = await generateTravelItinerary(itineraryDetection.travelInfo);
          
          // Sauvegarder l'itinéraire dans les notes du voyage
          if (travelId) {
            const tripRef = doc(db, 'travels', travelId);
            const formattedItinerary = `
# ${itinerary.title || "Itinéraire de voyage"}

${itinerary.description || "Itinéraire personnalisé"}

## Planning jour par jour

${(itinerary.days || []).map((day: any) => `
### Jour ${day.dayNumber || "?"} - ${day.date || ""}

${(day.activities || []).map((activity: any) => `- **${activity.time || ""}** : ${activity.description || ""}${activity.location ? ` à ${activity.location}` : ''}${activity.cost ? ` (${activity.cost})` : ''}`).join('\n')}

${day.accommodation ? `**Hébergement:** ${day.accommodation.name || ""}${day.accommodation.cost ? ` - ${day.accommodation.cost}` : ''}` : ''}
`).join('\n')}

## Budget estimé
${itinerary.totalBudget || 'À définir selon vos choix d\'activités et d\'hébergements.'}

## Recommandations
${(itinerary.recommendations || []).map((rec: string) => `- ${rec}`).join('\n')}

## Liens utiles
${(itinerary.links || []).map((link: any) => `- [${link.title || link.url}](${link.url})`).join('\n') || 'Aucun lien spécifique.'}
`;

            // Mise à jour des notes du voyage
            await updateDoc(tripRef, {
              notes: formattedItinerary,
              updatedAt: serverTimestamp()
            });
            
            // Rafraîchir les données du voyage
            await fetchTripData(travelId);
          }
          
          // Préparer une réponse pour l'utilisateur
          const itineraryResponse = `
✨ **${itinerary.title || "Votre itinéraire de voyage"}** ✨

${itinerary.description || "Itinéraire personnalisé selon vos préférences"}

Voici un aperçu de votre itinéraire jour par jour:

${(itinerary.days || []).slice(0, 2).map((day: any) => `
**Jour ${day.dayNumber || day.day || "?"} - ${day.date || ""}**
${(day.activities || []).slice(0, 2).map((activity: any) => `- ${activity.time || ""}: ${activity.description || ""}`).join('\n')}
${day.accommodation ? `Nuit à: ${day.accommodation.name || ""}` : ''}
`).join('\n')}
${(itinerary.days || []).length > 2 ? `\n...et ${(itinerary.days || []).length - 2} autres jours planifiés.\n` : ''}

💰 **Budget estimé:** ${itinerary.totalBudget || 'À définir selon vos préférences'}

J'ai sauvegardé l'itinéraire complet dans les notes de votre voyage. Vous pourrez le consulter et le modifier à tout moment.

Souhaitez-vous des modifications ou avez-vous des questions sur cet itinéraire ?
`;
          
          setMessages(prev => [...prev, { 
            role: 'assistant',
            content: itineraryResponse, 
            timestamp: new Date() 
          }]);
          
          setIsLoading(false);
          return; // Stopper le traitement ici
        }
      } catch (itineraryError) {
        console.error("Erreur lors du traitement de la demande d'itinéraire:", itineraryError);
        // Continuer avec le traitement normal en cas d'erreur
      }
      // === FIN DE LA NOUVELLE PARTIE ===

      // Le traitement normal continue ici si aucune des conditions spéciales n'est remplie
    } catch (error) {
      console.error("Erreur lors du traitement du message:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, j'ai rencontré une erreur en traitant votre demande. Pourriez-vous reformuler ?", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentTravelId, 
    tripData,
    detectedTravelInfo,
    lastApiCallTime,
    askForTravelConfirmation,
    createNewTravel,
    detectBasicTravelInfo,
    formatDate,
    userPreferences
  ]);

  // Mettre à jour la référence
  useEffect(() => {
    handleUserMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  // Exposer initializeFromDashboard
  useEffect(() => {
    // @ts-ignore
    window.initializeChatFromDashboard = initializeFromDashboard;

    // Exposer une fonction pour initialiser une conversation avec message et détection automatique
    // @ts-ignore
    window.initializeConversationWithMessage = (message: string) => {
      // Réinitialiser l'état actuel
      setCurrentTravelId(null);
      setTripData(null);
      setTravelNotes('');
      localStorage.removeItem('currentTripId');
      
      // Message de bienvenue
      setMessages([{ role: 'assistant', content: "Bonjour ! Comment puis-je vous aider ?", timestamp: new Date() }]);
      
      // Ajouter le message de l'utilisateur
      setMessages(prev => [...prev, { role: 'user', content: message, timestamp: new Date() }]);
      
      // Détecter si le message contient des informations de voyage
      setTimeout(async () => {
        try {
          // Analyser le message pour détecter une demande de voyage
          const basicDetection = await detectBasicTravelInfo(message);
          
          // Si une demande de voyage est détectée
          if (basicDetection.isValidTravelRequest && basicDetection.destination) {
            const tripDetails: Partial<Trip> = {
              destination: basicDetection.destination,
              startDate: basicDetection.startDate,
              endDate: basicDetection.endDate,
              numPeople: basicDetection.numPeople || 1
            };
            
            // Proposer la création automatique
            await askForTravelConfirmation(tripDetails);
          } else {
            // Si pas de détection de voyage, traiter comme message normal
            handleUserMessageRef.current?.(message);
          }
    } catch (error) {
          console.error("Erreur lors de l'analyse du message initial:", error);
          // En cas d'erreur, traiter comme message normal
          handleUserMessageRef.current?.(message);
        }
      }, 500);
    };
    
    return () => {
      // @ts-ignore
      delete window.initializeChatFromDashboard;
      // @ts-ignore
      delete window.initializeConversationWithMessage;
    };
  }, [initializeFromDashboard, detectBasicTravelInfo, askForTravelConfirmation]);
  
  // useEffect initial pour charger le voyage si un ID existe
  useEffect(() => {
    const initialTripId = localStorage.getItem('currentTripId');
    if (initialTripId && !tripData) {
      fetchTripData(initialTripId);
    }
    // Charger les préférences globales si pas de voyage au montage
    if (!initialTripId && !currentTravelId) { // Ajout condition pour ne pas charger si un voyage est déjà là
        loadUserPreferences(); // Appeler sans argument pour global
    }
    
    // Vérifier s'il y a un message en attente dans le localStorage
    const pendingMessage = localStorage.getItem('pendingChatMessage');
    if (pendingMessage) {
      // Supprimer le message du localStorage pour éviter de le traiter plusieurs fois
      localStorage.removeItem('pendingChatMessage');
      
      // Initialiser une conversation avec ce message et détection automatique
      setTimeout(() => {
        // @ts-ignore
        if (window.initializeConversationWithMessage) {
          // @ts-ignore
          window.initializeConversationWithMessage(pendingMessage);
          } else {
          // Fallback si la fonction n'est pas encore disponible
          setMessages([{ role: 'assistant', content: "Bonjour ! Comment puis-je vous aider ?", timestamp: new Date() }]);
          setMessages(prev => [...prev, { role: 'user', content: pendingMessage, timestamp: new Date() }]);
          setTimeout(() => {
            handleUserMessageRef.current?.(pendingMessage);
          }, 500);
        }
      }, 500); // Petit délai pour s'assurer que le composant est complètement monté
    }
  }, [fetchTripData, tripData, currentTravelId, loadUserPreferences]); // Ajouter les dépendances

  // useEffect pour charger les préférences spécifiques au voyage
  useEffect(() => {
      if (currentTravelId) {
        loadUserPreferences(currentTravelId); // Charger préférences liées au voyage
    }
    // Si currentTravelId devient null, recharger les globales?
    // else { loadUserPreferences(); } // A décommenter si nécessaire
  }, [currentTravelId, loadUserPreferences]); // Ajouter loadUserPreferences
  
  // ---- Déclaration de handleSubmit ----
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() === '') return;
    
    const messageToSend = input;
    setInput(''); // Vider l'input immédiatement
    
    // Appeler handleSendMessage qui gère l'ajout du message user à l'état
    handleSendMessage(messageToSend);
  };
  // ------------------------------------

  // Récupérer les paramètres de l'URL
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const destination = query.get('destination');
    const dateDepart = query.get('dateDepart');
    const dateRetour = query.get('dateRetour');
    const nombreVoyageurs = query.get('nombreVoyageurs');
    const typeVoyage = query.get('typeVoyage');
    const budget = query.get('budget');
    const message = query.get('message');

    if (destination && dateDepart && dateRetour && nombreVoyageurs) {
      const travelRequest: TravelRequest = {
        destination: destination,
        dateDepart: dateDepart,
        dateRetour: dateRetour,
        nombreVoyageurs: parseInt(nombreVoyageurs, 10),
        message: message || undefined
      };

      if (typeVoyage) travelRequest.typeVoyage = typeVoyage;
      if (budget) travelRequest.budget = budget;

      setTravelRequest(travelRequest);
      
      // Construire un message initial pour l'assistant basé sur les paramètres
      const initialPrompt = `Je souhaite planifier un voyage à ${destination} du ${dateDepart} au ${dateRetour} pour ${nombreVoyageurs} personne${parseInt(nombreVoyageurs, 10) > 1 ? 's' : ''}${typeVoyage ? `, type de voyage: ${typeVoyage}` : ''}${budget ? `, budget: ${budget}` : ''}.`;
      
      setUserMessage(initialPrompt);
    }
  }, []);

  // Fonction pour formater les données de voyage en texte structuré pour Ollama
  const formatTravelDataForOllama = (travelData: TravelRequest): string => {
    let promptText = `J'ai besoin d'un plan de voyage pour ${travelData.nombreVoyageurs} personne${travelData.nombreVoyageurs > 1 ? 's' : ''} à ${travelData.destination} du ${travelData.dateDepart} au ${travelData.dateRetour}.`;
    
    if (travelData.typeVoyage) {
      promptText += ` Type de voyage: ${travelData.typeVoyage}.`;
    }
    
    if (travelData.budget) {
      promptText += ` Budget approximatif: ${travelData.budget}.`;
    }

    promptText += "\n\nPour ce voyage, propose-moi:";
    promptText += "\n1. Un itinéraire jour par jour";
    promptText += "\n2. Des suggestions d'hébergement";
    promptText += "\n3. Des activités recommandées";
    promptText += "\n4. Estimation de budget pour l'ensemble du séjour";
    promptText += "\n\nRéponds uniquement en JSON structuré comme suit:";
    promptText += `\n{
    "itinéraire": [
      {"jour": 1, "date": "...", "activités": ["...", "..."], "hébergement": "...", "repas_recommandés": ["...", "..."]},
      {"jour": 2, "date": "...", "activités": ["...", "..."], "hébergement": "...", "repas_recommandés": ["...", "..."]}
    ],
    "hébergements": [
      {"nom": "...", "type": "...", "prix_estimé": "...", "lien": "..."},
      {"nom": "...", "type": "...", "prix_estimé": "...", "lien": "..."}
    ],
    "budget_total": {
      "hébergement": "...",
      "nourriture": "...",
      "activités": "...",
      "transport": "...",
      "total_estimé": "..."
    },
    "conseils": ["...", "..."]
  }`;

    return promptText;
  };

  // Fonction pour détecter les demandes d'action dans le navigateur
  const detectBrowserAction = (message: string): boolean => {
    const browserActionKeywords = [
      'réserve', 'réserver', 'cherche', 'recherche', 'trouve', 'compare', 
      'visite', 'achète', 'acheter', 'paye', 'payer', 'consulte', 'consulter',
      'vérifie', 'vérifier', 'site web', 'site internet', 'booking', 'airbnb'
    ];
    
    const lowerMessage = message.toLowerCase();
    return browserActionKeywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  };

  // Fonction pour traiter un message qui demande une action dans le navigateur
  const handleBrowserAction = async (message: string) => {
    // Ajouter un message indiquant que l'assistant va effectuer l'action
    const processingMessage: ChatMessage = {
      role: 'assistant',
      content: "Je vais effectuer cette action pour vous dans le navigateur. Veuillez patienter un moment...",
      timestamp: new Date(),
      isLoading: true,
    };
    
    setMessages(prevMessages => [...prevMessages, processingMessage]);
    scrollToBottom();
    
    try {
      await browserAgent.executeTask({ 
        task: message,
        model: 'qwen:72b-4k-gguf',  // Utiliser Qwen 72B pour de meilleures performances
        maxSteps: 10,
        debug: false
      });
    } catch (error) {
      console.error("Erreur lors de l'exécution de l'agent:", error);
    }
  };

  const { currentTrip } = useTrip();

  const requiresWebSearch = (message: string): boolean => {
    const searchIndicators = [
      "recherche", "trouve", "cherche", "information", "actuel", "récent",
      "à jour", "nouveau", "dernière", "récente", "meilleur", "recommandation",
      "prix", "tarif", "coût", "disponibilité", "horaire", "heure", "ouvert",
      "fermé", "adresse", "lieu", "emplacement", "avis", "review"
    ];
    
    const messageLC = message.toLowerCase();
    return searchIndicators.some(indicator => messageLC.includes(indicator.toLowerCase()));
  };

  // Ajoutons d'abord une fonction pour récupérer toutes les données du voyage
  const fetchTravelContext = async (travelId: string) => {
    if (!travelId || !user) return null;
    
    try {
      // Récupérer les notes
      const notesRef = collection(db, 'notes');
      const notesQuery = query(notesRef, where('tripId', '==', travelId));
      const notesSnapshot = await getDocs(notesQuery);
      const notes = notesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Récupérer les événements du calendrier
      const eventsRef = collection(db, 'events');
      const eventsQuery = query(eventsRef, where('tripId', '==', travelId));
      const eventsSnapshot = await getDocs(eventsQuery);
      const events = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Récupérer les liens
      const tripDoc = await getDoc(doc(db, 'travels', travelId));
      const tripData = tripDoc.data();
      const links = tripData?.links || [];

      // Récupérer les points de carte
      const mapPointsRef = collection(db, 'mapPoints');
      const mapPointsQuery = query(mapPointsRef, where('tripId', '==', travelId));
      const mapPointsSnapshot = await getDocs(mapPointsQuery);
      const mapPoints = mapPointsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        notes,
        events,
        links,
        mapPoints,
        tripData
      };
    } catch (error) {
      console.error("Erreur lors de la récupération du contexte voyage:", error);
      return null;
    }
  };

  // Modifier la fonction sendMessage pour inclure le contexte
  const sendMessage = async () => {
    if (input.trim() === '') return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setInput('');
    setIsLoading(true);
    
    try {
      // Si un voyage est sélectionné, récupérer le contexte
      if (currentTravelId) {
        const travelContext = await fetchTravelContext(currentTravelId);
        
        if (travelContext) {
          // Formatage des notes en texte
          const notesText = travelContext.notes.length > 0 
            ? travelContext.notes.map(note => `- ${note.title}: ${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}`).join('\n')
            : 'Aucune note';
          
          // Formatage des événements en texte
          const eventsText = travelContext.events.length > 0
            ? travelContext.events.map(event => `- ${event.title}: ${formatDate(event.start)} - ${formatDate(event.end)}, ${event.location || 'Lieu non spécifié'}`).join('\n')
            : 'Aucun événement';
          
          // Formatage des liens en texte
          const linksText = travelContext.links.length > 0
            ? travelContext.links.map(link => `- ${link.title}: ${link.url}`).join('\n')
            : 'Aucun lien';
          
          // Formatage des points de carte en texte
          const mapPointsText = travelContext.mapPoints.length > 0
            ? travelContext.mapPoints.map(point => `- ${point.title}: ${point.lat}, ${point.lng}`).join('\n')
            : 'Aucun point sur la carte';
          
          // Créer un message de contexte pour le modèle (non visible pour l'utilisateur)
          const contextMessage: ChatMessage = {
            role: 'system',
            content: `Contexte du voyage à ${tripData?.destination || 'destination inconnue'} (${formatDate(tripData?.startDate)} - ${formatDate(tripData?.endDate)}) :
            
NOTES:
${notesText}

ÉVÉNEMENTS:
${eventsText}

LIENS IMPORTANTS:
${linksText}

POINTS D'INTÉRÊT:
${mapPointsText}

Utilise ces informations pour contextualiser ta réponse à la demande de l'utilisateur: "${input}"`,
            timestamp: new Date(),
            systemContextOnly: true // Propriété pour indiquer que ce message ne doit pas être affiché
          };
          
          // Ajouter le message système AVANT le message utilisateur pour le contexte
          setMessages(prev => [...prev, contextMessage, userMessage]);
        } else {
          setMessages(prev => [...prev, userMessage]);
        }
      } else {
        // Pas de voyage sélectionné, traitement normal
        setMessages(prev => [...prev, userMessage]);
      }
      
      // Continuer avec le reste du code de sendMessage...
      // ...
      
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Fonction pour lier un message à un voyage
  const linkMessageToTrip = async (message: ChatMessage, travelId: string) => {
    if (!travelId || !user) {
      toast({
        title: "Erreur",
        description: "Impossible de lier ce message : voyage non sélectionné ou utilisateur non connecté",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Mettre à jour l'état local du message
      setMessages(prev => 
        prev.map(msg => 
          msg === message ? {...msg, linkedToTrip: true, travelId} : msg
        )
      );
      
      // Sauvegarder le message dans Firestore
      const messageData = {
        ...message,
        linkedToTrip: true,
        travelId: travelId,
        userId: user.uid,
        timestamp: new Date().toISOString()
      };
      
      // Ajouter à la collection 'messages'
      await addDoc(collection(db, 'messages'), messageData);
      
      // Créer aussi une note si souhaité
      await addDoc(collection(db, 'notes'), {
        userId: user.uid,
        tripId: travelId,
        title: `Message du chat - ${new Date().toLocaleDateString('fr-FR')}`,
        content: message.content,
        tags: ['chat'],
        isImportant: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      toast({
        title: "Message lié au voyage",
        description: tripData ? `Message ajouté à votre voyage vers ${tripData.destination}` : "Message lié au voyage sélectionné",
      });
    } catch (error) {
      console.error("Erreur lors de la liaison du message:", error);
      toast({
        title: "Erreur",
        description: "Impossible de lier ce message au voyage.",
        variant: "destructive",
      });
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);

  useEffect(() => {
    const fetchAvailableTrips = async () => {
      if (!user) return;
      
      try {
        const tripsRef = collection(db, 'travels');
        const q = query(tripsRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        
        const trips = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Trip[];
        
        // Trier les voyages par date de départ (les plus proches en premier)
        trips.sort((a, b) => {
          const dateA = new Date(a.startDate);
          const dateB = new Date(b.startDate);
          return dateA.getTime() - dateB.getTime();
        });
        
        setAvailableTrips(trips);
      } catch (error) {
        console.error("Erreur lors du chargement des voyages:", error);
      }
    };
    
    fetchAvailableTrips();
  }, [user]);

  return (
    <div className="flex flex-col h-full max-h-screen bg-gradient-to-b from-background to-background/90">
      {/* En-tête du chat avec informations sur le voyage en cours */}
      <div className="p-4 border-b border-border/40 backdrop-blur-sm flex justify-between items-center bg-background/80 sticky top-0 z-10">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">Assistant IA</h2>
          {tripData && (
            <div className="ml-4 text-sm flex items-center">
              <span className="bg-primary/10 text-primary rounded-full px-3 py-1 flex items-center backdrop-blur-sm border border-primary/20">
                <MapPin className="h-4 w-4 mr-1" />
                {tripData.destination}
                <Calendar className="h-4 w-4 ml-2 mr-1" />
                {formatDate(tripData.startDate)} - {formatDate(tripData.endDate)}
                <Users className="h-4 w-4 ml-2 mr-1" />
                {tripData.numPeople}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          {tripData && (
            <Button variant="ghost" className="hover:bg-primary/10 transition-all duration-200" onClick={() => setShowTripSelector(true)}>
              Changer de voyage
            </Button>
          )}
          {!tripData && (
            <Button variant="ghost" className="hover:bg-primary/10 transition-all duration-200" onClick={() => setShowCreateTravelModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau voyage
            </Button>
          )}
        </div>
      </div>
      
      {/* Afficher le bouton de création manuelle si en mode debug */}
      {debugMode && !currentTravelId && (
        <div className="py-2 px-4">
          {renderManualTravelButton()}
        </div>
      )}

      {/* Sélecteur de voyage */}
      {showTripSelector && (
        <div className="p-4 border-b border-border/40 backdrop-blur-sm bg-background/80">
          <TripSelector 
            onSelectTrip={handleSelectTrip}
            selectedTripId={currentTravelId}
          />
          <div className="flex justify-end mt-2">
            <Button 
              variant="ghost" 
              size="sm"
              className="hover:bg-primary/10 transition-all duration-200"
              onClick={() => setShowTripSelector(false)}
            >
              Fermer
            </Button>
          </div>
        </div>
      )}

      {/* Zone des messages */}
      <div
        ref={messagesEndRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar"
      >
        {messages
          .filter(message => !message.systemContextOnly) // Ne pas afficher les messages de contexte système
          .map((message, index) => (
            <MessageItem 
              key={index} 
              message={message} 
              isLast={index === messages.length - 1}
              onLinkToTrip={() => linkMessageToTrip(message, currentTravelId || '')}
              tripData={tripData}
              currentTravelId={currentTravelId || undefined}
            />
          ))}
        {isLoading && (
          <div className="flex justify-center my-2 animate-fade-in">
            <div className="inline-flex items-center bg-gray-100/80 text-gray-700 px-3 py-1.5 rounded-full text-sm">
              <Search className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
              Réflexion en cours...
            </div>
          </div>
        )}
      </div>
      
      {/* Formulaire d'envoi */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border/40 backdrop-blur-sm bg-background/80 sticky bottom-0">
        <div className="flex space-x-2 max-w-4xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tapez votre message ici..."
            className="flex-1 bg-background/50 border-border/60 focus-visible:ring-primary/30 rounded-xl"
          />
          <Button 
            type="submit" 
            className="rounded-xl bg-primary hover:bg-primary/90 transition-all duration-200"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </form>
      
      {/* Modal de création de voyage */}
      {showCreateTravelModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-background/95 border border-border/40 rounded-xl p-6 max-w-md w-full shadow-xl animate-in zoom-in-95"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">Créer un nouveau voyage</h2>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateTravelModal(false);
                }}
                className="p-2 rounded-full hover:bg-primary/10 transition-all duration-200"
              >
                ×
              </button>
            </div>
            
            {/* Utiliser CreateTravelModal de manière appropriée */}
        <CreateTravelModal 
          onClose={() => setShowCreateTravelModal(false)}
          onCreateTravel={handleCreateTravel}
        />
          </div>
        </div>
      )}

      {/* Afficher les résultats de l'agent de navigation s'ils sont disponibles */}
      {browserAgent.result && <BrowserAgentResults result={browserAgent.result} />}
      
      {/* Indicateur de chargement pour l'agent */}
      {browserAgent.isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600">Exécution de l'action dans le navigateur...</span>
        </div>
      )}

      <div className="p-3 border-b border-border/40 bg-background/90 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Sélectionnez un voyage</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowCreateTravelModal(true)}
            className="ml-2"
          >
            <Plus className="h-4 w-4 mr-1" /> Nouveau
          </Button>
        </div>
        
        <div className="mt-2 flex overflow-x-auto pb-2 no-scrollbar gap-2">
          {availableTrips.length === 0 ? (
            <div className="text-sm text-gray-500 py-2">
              Aucun voyage disponible. Créez-en un nouveau !
            </div>
          ) : (
            availableTrips.map(trip => (
              <button
                key={trip.id}
                onClick={() => handleSelectTrip(trip)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-colors ${
                  currentTravelId === trip.id 
                    ? 'bg-primary text-white' 
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                {trip.destination}
              </button>
            ))
          )}
        </div>
      </div>

      {currentTravelId && tripData && (
        <div className="p-2 bg-primary/5 rounded-lg mt-2 flex items-center">
          <div className="flex-1">
            <div className="font-medium text-primary text-sm flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              {tripData.destination || "Voyage"}
            </div>
            <div className="text-xs text-gray-500">
              {tripData.startDate ? formatDate(tripData.startDate) : "?"} - 
              {tripData.endDate ? formatDate(tripData.endDate) : "?"}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setCurrentTravelId(null)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

// Créer le composant CreateTravelModal pour remplacer celui qui est manquant
interface CreateTravelModalProps {
  onClose: () => void;
  onCreateTravel: (travelData: NewTravelData) => Promise<boolean>;
}

const CreateTravelModal = ({ onClose, onCreateTravel }: CreateTravelModalProps) => {
  const [formData, setFormData] = useState<NewTravelData>({
    destination: '',
    dateDepart: new Date().toISOString().split('T')[0],
    dateRetour: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    nombreVoyageurs: 1,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'nombreVoyageurs' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Empêcher la propagation de l'événement
    
    if (!formData.destination) {
      setError("Veuillez saisir une destination");
      return;
    }
    
    try {
      setIsSubmitting(true);
      const success = await onCreateTravel(formData);
      if (success) {
        onClose();
      }
    } catch (err) {
      setError("Une erreur est survenue lors de la création du voyage");
      console.error("Erreur création voyage:", err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="w-full">
        {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
          <label htmlFor="destination" className="block text-sm font-medium mb-1 text-foreground/80">
              Destination
            </label>
            <input
              type="text"
              id="destination"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
            className="w-full p-2 border border-border/60 bg-background/50 focus:border-primary/50 focus:ring-primary/30 rounded-lg outline-none transition-all duration-200"
              placeholder="Paris, Rome, Tokyo..."
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
            <label htmlFor="dateDepart" className="block text-sm font-medium mb-1 text-foreground/80">
                Date de départ
              </label>
              <input
                type="date"
                id="dateDepart"
                name="dateDepart"
                value={formData.dateDepart}
                onChange={handleChange}
              className="w-full p-2 border border-border/60 bg-background/50 focus:border-primary/50 focus:ring-primary/30 rounded-lg outline-none transition-all duration-200"
                required
              />
            </div>
            
            <div>
            <label htmlFor="dateRetour" className="block text-sm font-medium mb-1 text-foreground/80">
                Date de retour
              </label>
              <input
                type="date"
                id="dateRetour"
                name="dateRetour"
                value={formData.dateRetour}
                onChange={handleChange}
              className="w-full p-2 border border-border/60 bg-background/50 focus:border-primary/50 focus:ring-primary/30 rounded-lg outline-none transition-all duration-200"
                required
              />
            </div>
          </div>
          
          <div>
          <label htmlFor="nombreVoyageurs" className="block text-sm font-medium mb-1 text-foreground/80">
              Nombre de voyageurs
            </label>
            <select
              id="nombreVoyageurs"
              name="nombreVoyageurs"
              value={formData.nombreVoyageurs}
              onChange={handleChange}
            className="w-full p-2 border border-border/60 bg-background/50 focus:border-primary/50 focus:ring-primary/30 rounded-lg outline-none transition-all duration-200"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
          
          <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-1 text-foreground/80">
              Notes (optionnel)
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              rows={3}
            className="w-full p-2 border border-border/60 bg-background/50 focus:border-primary/50 focus:ring-primary/30 rounded-lg outline-none transition-all duration-200"
              placeholder="Informations complémentaires sur votre voyage..."
            />
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
            className="px-4 py-2 border border-border/60 rounded-lg hover:bg-background/80 transition-all duration-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-all duration-200"
            >
              {isSubmitting ? 'Création...' : 'Créer le voyage'}
            </button>
          </div>
        </form>
    </div>
  );
};

