"use client";

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ChatHistory, ChatMessage } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { Send, ArrowLeft, Loader, Sparkles, User } from 'lucide-react';
import Link from 'next/link';

// Fonctions d'extraction pour la génération de titres
const extractDestination = (text: string): string | null => {
  // Motifs de destination
  const destinationPatterns = [
    /(?:à|a|au|en|aux|pour|vers|direction)\s+([A-Z][a-zÀ-ÿ\s-]+)(?:\s|,|.|$)/i,
    /(?:visiter|découvrir|explorer)\s+([A-Z][a-zÀ-ÿ\s-]+)(?:\s|,|.|$)/i,
    /voyage\s+(?:à|a|au|en|aux)\s+([A-Z][a-zÀ-ÿ\s-]+)(?:\s|,|.|$)/i,
    /séjour\s+(?:à|a|au|en|aux)\s+([A-Z][a-zÀ-ÿ\s-]+)(?:\s|,|.|$)/i,
  ];
  
  for (const pattern of destinationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
};

const extractDates = (text: string): string[] => {
  const dates: string[] = [];
  
  // Format simple: du 10 au 20 juin
  const simplePattern = /(?:du|depuis le)\s+(\d{1,2}(?:\s+)?(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|janv|févr|fév|mar|avr|mai|juin|juil|août|sept|oct|nov|déc)?)\s+(?:au|jusqu'au|à)\s+(\d{1,2}(?:\s+)?(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|janv|févr|fév|mar|avr|mai|juin|juil|août|sept|oct|nov|déc))/i;
  
  const simpleMatch = text.match(simplePattern);
  if (simpleMatch) {
    if (simpleMatch[2].includes(simpleMatch[1])) {
      // Si la première date inclut le mois, on utilise le format court
      dates.push(simpleMatch[1] + "-" + simpleMatch[2]);
    } else {
      // Sinon on utilise le format complet
      dates.push(simpleMatch[1] + " au " + simpleMatch[2]);
    }
  }
  
  // Format mois: juin 2023
  const monthPattern = /\b(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})\b/i;
  const monthMatch = text.match(monthPattern);
  if (monthMatch && dates.length === 0) {
    dates.push(monthMatch[1]);
  }
  
  // Période générique
  if (text.includes("semaine prochaine") && dates.length === 0) {
    dates.push("semaine prochaine");
  } else if (text.includes("mois prochain") && dates.length === 0) {
    dates.push("mois prochain");
  } else if (text.includes("ce week-end") && dates.length === 0) {
    dates.push("week-end");
  }
  
  return dates;
};

const extractBudget = (text: string): string | null => {
  // Formats: budget de 1000€, 1500 euros, etc.
  const budgetPattern = /(?:budget|coût|prix|montant|dépenser).*?(\d+\s*(?:€|euros|EUR|dollars|\$|USD))/i;
  const budgetMatch = text.match(budgetPattern);
  
  if (budgetMatch && budgetMatch[1]) {
    return budgetMatch[1].trim();
  }
  
  return null;
};

const extractPeople = (text: string): string | null => {
  // Formats: 2 personnes, avec 3 amis, etc.
  const peoplePatterns = [
    /(\d+)\s+(?:personne|personnes|voyageur|voyageurs|ami|amis|adulte|adultes)/i,
    /(?:avec|pour|accompagné de)\s+(\d+)\s+(?:personne|personnes|voyageur|voyageurs|ami|amis|adulte|adultes)/i,
    /(?:nous\s+sommes|en\s+groupe\s+de)\s+(\d+)(?:\s+personnes|\s+voyageurs)?/i,
  ];
  
  for (const pattern of peoplePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // Si "nous" est mentionné sans nombre précis
  if (text.includes(" nous ") || text.includes(" on ") || text.includes("ensemble")) {
    return "2";
  }
  
  return null;
};

export default function ChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [chatId] = useState<string>(params.id as string);
  const [chatHistory, setChatHistory] = useState<ChatHistory | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const [titleGenerated, setTitleGenerated] = useState(false);
  
  // Chargement de l'historique de conversation
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        if (chatId !== 'new') {
          // Charger un historique existant
          const docRef = doc(db, 'conversations', chatId);
          const docSnapshot = await getDoc(docRef);
          
          if (docSnapshot.exists()) {
            const data = docSnapshot.data() as ChatHistory;
            setChatHistory({
              ...data,
              id: docSnapshot.id
            });
            setMessages(data.messages);
            console.log("Conversation chargée:", {
              id: docSnapshot.id,
              title: data.title,
              messagesCount: data.messages?.length || 0
            });
          } else {
            setError("Conversation non trouvée");
            console.error("Document non trouvé pour ID:", chatId);
          }
        } else {
          // Nouvelle conversation
          setChatHistory({
            userId: user.uid,
            title: "Nouvelle conversation",
            messages: [
              {
                id: uuidv4(),
                role: 'system',
                content: 'Je suis votre assistant de voyage personnel. Je peux vous aider à planifier votre itinéraire et répondre à toutes vos questions sur les destinations.',
                timestamp: new Date().toISOString()
              },
              {
                id: uuidv4(),
                role: 'assistant',
                content: 'Bonjour ! Je suis IA Voyageur, votre assistant personnel pour planifier vos voyages. Comment puis-je vous aider aujourd\'hui ?',
                timestamp: new Date().toISOString()
              }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [],
            isFavorite: false
          });
          
          setMessages([
            {
              id: uuidv4(),
              role: 'system',
              content: 'Je suis votre assistant de voyage personnel. Je peux vous aider à planifier votre itinéraire et répondre à toutes vos questions sur les destinations.',
              timestamp: new Date().toISOString()
            },
            {
              id: uuidv4(),
              role: 'assistant',
              content: 'Bonjour ! Je suis IA Voyageur, votre assistant personnel pour planifier vos voyages. Comment puis-je vous aider aujourd\'hui ?',
              timestamp: new Date().toISOString()
            }
          ]);
        }
      } catch (err) {
        console.error("Erreur lors du chargement de la conversation:", err);
        setError("Impossible de charger la conversation");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchChatHistory();
  }, [user, chatId]);
  
  // Auto-scroll vers le bas du chat quand de nouveaux messages sont ajoutés
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Fonction pour envoyer un message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSendingMessage || !user || !chatHistory) return;

    const currentInput = inputValue;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: currentInput,
      timestamp: new Date().toISOString()
    };

    // Snapshot des messages AVANT d'ajouter le message utilisateur (pour history)
    const historySnapshot = messages
      .filter(msg => msg.role !== 'system')
      .slice(-6)
      .map(msg => ({ role: msg.role, text: msg.content }));

    // Ajouter le message utilisateur à l'affichage
    const messagesWithUser = [...messages, userMessage];
    setMessages(messagesWithUser);
    setInputValue('');
    setIsSendingMessage(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: currentInput,
          tripContext: null,
          history: historySnapshot,
        }),
      });

      if (!response.ok) throw new Error('Erreur de connexion');

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: data.text || "Désolé, je n'ai pas pu répondre.",
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...messagesWithUser, assistantMessage];
      setMessages(updatedMessages);
      
      // Générer un titre automatique si c'est une nouvelle conversation ou après le premier message
      let updatedHistory = chatHistory;
      if (chatId === 'new' || (chatHistory?.title === 'Nouvelle conversation' && updatedMessages.filter(m => m.role === 'user').length === 1)) {
        // Récupérer le premier message de l'utilisateur
        const firstUserMessage = updatedMessages.find(m => m.role === 'user')?.content || inputValue;
        
        console.log("GÉNÉRATION DE TITRE: Condition activée", {
          chatId,
          isNew: chatId === 'new',
          currentTitle: chatHistory?.title,
          userMessagesCount: updatedMessages.filter(m => m.role === 'user').length
        });
        
        // Générer un titre avec Ollama
        try {
          console.log("GÉNÉRATION DE TITRE: Appel à Ollama pour le titre");

          const ollamaResponse = await fetch(`${process.env.NEXT_PUBLIC_OLLAMA_BASE_URL ?? 'http://localhost:11434'}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? 'qwen3.5:9b',
              messages: [
                {
                  role: 'system',
                  content: 'Génère un titre court (4-7 mots) pour cette conversation de voyage. Réponds uniquement avec le titre, sans ponctuation finale ni explications.'
                },
                { role: 'user', content: firstUserMessage }
              ],
              stream: false,
              options: { temperature: 0.3 }
            }),
          });

          if (ollamaResponse.ok) {
            const titleData = await ollamaResponse.json();
            let title = titleData.message?.content?.trim() ?? '';
            
            console.log("GÉNÉRATION DE TITRE: Titre brut généré par Ollama:", title);
            
            // Nettoyer le titre si nécessaire (enlever guillemets, etc.)
            title = title.replace(/^["']|["']$/g, '').trim();
            
            // Si le titre généré est valide, l'utiliser
            if (title && title.length > 0 && title.length <= 60) {
              updatedHistory = { ...chatHistory, title };
              setChatHistory(updatedHistory);
              setTitleGenerated(true);
              console.log("GÉNÉRATION DE TITRE: Titre final retenu:", title);
              
              // Réinitialiser l'indicateur après quelques secondes
              setTimeout(() => {
                setTitleGenerated(false);
              }, 3000); // Correspond à la durée de l'animation
            } else {
              throw new Error("Titre généré invalide");
            }
          } else {
            throw new Error(`Erreur lors de l'appel à Ollama: ${ollamaResponse.status}`);
          }
        } catch (error) {
          console.log("GÉNÉRATION DE TITRE: Échec de la génération avec Ollama, utilisation de la méthode locale", error);
          
          // Fallback: Utiliser notre méthode d'extraction locale
          // Extraire des informations clés du message
          const destination = extractDestination(firstUserMessage);
          const dates = extractDates(firstUserMessage);
          const budget = extractBudget(firstUserMessage);
          const people = extractPeople(firstUserMessage);
          
          let title = "";
          
          // Construire un titre descriptif basé sur les informations extraites
          if (destination) {
            title += destination;
            
            if (dates.length > 0) {
              title += " " + dates[0];
            }
            
            if (budget) {
              title += " Budget " + budget;
            }
            
            if (people) {
              title += " " + people + " Pers.";
            }
          } else {
            // Si aucune destination n'est détectée, utiliser un titre de base
            title = firstUserMessage;
            if (title.length > 30) {
              title = title.substring(0, 30) + '...';
            }
          }
          
          updatedHistory = { ...chatHistory, title };
          setChatHistory(updatedHistory);
          setTitleGenerated(true);
          console.log("GÉNÉRATION DE TITRE: Titre local généré:", title);
          
          // Réinitialiser l'indicateur après quelques secondes
          setTimeout(() => {
            setTitleGenerated(false);
          }, 3000); // Correspond à la durée de l'animation
        }
      }
      
      // Sauvegarder la conversation dans Firestore
      try {
        // S'assurer que le titre est défini avec un fallback si nécessaire
        if (!updatedHistory?.title) {
          updatedHistory = {
            ...updatedHistory!,
            title: "Conversation du " + new Date().toLocaleDateString('fr-FR')
          };
          setChatHistory(updatedHistory);
        }
        
        // Préparer les données pour Firestore
        const conversionData = {
          userId: user.uid,
          title: updatedHistory.title,
          messages: updatedMessages,
          updatedAt: new Date().toISOString(),
          tags: updatedHistory.tags || []
        };
        
        if (chatId === 'new') {
          // Pour une nouvelle conversation, ajouter la date de création
          const newConversationData = {
            ...conversionData,
            createdAt: new Date().toISOString(),
            isFavorite: false
          };
          
          console.log("SAUVEGARDE: Création d'une nouvelle conversation", {
            title: newConversationData.title,
            messagesCount: newConversationData.messages.length
          });
          
          // Créer un nouveau document dans Firestore
          const newChatRef = await addDoc(collection(db, 'conversations'), newConversationData);
          console.log("SAUVEGARDE: Conversation créée avec ID:", newChatRef.id);
          
          // Mettre à jour l'état local avec le nouvel ID
          setChatHistory(prev => ({
            ...prev!,
            id: newChatRef.id
          }));
          
          // Rediriger vers la page de la nouvelle conversation
          router.replace(`/dashboard/chat/${newChatRef.id}`);
        } else {
          // Pour une conversation existante
          console.log("SAUVEGARDE: Mise à jour de la conversation", {
            id: chatId,
            title: conversionData.title,
            messagesCount: conversionData.messages.length
          });
          
          // Mettre à jour le document existant
          await updateDoc(doc(db, 'conversations', chatId), conversionData);
        }
        
        // Notifier les autres composants de la mise à jour
        window.dispatchEvent(new Event('chatHistoryRefresh'));
      } catch (error) {
        console.error("ERREUR: Échec de la sauvegarde de la conversation:", error);
      }
    } catch (error) {
      console.error('Erreur lors de la communication avec Ollama:', error);
      
      // Message d'erreur en cas d'échec
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: "Je suis désolé, je n'ai pas pu traiter votre demande. Veuillez vérifier que le serveur Ollama est en cours d'exécution et réessayer.",
        timestamp: new Date().toISOString()
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
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
  
  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }
  
  if (!user) {
    return null; // La redirection sera gérée par l'effet
  }
  
  if (error) {
    return (
      <div className="p-6 bg-[#f8f5ec] min-h-screen">
        <div className="max-w-3xl mx-auto">
          <div className="bg-red-50 p-4 rounded-lg text-red-700 mb-6">
            {error}
          </div>
          <Link 
            href="/dashboard?view=chat-history" 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Retour à l'historique</span>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-[#f8f5ec] overflow-hidden">
      {/* Header avec titre dynamique */}
      <header className="h-14 border-b border-[#e6e0d4] flex items-center justify-between px-4 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard?view=chat-history"
            className="p-1.5 rounded-md hover:bg-[#f0ece3] transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-600" />
          </Link>
          
          {chatId === 'new' || !chatHistory?.title || chatHistory.title === 'Nouvelle conversation' ? (
            <div className="relative flex items-center">
              <h2 className="font-medium text-gray-800 truncate max-w-md">
                {chatHistory?.title || "Nouvelle conversation"}
              </h2>
              {titleGenerated && (
                <div className="absolute -top-5 left-0 text-xs text-green-600 animate-fade-out">
                  Titre généré !
                </div>
              )}
            </div>
          ) : (
            <div className="group relative cursor-pointer">
              <h2 className="font-medium text-gray-800 truncate max-w-md group-hover:text-blue-600 transition-colors">
                {chatHistory.title}
              </h2>
              {titleGenerated && (
                <div className="absolute -top-5 left-0 text-xs text-green-600 animate-fade-out">
                  Titre mis à jour !
                </div>
              )}
              <div className="absolute hidden group-hover:block top-full left-0 bg-white shadow-md p-2 rounded-md text-xs text-gray-500 whitespace-nowrap z-10">
                Généré à partir du contexte de la conversation
              </div>
            </div>
          )}
        </div>
        
        {/* Indicateur visuel de génération de titre */}
        {isSendingMessage && chatId === 'new' && (
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <div className="animate-spin h-3 w-3 border-t-2 border-blue-500 rounded-full"></div>
            <span>Génération du titre...</span>
          </div>
        )}
      </header>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-auto p-4 bg-[#f8f5ec]">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-6">
            {messages
              .filter(msg => msg.role !== 'system')
              .map((msg) => (
                <div 
                  key={msg.id} 
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
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    <div 
                      className={`text-xs mt-2 ${
                        msg.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      
      {/* Chat Input */}
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
          <p className="text-xs text-gray-500 mt-2 text-center">
            Powered by Ollama · Les réponses sont générées par intelligence artificielle et peuvent ne pas être précises.
          </p>
        </div>
      </div>
    </div>
  );
} 