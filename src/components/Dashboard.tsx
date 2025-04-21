"use client";

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, getDoc, doc } from 'firebase/firestore';
import { LogoutButton } from './LogoutButton';
import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';
import { 
  PlusCircle, 
  MessageSquare, 
  Settings, 
  FolderOpen, 
  Calendar, 
  MapPin,
  ChevronRight,
  Send,
  Loader,
  X,
  Globe,
  Search,
  Menu,
  Clock,
  Users,
  User,
  Sparkles,
  FileText,
  Bookmark,
  LogOut
} from 'lucide-react';
import { TravelDocumentList } from './TravelDocumentList';
import { ChatHistoryList } from './ChatHistoryList';

// Interface pour la réponse JSON d'Ollama
interface OllamaTravelResponse {
  confirmation: boolean;
  destination: string;
  date_depart: string;
  date_retour: string;
  nombre_voyageurs: number;
  type_voyage?: string;
  budget?: string;
  informations_manquantes: string[];
  message_utilisateur: string;
}

interface TravelPlan {
  id: string;
  destination: string;
  dateDepart: string;
  dateRetour: string;
  nombreVoyageurs: number;
  imageUrl: string | null;
  imageId: string | null;
  isFavorite: boolean;
  createdAt: Date;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface FirestoreImageData {
  base64Data: string;
  travelId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: any;
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [travelPlans, setTravelPlans] = useState<TravelPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebar, setSidebar] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'travel' | 'chat' | 'documents' | 'chat-history'>('dashboard');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'system',
      content: 'Je suis votre assistant de voyage personnel. Je peux vous aider à planifier votre itinéraire et répondre à toutes vos questions sur les destinations.',
      timestamp: new Date()
    },
    {
      role: 'assistant',
      content: 'Bonjour ! Je suis IA Voyageur, votre assistant personnel pour planifier vos voyages. Comment puis-je vous aider aujourd\'hui ?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Fonction pour récupérer les données de voyage depuis Firestore
  useEffect(() => {
    const fetchTravelPlans = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        console.log("Dashboard: Chargement des voyages pour l'utilisateur", user.uid);
        
        const travelQuery = query(
          collection(db, 'travels'),
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(travelQuery);
        const travels: TravelPlan[] = [];
        
        // Créer un tableau pour stocker les promesses de récupération d'images
        const imagePromises: Promise<void>[] = [];
        
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          
          // Vérifier que le voyage appartient à l'utilisateur actuel
          if (data.userId !== user.uid) {
            console.warn(`Voyage ${docSnapshot.id} n'appartient pas à l'utilisateur ${user.uid}`);
            return; // Passer au voyage suivant
          }
          
          const travel = {
            id: docSnapshot.id,
            destination: data.destination,
            dateDepart: data.dateDepart || data.startDate,
            dateRetour: data.dateRetour || data.endDate,
            nombreVoyageurs: data.nombreVoyageurs || data.numPeople || 1,
            imageUrl: data.imageUrl || null, // URL par défaut
            imageId: data.imageId || null,
            isFavorite: data.isFavorite || false,
            createdAt: data.createdAt?.toDate() || new Date(),
          };
          
          travels.push(travel);
          
          // Si le voyage a un ID d'image, ajouter une promesse pour récupérer l'image
          if (travel.imageId) {
            const imagePromise = getDoc(doc(db, 'images', travel.imageId))
              .then(imageDoc => {
                if (imageDoc.exists()) {
                  const imageData = imageDoc.data() as FirestoreImageData;
                  if (imageData && imageData.base64Data) {
                    travel.imageUrl = imageData.base64Data;
                  }
                }
              })
              .catch(error => {
                console.error(`Erreur lors de la récupération de l'image pour le voyage ${travel.id}:`, error);
              });
            
            imagePromises.push(imagePromise);
          }
        });
        
        // Attendre que toutes les promesses d'images soient résolues
        if (imagePromises.length > 0) {
        await Promise.all(imagePromises);
        }
        
        // Trier les voyages par date de création (plus récent d'abord)
        travels.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        console.log(`Dashboard: ${travels.length} voyages trouvés pour l'utilisateur ${user.uid}`);
        setTravelPlans(travels);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors de la récupération des voyages:", error);
        setLoading(false);
      }
    };

    fetchTravelPlans();
  }, [user]);

  // Auto-scroll vers le bas du chat quand de nouveaux messages sont ajoutés
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Fonction pour envoyer un message au serveur Ollama
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSendingMessage) return;

    // Ajouter message de l'utilisateur au chat
    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    
    setChatMessages(prevMessages => [...prevMessages, userMessage]);
    setInputValue('');
    setIsSendingMessage(true);

    try {
      // Vérifier si le message contient une intention de voyage
      // Import de la fonction nécessaire depuis le module
      if (typeof window !== "undefined") {
        try {
          // Tenter de détecter une intention de voyage dans le message
          const messageToAnalyze = inputValue;
          
          // Détection d'une intention de voyage basée sur des expressions régulières
          const destinationRegex = /(?:voyage|visiter|partir|aller|séjour)(?:.*?)(?:à|en|au|pour|vers)\s+([A-Z][a-zÀ-ÿ]+|[A-Za-zÀ-ÿ\s]+)/i;
          const datesRegex = /(?:du|le|pour le)\s+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})(?:.*?)(?:au|jusqu'au|jusqu'à|à)\s+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i;
          const nbPersonnesRegex = /(\d+)\s+(?:personne|personnes|voyageur|voyageurs)/i;
          
          const containsDestination = destinationRegex.test(messageToAnalyze);
          const containsDates = datesRegex.test(messageToAnalyze);
          const explicitDestinations = /\b(Italie|Rome|Florence|Paris|France|Espagne|Madrid|Barcelone|Portugal|Lisbonne|Allemagne|Berlin|Grèce|Athènes|Londres|Angleterre|New York|Japon|Tokyo)\b/i.test(messageToAnalyze);
          const travelKeywords = /(?:voyage|séjour|vacances|visiter|partir|planifier|organiser|réserver|découvrir|explorer)/i.test(messageToAnalyze);
          
          const couldBeTravelIntent = (containsDestination || (explicitDestinations && travelKeywords)) && messageToAnalyze.length > 15;
          
          // Si le message est long et contient des mots-clés liés au voyage
          if (couldBeTravelIntent) {
            console.log("Intention de voyage détectée, extraction des informations");
            
            // Extraction des informations
            let destination = "";
            let dateDepart = "";
            let dateRetour = "";
            let nombreVoyageurs = 0;
            let type_voyage = "";
            let budget = "";
            
            // Extraire la destination
            const destinationMatch = messageToAnalyze.match(destinationRegex);
            if (destinationMatch && destinationMatch[1]) {
              destination = destinationMatch[1].trim();
            } else {
              // Essayer une autre approche pour extraire la destination
              const directDestMatch = messageToAnalyze.match(/\b(Italie|Rome|Florence|Paris|France|Espagne|Madrid|Barcelone|Portugal|Lisbonne|Allemagne|Berlin|Grèce|Athènes|Londres|Angleterre|New York|Japon|Tokyo)\b/i);
              if (directDestMatch) {
                destination = directDestMatch[0];
              }
            }
            
            // Extraire les dates
            const datesMatch = messageToAnalyze.match(datesRegex);
            if (datesMatch && datesMatch[1] && datesMatch[2]) {
              dateDepart = datesMatch[1];
              dateRetour = datesMatch[2];
            }
            
            // Extraire le nombre de voyageurs
            const nbPersonnesMatch = messageToAnalyze.match(nbPersonnesRegex);
            if (nbPersonnesMatch && nbPersonnesMatch[1]) {
              nombreVoyageurs = parseInt(nbPersonnesMatch[1], 10);
            }
            
            // Détecter le type de voyage (vacances, affaires, etc.)
            const typeVoyageMatch = messageToAnalyze.match(/\b(vacances|affaires|tourisme|loisir|détente|culturel|aventure|romantique|familial)\b/i);
            if (typeVoyageMatch) {
              type_voyage = typeVoyageMatch[0];
            }
            
            // Détecter le budget estimé
            const budgetMatch = messageToAnalyze.match(/budget(?:.*?)(?:de|environ|:)\s+(\d+[\s,.]?(?:\d+)?(?:\s?[€$]|\s?euros|\s?dollars)?)/i);
            if (budgetMatch && budgetMatch[1]) {
              budget = budgetMatch[1].trim();
            }
            
            // Création de l'objet JSON pour Ollama
            const travelInfoJson = {
              type: "travel_intent",
              query: messageToAnalyze,
              extracted_info: {
                destination: destination || null,
                date_depart: dateDepart || null,
                date_retour: dateRetour || null,
                nombre_voyageurs: nombreVoyageurs || null,
                type_voyage: type_voyage || null,
                budget: budget || null
              },
              has_complete_info: !!(destination && dateDepart && dateRetour && nombreVoyageurs)
            };
            
            console.log("Informations de voyage extraites:", travelInfoJson);
            
            // Message intermédiaire pour indiquer que l'assistant va créer un voyage
            const intermediateMessage: ChatMessage = {
              role: 'assistant',
              content: "J'ai détecté que vous souhaitez planifier un voyage. Je vais analyser votre demande...",
              timestamp: new Date()
            };
            
            setChatMessages(prevMessages => [...prevMessages, intermediateMessage]);
            
            // Appel API à Ollama avec les informations extraites
            const response = await fetch('http://localhost:11434/api/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'qwen2.5',
                messages: [
                  { 
                    role: 'system', 
                    content: `Tu es un assistant de voyage appelé IA Voyageur. Tu aides les utilisateurs à planifier leur voyage.
                    Je t'envoie une intention de voyage déjà détectée avec certaines informations extraites.
                    Ton rôle est de:
                    1. Vérifier les informations extraites et les corriger si nécessaire
                    2. Demander les informations manquantes s'il y en a
                    3. Répondre exclusivement en format JSON structuré comme suit:
                    {
                      "confirmation": true,
                      "destination": "destination confirmée/corrigée", 
                      "date_depart": "date de départ confirmée/corrigée",
                      "date_retour": "date de retour confirmée/corrigée",
                      "nombre_voyageurs": nombre confirmé/corrigé,
                      "type_voyage": "type de voyage détecté",
                      "budget": "budget estimé si mentionné",
                      "informations_manquantes": ["liste des infos manquantes"],
                      "message_utilisateur": "message à afficher à l'utilisateur demandant les infos manquantes ou confirmant les infos"
                    }
                    Si des informations sont manquantes, liste-les dans "informations_manquantes" et demande-les poliment dans "message_utilisateur".
                    Si toutes les informations sont présentes, "informations_manquantes" doit être un tableau vide et "message_utilisateur" doit être un message de confirmation.
                    Ta réponse DOIT être un objet JSON valide et rien d'autre.` 
                  },
                  { 
                    role: 'user', 
                    content: JSON.stringify(travelInfoJson) 
                  }
                ],
                stream: false
              }),
            });

            if (!response.ok) {
              throw new Error('Erreur de connexion à Ollama');
            }

            const data = await response.json();
            
            try {
              // Tentative de parser la réponse JSON
              let jsonResponse: OllamaTravelResponse;
              try {
                // Si la réponse est déjà un objet
                if (typeof data.message.content === 'object') {
                  jsonResponse = data.message.content as OllamaTravelResponse;
                } else {
                  // Sinon, on parse la chaîne
                  jsonResponse = JSON.parse(data.message.content) as OllamaTravelResponse;
                }
                
                console.log("Réponse JSON d'Ollama:", jsonResponse);
                
                // Ajouter la réponse formatée de l'assistant au chat
                const assistantMessage: ChatMessage = {
                  role: 'assistant',
                  content: jsonResponse.message_utilisateur || "J'ai bien reçu vos informations de voyage.",
                  timestamp: new Date()
                };
                
                setChatMessages(prevMessages => [...prevMessages, assistantMessage]);
                
                // Si toutes les informations sont complètes, proposer de créer le voyage
                if (jsonResponse.confirmation && jsonResponse.informations_manquantes.length === 0) {
                  setTimeout(() => {
                    // Créer le message avec le bouton
                    const buttonMessage: ChatMessage = {
                      role: 'system',
                      content: `<div style="margin-top: 10px;">
                        <button 
                          onclick="window.location.href='/chat?message=${encodeURIComponent(messageToAnalyze)}&destination=${encodeURIComponent(jsonResponse.destination)}&dateDepart=${encodeURIComponent(jsonResponse.date_depart)}&dateRetour=${encodeURIComponent(jsonResponse.date_retour)}&nombreVoyageurs=${jsonResponse.nombre_voyageurs}&typeVoyage=${encodeURIComponent(jsonResponse.type_voyage || '')}&budget=${encodeURIComponent(jsonResponse.budget || '')}'" 
                          style="display: inline-block; padding: 0.75rem 1.5rem; background: linear-gradient(to right, #3B82F6, #2563EB); color: white; border: none; border-radius: 0.5rem; font-weight: 500; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.1); transition: all 0.2s ease;"
                          onmouseover="this.style.background='linear-gradient(to right, #2563EB, #1D4ED8)'"
                          onmouseout="this.style.background='linear-gradient(to right, #3B82F6, #2563EB)'"
                        >
                          Créer mon voyage à ${jsonResponse.destination}
                        </button>
                      </div>`,
                      timestamp: new Date()
                    };
                    
                    setChatMessages(prevMessages => [...prevMessages, buttonMessage]);
                  }, 1000);
                }
                
                setIsSendingMessage(false);
                return;
                
              } catch (jsonError) {
                console.error("Erreur lors du parsing de la réponse JSON:", jsonError);
                // Continuer avec le flux normal en cas d'erreur de parsing
              }
            } catch (processingError) {
              console.error("Erreur lors du traitement de la réponse JSON:", processingError);
              // Continuer avec le flux normal en cas d'erreur de traitement
            }
          }
        } catch (detectionError) {
          console.error("Erreur lors de la détection d'intention de voyage:", detectionError);
          // Continuer avec le flux normal en cas d'erreur
        }
      }

      // Appel API à Ollama (flux normal si pas d'intention de voyage détectée ou erreur)
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen2.5',
          messages: [
            { role: 'system', content: 'Tu es un assistant de voyage appelé IA Voyageur. Tu aides les utilisateurs à planifier leur voyage, à découvrir des destinations et à créer des itinéraires. Si tu détectes une intention de voyage, suggère à l\'utilisateur de créer un voyage à partir de l\'interface principale pour obtenir une expérience complète de planification. Sois précis, utile et amical.' },
            ...chatMessages
              .filter(msg => msg.role !== 'system')
              .map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: inputValue }
          ],
          stream: false
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur de connexion à Ollama');
      }

      const data = await response.json();
      
      // Ajouter la réponse de l'assistant au chat
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message.content,
        timestamp: new Date()
      };
      
      setChatMessages(prevMessages => [...prevMessages, assistantMessage]);

      // Historiser automatiquement la conversation avec un titre généré
      if (user) {
        try {
          // Ne pas sauvegarder si c'est la première intervention de l'utilisateur
          const updatedMessages = [...chatMessages, userMessage, assistantMessage];
          const userMessagesCount = updatedMessages.filter(msg => msg.role === 'user').length;
          
          if (userMessagesCount === 0) {
            console.log("Pas d'historisation: aucun message utilisateur");
            return;
          }
          
          // Extraire le premier message de l'utilisateur pour générer le titre
          const firstUserMessage = updatedMessages.find(msg => msg.role === 'user')?.content || "";
          
          // Générer un titre pour la conversation
          let title = "Conversation du " + new Date().toLocaleDateString('fr-FR');
          
          // Utiliser Ollama pour générer un titre plus descriptif
          try {
            console.log("Génération du titre pour la conversation...");
            const titleResponse = await fetch('http://localhost:11434/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'qwen2.5',
                messages: [
                  { 
                    role: 'system', 
                    content: `Génère un titre court mais descriptif (4-7 mots) pour une conversation basée sur ce message.
                    Le titre doit être accrocheur et résumer au mieux le sujet de la conversation.
                    Inclus les éléments clés comme:
                    - La destination principale du voyage si mentionnée
                    - La période ou les dates si mentionnées
                    - Le type de voyage (affaires, vacances, etc.) si mentionné
                    - Tout autre élément distinctif important
                    
                    Réponds uniquement avec le titre, sans ponctuation finale ni explications supplémentaires.` 
                  },
                  { role: 'user', content: firstUserMessage }
                ],
                stream: false,
              }),
            });
            
            if (titleResponse.ok) {
              const titleData = await titleResponse.json();
              const generatedTitle = titleData.message.content.trim();
              
              // Si le titre généré est valide, l'utiliser
              if (generatedTitle && generatedTitle.length > 0 && generatedTitle.length <= 60) {
                title = generatedTitle.replace(/^["']|["']$/g, '').trim();
                console.log("Titre généré pour la conversation:", title);
              }
            }
          } catch (titleError) {
            console.error("Erreur lors de la génération du titre, utilisation du titre par défaut:", titleError);
          }
          
          // Sauvegarder la conversation avec le titre généré
          const docRef = await addDoc(collection(db, 'conversations'), {
            userId: user.uid,
            title: title,
            messages: updatedMessages.map(msg => ({
              id: Math.random().toString(36).substring(2, 15),
              role: msg.role,
              content: msg.content,
              timestamp: typeof msg.timestamp === 'string' ? msg.timestamp : msg.timestamp.toISOString()
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [],
            isFavorite: false
          });
          
          console.log("Conversation historisée avec succès - Titre:", title, "ID:", docRef.id);
          
          // Déclencher une mise à jour de l'historique des conversations
          window.dispatchEvent(new Event('chatHistoryRefresh'));
        } catch (error) {
          console.error("Erreur lors de l'historisation de la conversation:", error);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la communication avec Ollama:', error);
      
      // Message d'erreur en cas d'échec
      setChatMessages(prevMessages => [
        ...prevMessages, 
        {
          role: 'assistant',
          content: "Je suis désolé, je n'ai pas pu traiter votre demande. Veuillez vérifier que le serveur Ollama est en cours d'exécution et réessayer.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsSendingMessage(false);
      // Focus sur le champ de saisie après l'envoi
      if (chatInputRef.current) {
        chatInputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) {
    return <div className="p-8 text-center">Veuillez vous connecter pour accéder à votre tableau de bord.</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      {sidebar && (
        <div className="w-64 border-r border-[#e6e0d4] bg-white h-screen flex flex-col">
          {/* Logo */}
          <div className="h-14 border-b border-[#e6e0d4] px-4 flex items-center">
            <span className="text-xl font-medium text-blue-600">ItinaryMe</span>
          </div>
          
          {/* Search */}
          <div className="px-3 py-3">
            <div className="px-2 py-1.5 bg-[#f5f2e9] rounded-md flex items-center gap-2 text-gray-500">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-500"
              />
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-2 py-2 space-y-1">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                currentView === 'dashboard' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:bg-[#f0ece3]'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              <span>Tableau de bord</span>
            </button>
            
            <button
              onClick={() => setCurrentView('chat')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                currentView === 'chat' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:bg-[#f0ece3]'
              }`}
            >
              <MessageSquare size={18} />
              <span>Assistant IA</span>
            </button>
            
            <Link
              href="/chat"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-[#f0ece3]"
            >
              <Globe size={18} />
              <span>Chat Web</span>
            </Link>
            
            <button
              onClick={() => setCurrentView('chat-history')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                currentView === 'chat-history' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:bg-[#f0ece3]'
              }`}
            >
              <MessageSquare size={18} className="rotate-90" />
              <span>Historique des conversations</span>
            </button>
            
            <button
              onClick={() => setCurrentView('documents')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                currentView === 'documents' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:bg-[#f0ece3]'
              }`}
            >
              <FileText size={18} />
              <span>Documents</span>
            </button>
          </nav>
          
          {/* Raccourcis */}
          <div className="px-2 py-2 border-t border-[#e6e0d4] mt-2">
            <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase">
              Raccourcis
            </div>
            <div className="mt-1 space-y-1">
              <Link 
                href="/travel/new" 
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-[#f0ece3]"
              >
                <PlusCircle size={18} />
                <span>Nouveau voyage</span>
              </Link>
              <Link 
                href="/calendar" 
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-[#f0ece3]"
              >
                <Calendar size={18} />
                <span>Calendrier</span>
              </Link>
            </div>
          </div>
          
          {/* User */}
          <div className="border-t border-[#e6e0d4] p-3">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {user?.displayName || user?.email || 'Utilisateur'}
                </p>
              </div>
              <LogoutButton 
                variant="icon" 
                onClick={async () => {
                  try {
                    await signOut();
                    window.location.href = '/';
                  } catch (error) {
                    console.error('Erreur lors de la déconnexion:', error);
                  }
                }} 
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f5ec]">
        {/* Header */}
        <header className="h-14 border-b border-[#e6e0d4] flex items-center justify-between px-4 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {!sidebar && (
              <button 
                onClick={() => setSidebar(true)}
                className="p-1.5 rounded-md hover:bg-[#f0ece3] transition-colors"
              >
                <Menu size={18} />
              </button>
            )}
            <h2 className="font-medium text-gray-800">
              {currentView === 'dashboard' 
                ? 'Tableau de bord' 
                : currentView === 'chat' 
                  ? 'Assistant IA Voyageur' 
                  : currentView === 'documents'
                    ? 'Mes documents de voyage'
                    : currentView === 'chat-history'
                      ? 'Historique des conversations'
                      : 'Voyages'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Bouton pour actualiser le contenu */}
            <button 
              onClick={() => window.location.reload()}
              className="p-1.5 rounded-md hover:bg-[#f0ece3] transition-colors text-gray-600" 
              title="Actualiser"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                <path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
              </svg>
            </button>
            <button className="p-1.5 rounded-md hover:bg-[#f0ece3] transition-colors text-gray-600">
              <User size={18} />
            </button>
            <button className="p-1.5 rounded-md hover:bg-[#f0ece3] transition-colors text-gray-600">
              <Settings size={18} />
            </button>
          </div>
        </header>
        
        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="flex-1 overflow-auto p-6">
            <div className="w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6 hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                      <Calendar className="text-blue-600" size={20} />
                    </div>
                    <h3 className="font-medium text-lg text-gray-800">Mes voyages</h3>
                  </div>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {travelPlans.length > 0 
                      ? `Vous avez ${travelPlans.length} voyage(s) planifié(s). Votre prochain voyage est ${travelPlans[0]?.destination}.` 
                      : "Vous n'avez pas encore de voyages planifiés. Commencez à créer votre premier itinéraire."}
                  </p>
                  <Link 
                    href="/travel/new"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-colors text-sm font-medium"
                  >
                    <PlusCircle size={16} />
                    <span>Créer un nouvel itinéraire</span>
                  </Link>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6 hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
                      <Sparkles className="text-purple-600" size={20} />
                    </div>
                    <h3 className="font-medium text-lg text-gray-800">Assistant IA</h3>
                  </div>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    Discutez avec notre assistant IA pour obtenir des recommandations de voyage personnalisées et des conseils d'experts.
                  </p>
                  <button 
                    onClick={() => setCurrentView('chat')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition-colors text-sm font-medium"
                  >
                    <MessageSquare size={16} />
                    <span>Démarrer une conversation</span>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6 hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                      <FileText className="text-blue-600" size={20} />
                    </div>
                    <h3 className="font-medium text-lg text-gray-800">Documents de voyage</h3>
                  </div>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    Créez et gérez vos documents de voyage dans un format interactif inspiré de Notion.
                  </p>
                  <button 
                    onClick={() => setCurrentView('documents')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-colors text-sm font-medium"
                  >
                    <PlusCircle size={16} />
                    <span>Voir mes documents</span>
                  </button>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6 hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
                      <MessageSquare className="text-purple-600" size={20} />
                    </div>
                    <h3 className="font-medium text-lg text-gray-800">Historique des conversations</h3>
                  </div>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    Retrouvez l'historique de vos conversations avec l'assistant IA pour suivre vos conseils et suggestions.
                  </p>
                  <button 
                    onClick={() => {
                      setCurrentView('chat-history');
                      // Force le chargement des données en rafraîchissant la page
                      window.dispatchEvent(new Event('chatHistoryRefresh'));
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition-colors text-sm font-medium"
                  >
                    <FolderOpen size={16} />
                    <span>Voir l'historique</span>
                  </button>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6 mb-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                      <MapPin className="text-gray-700" size={20} />
                    </div>
                    <h3 className="font-medium text-lg text-gray-800">Mes itinéraires de voyage</h3>
                  </div>
                  <Link 
                    href="/travel/new" 
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f0ece3] text-gray-700 hover:bg-[#e6e0d4] transition-colors text-sm"
                  >
                    <PlusCircle size={14} />
                    <span>Nouveau</span>
                  </Link>
                </div>
                
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader className="animate-spin h-8 w-8 text-blue-500 mb-4" />
                    <p className="text-gray-500">Chargement de vos voyages...</p>
                  </div>
                ) : travelPlans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="h-16 w-16 rounded-full bg-[#f0ece3] flex items-center justify-center mb-4">
                      <Globe className="text-gray-500" size={28} />
                    </div>
                    <h4 className="text-lg font-medium text-gray-800 mb-2">Aucun voyage planifié</h4>
                    <p className="text-gray-500 mb-6 text-center max-w-md">
                      Vous n'avez pas encore créé d'itinéraire de voyage. Commencez maintenant pour planifier votre prochaine aventure.
                    </p>
                    <Link 
                      href="/travel/new" 
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-colors text-sm font-medium"
                    >
                      <PlusCircle size={16} />
                      <span>Créer mon premier itinéraire</span>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {travelPlans.map((travel) => (
                      <Link 
                        key={travel.id} 
                        href={`/travel/${travel.id}`}
                        className="group"
                      >
                        <div className="border border-[#e6e0d4] rounded-xl p-5 hover:shadow-md transition-all duration-300 group-hover:border-blue-300 bg-white/80 h-full flex flex-col">
                          <div className="mb-1 text-blue-600 flex items-center gap-2">
                            <MapPin size={14} />
                            <h3 className="font-medium">{travel.destination}</h3>
                          </div>
                          <div className="text-sm text-gray-600 mb-auto pb-4">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock size={14} className="text-gray-400" />
                              <span>Du {new Date(travel.dateDepart).toLocaleDateString()} au {new Date(travel.dateRetour).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users size={14} className="text-gray-400" />
                              <span>{travel.nombreVoyageurs} voyageur{travel.nombreVoyageurs > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-[#e6e0d4] text-sm text-blue-600 group-hover:text-blue-700 flex justify-end">
                            Voir l'itinéraire →
                          </div>
                        </div>
                      </Link>
                    ))}
                    
                    <Link 
                      href="/travel/new"
                      className="border border-dashed border-[#e6e0d4] rounded-xl p-5 hover:bg-white/50 transition-colors flex flex-col items-center justify-center text-center gap-3 h-full"
                    >
                      <div className="h-12 w-12 rounded-full bg-[#f0ece3] flex items-center justify-center">
                        <PlusCircle className="text-blue-600" size={24} />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800 mb-1">Nouveau voyage</h4>
                        <p className="text-sm text-gray-500">Créer un nouvel itinéraire</p>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Documents View */}
        {currentView === 'documents' && (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl mx-auto">
              <TravelDocumentList />
            </div>
          </div>
        )}
        
        {/* Chat History View */}
        {currentView === 'chat-history' && (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl mx-auto">
              <ChatHistoryList key={`chat-history-${Date.now()}`} />
            </div>
          </div>
        )}
        
        {/* Chat View */}
        {currentView === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto p-4 bg-[#f8f5ec]">
              <div className="max-w-3xl mx-auto">
                <div className="space-y-6">
                  {chatMessages.filter(msg => msg.role !== 'system').map((msg, index) => (
                    <div 
                      key={index} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center mr-2">
                          <Sparkles size={16} className="text-white" />
                        </div>
                      )}
                      <div 
                        className={`max-w-[80%] p-4 rounded-2xl ${
                          msg.role === 'user' 
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm' 
                            : 'bg-white border border-[#e6e0d4] text-gray-800 shadow-sm'
                        }`}
                      >
                        {msg.role === 'system' ? (
                          <div 
                            className="whitespace-pre-wrap leading-relaxed" 
                            dangerouslySetInnerHTML={{ __html: msg.content }}
                          />
                        ) : (
                          <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                        )}
                        <div 
                          className={`text-xs mt-2 ${
                            msg.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                          }`}
                        >
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {msg.role === 'user' && (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-200 to-purple-300 flex items-center justify-center ml-2">
                          <span className="text-purple-800 font-medium">
                            {user.email?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>
            
            <div className="border-t border-[#e6e0d4] p-4 bg-white">
              <div className="max-w-3xl mx-auto">
                <div className="relative bg-white rounded-xl shadow-sm border border-[#e6e0d4] overflow-hidden">
                  <textarea
                    ref={chatInputRef}
                    className="w-full pl-4 pr-12 py-3.5 bg-transparent resize-none focus:outline-none text-gray-800"
                    rows={2}
                    placeholder="Posez une question sur votre voyage..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSendingMessage}
                  />
                  <button
                    className={`absolute right-3 bottom-3 p-2 rounded-full transition-all ${
                      inputValue.trim() && !isSendingMessage
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm hover:from-blue-600 hover:to-blue-700'
                        : 'bg-[#f0ece3] text-gray-400 cursor-not-allowed'
                    }`}
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isSendingMessage}
                  >
                    {isSendingMessage ? (
                      <Loader size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500 text-center">
                    Powered by Ollama · Les réponses sont générées par intelligence artificielle et peuvent ne pas être précises.
                  </p>
                  <div className="flex items-center gap-2">
                    <button 
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      onClick={() => setCurrentView('chat-history')}
                    >
                      Voir l'historique des conversations
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 