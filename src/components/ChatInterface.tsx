'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { interpretTravelRequest } from '@/ai/flows/interpret-travel-request';
import { analyzeBrowserContent } from '@/ai/flows/analyze-browser-content';
import { doc, getDoc, updateDoc, getFirestore, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useBrowserAgent } from '@/hooks/useBrowserAgent';
import { Pencil, Save, FileText, Plus, Calendar, MapPin, Users, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Trip, Note } from '@/lib/types';
import * as noteService from '@/services/noteService';
import { detectBasicTravelInfo } from '@/ai/flows/interpret-travel-request';

// Configuration pour Ollama
const OLLAMA_API_URL = 'http://localhost:11434/api';

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

export const ChatInterface = () => {
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

  // Fonction pour appeler Ollama pour détecter une demande de voyage
  const detectTravelRequestWithOllama = async (userMessage: string): Promise<TravelRequest> => {
    try {
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

  // Fonction pour créer un nouveau voyage
  const createNewTravel = async (travelData: NewTravelData) => {
    if (!user) return null;
    
    try {
      // Créer un nouveau document de voyage dans Firestore
      const newTravel = {
        ...travelData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const travelRef = await addDoc(collection(db, 'travels'), newTravel);
      
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
      console.error('Erreur lors de la création du voyage:', error);
      
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
      
      // Première méthode: vérifier avec Ollama si le message contient une demande de voyage
      const ollamaDetection = await detectTravelRequestWithOllama(userMessage);
      
      // Deuxième méthode: utiliser notre propre analyseur pour détecter les informations de voyage
      const localDetection = analyzeMessageContent(userMessage);
      
      // Troisième méthode: utiliser l'interprétation basée sur le modèle OpenAI
      const aiAnalysis = await interpretTravelRequest({ request: userMessage });
      
      // Quatrième méthode: utiliser la détection basique comme fallback
      const basicDetection = detectBasicTravelInfo(userMessage);
      
      // Si aucun voyage actif, vérifier si l'utilisateur mentionne un voyage
      if (!currentTravelId) {
        // Combiner toutes les sources de détection
        const isVoyageRequest = ollamaDetection.isValid || 
                               localDetection.hasTravelInfo || 
                               aiAnalysis.isValidTravelRequest ||
                               basicDetection.isValidTravelRequest;
                               
        const destination = aiAnalysis.destination || 
                           ollamaDetection.destination || 
                           localDetection.destination || 
                           basicDetection.destination ||
                           "destination non spécifiée";
        
        const startDate = aiAnalysis.startDate || 
                         ollamaDetection.startDate || 
                         localDetection.startDate || 
                         basicDetection.startDate ||
                         new Date().toISOString().split('T')[0];
                         
        const endDate = aiAnalysis.endDate || 
                       ollamaDetection.endDate || 
                       localDetection.endDate || 
                       basicDetection.endDate ||
                       new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                           
        const numPeople = aiAnalysis.numPeople || 
                         ollamaDetection.numPeople || 
                         localDetection.numPeople || 
                         basicDetection.numPeople || 
                         1;
                         
        const budget = aiAnalysis.budget || 
                      ollamaDetection.budget || 
                      localDetection.budget || 
                      basicDetection.budget;
                      
        const activities = aiAnalysis.activities || 
                          ollamaDetection.activities || 
                          (localDetection.hasActivity ? ["Activités détectées"] : undefined) ||
                          basicDetection.activities || 
                          [];
        
        // Si au moins une des méthodes a détecté une intention de voyage
        if (isVoyageRequest) {
          // Créer un contexte pour les notes
          let contextNotes = `Voyage détecté automatiquement:\n\n${userMessage}\n\n`;
          
          if (destination && destination !== "destination non spécifiée") {
            contextNotes += `Destination: ${destination}\n`;
          }
          
          if (startDate) contextNotes += `Date de départ: ${startDate}\n`;
          if (endDate) contextNotes += `Date de retour: ${endDate}\n`;
          if (numPeople) contextNotes += `Nombre de personnes: ${numPeople}\n`;
          if (budget) contextNotes += `Budget: ${budget}\n`;
          
          if (activities && activities.length > 0) {
            contextNotes += `Activités: ${activities.join(', ')}\n`;
          }
          
          if (aiAnalysis.preferences) {
            contextNotes += `Préférences: ${aiAnalysis.preferences}\n`;
          } else if (localDetection.preferences) {
            contextNotes += `Préférences: ${localDetection.preferences}\n`;
          } else if (basicDetection.preferences) {
            contextNotes += `Préférences: ${basicDetection.preferences}\n`;
          }
          
          // Créer l'objet de données de voyage
          const newTravelData: NewTravelData = {
            destination: destination !== "destination non spécifiée" ? destination : "Nouveau voyage",
            dateDepart: startDate,
            dateRetour: endDate,
            nombreVoyageurs: numPeople,
            notes: contextNotes
          };
          
          // Demander confirmation à l'utilisateur
          const shouldCreateTravel = window.confirm(
            `J'ai détecté que vous planifiez peut-être un voyage${destination !== "destination non spécifiée" ? ` à ${destination}` : ""}. Souhaitez-vous créer une nouvelle fiche de voyage pour enregistrer ces informations?`
          );
          
          if (shouldCreateTravel) {
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
                  text: `J'ai créé un nouveau voyage${destination !== "destination non spécifiée" ? ` à ${destination}` : ""} et j'ai enregistré les informations suivantes :
                  
${destination !== "destination non spécifiée" ? `Destination: ${destination}` : ""}
${startDate ? `Date de départ: ${startDate}` : ""}
${endDate ? `Date de retour: ${endDate}` : ""}
${numPeople ? `Nombre de personnes: ${numPeople}` : ""}
${budget ? `Budget: ${budget}` : ""}

Vous pouvez maintenant me poser des questions sur ce voyage ou me demander des suggestions!`, 
                  sender: 'assistant' 
                }];
              });
              
              return;
            }
          }
        }
      }

      // Vérifier si l'utilisateur souhaite ajouter quelque chose aux notes
      const addToNotesMatch = userMessage.match(/^(ajoute[rz]?\s+(?:à|a|aux)\s+mes\s+notes\s*:?|notes?\s*:)\s*(.+)$/i);
      if (addToNotesMatch && addToNotesMatch[2]) {
        const noteToAdd = addToNotesMatch[2].trim();
        
        // Vérifier si le voyage a des notes existantes
        const updatedNotes = travelNotes 
          ? `${travelNotes}\n\n${noteToAdd}` 
          : noteToAdd;
        
        const success = await updateTravelNotes(updatedNotes);
        
        // Remplacer l'indicateur de chargement par la réponse
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages.pop(); // Supprimer le message "Traitement de votre demande..."
          
          if (success) {
            return [...newMessages, { 
              text: "J'ai ajouté cette note à votre voyage. Voici vos notes mises à jour :\n\n" + updatedNotes, 
              sender: 'assistant' 
            }];
          } else {
            return [...newMessages, { 
              text: "Je n'ai pas pu ajouter cette note à votre voyage. Veuillez réessayer ultérieurement.", 
              sender: 'assistant' 
            }];
          }
        });
        
        return;
      }
      
      // Vérifier si l'utilisateur souhaite remplacer/modifier complètement les notes
      const replaceNotesMatch = userMessage.match(/^(modifie[rz]?\s+mes\s+notes\s*:?|remplace[rz]?\s+mes\s+notes\s*:?)\s*(.+)$/i);
      if (replaceNotesMatch && replaceNotesMatch[2]) {
        const newNotes = replaceNotesMatch[2].trim();
        
        const success = await updateTravelNotes(newNotes);
        
        // Remplacer l'indicateur de chargement par la réponse
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages.pop(); // Supprimer le message "Traitement de votre demande..."
          
          if (success) {
            return [...newMessages, { 
              text: "J'ai modifié les notes de votre voyage. Voici vos nouvelles notes :\n\n" + newNotes, 
              sender: 'assistant' 
            }];
          } else {
            return [...newMessages, { 
              text: "Je n'ai pas pu modifier les notes de votre voyage. Veuillez réessayer ultérieurement.", 
              sender: 'assistant' 
            }];
          }
        });
        
        return;
      }
      
      // Vérifier si l'utilisateur demande à voir les notes actuelles
      if (userMessage.match(/^(montre[rz]?\s+mes\s+notes|affiche[rz]?\s+mes\s+notes|voir\s+mes\s+notes)/i)) {
        // Remplacer l'indicateur de chargement par la réponse
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages.pop(); // Supprimer le message "Traitement de votre demande..."
          
          if (travelNotes && travelNotes.trim()) {
            return [...newMessages, { 
              text: "Voici les notes de votre voyage :\n\n" + travelNotes, 
              sender: 'assistant' 
            }];
          } else {
            return [...newMessages, { 
              text: "Vous n'avez pas encore de notes pour ce voyage. Vous pouvez en ajouter en commençant votre message par 'ajoute à mes notes:' suivi de votre texte.", 
              sender: 'assistant' 
            }];
          }
        });
        
        return;
      }

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

  return (
    <div className="flex flex-col h-full w-full p-6 space-y-5 bg-gradient-to-br from-green-50 to-beige-50 rounded-2xl shadow-lg">
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

