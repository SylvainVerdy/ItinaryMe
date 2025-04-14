"use client";

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ChatHistory, ChatMessage } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { Send, ArrowLeft, Loader, Sparkles, User } from 'lucide-react';
import Link from 'next/link';

interface ChatPageProps {
  params: {
    id: string;
  };
}

export default function ChatPage({ params }: ChatPageProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [chatId] = useState<string>(params.id);
  const [chatHistory, setChatHistory] = useState<ChatHistory | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  
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
  
  // Fonction pour envoyer un message au serveur Ollama
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSendingMessage || !user || !chatHistory) return;
    
    // Ajouter message de l'utilisateur au chat
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputValue('');
    setIsSendingMessage(true);
    
    try {
      // Appel API à Ollama
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen2.5',
          messages: [
            { role: 'system', content: 'Tu es un assistant de voyage appelé IA Voyageur. Tu aides les utilisateurs à planifier leur voyage, à découvrir des destinations et à créer des itinéraires. Sois précis, utile et amical.' },
            ...messages
              .filter(msg => msg.role !== 'system' || msg.role === 'system' && msg === messages[0])
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
        id: uuidv4(),
        role: 'assistant',
        content: data.message.content,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prevMessages => [...prevMessages, assistantMessage]);
      
      // Générer un titre automatique si c'est une nouvelle conversation
      let updatedHistory = chatHistory;
      if (chatId === 'new' || (chatHistory?.title === 'Nouvelle conversation' && messages.length <= 2)) {
        // Créer un titre basé sur le premier message de l'utilisateur
        // Option 1: Utiliser directement le contenu du message utilisateur (limité à 30 caractères)
        let title = inputValue;
        if (title.length > 30) {
          title = title.substring(0, 30) + '...';
        }
        
        // Option 2: Demander à l'IA de générer un titre basé sur le message
        try {
          const titleResponse = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'qwen2.5',
              messages: [
                { 
                  role: 'system', 
                  content: 'Génère un titre court et descriptif (3-6 mots) pour une conversation basée sur ce message. Réponds uniquement avec le titre, sans ponctuation ni explications.' 
                },
                { role: 'user', content: inputValue }
              ],
              stream: false
            }),
          });
          
          if (titleResponse.ok) {
            const titleData = await titleResponse.json();
            const generatedTitle = titleData.message.content.trim();
            
            // Si le titre généré est valide et pas trop long, l'utiliser
            if (generatedTitle && generatedTitle.length > 0 && generatedTitle.length <= 40) {
              title = generatedTitle;
            }
          }
        } catch (titleError) {
          console.error("Erreur lors de la génération du titre:", titleError);
          // En cas d'erreur, utiliser le titre par défaut (déjà défini)
        }
        
        updatedHistory = { ...chatHistory, title };
        setChatHistory(updatedHistory);
        
        console.log("Titre généré:", title);
      }
      
      // Sauvegarder la conversation dans Firestore
      try {
        const updatedMessages = [...messages, userMessage, assistantMessage];
        
        // S'assurer que le titre est défini
        if (!updatedHistory?.title) {
          updatedHistory = {
            ...updatedHistory!,
            title: "Conversation du " + new Date().toLocaleDateString('fr-FR')
          };
          setChatHistory(updatedHistory);
          console.log("Un titre par défaut a été généré");
        }
        
        console.log("Sauvegarde de la conversation:", {
          id: chatId,
          isNew: chatId === 'new',
          title: updatedHistory?.title || "Titre par défaut", // Fallback
          messagesCount: updatedMessages.length,
          userId: user.uid,
          collection: 'conversations'
        });
        
        if (chatId === 'new') {
          // Créer une nouvelle conversation
          const conversationData = {
            ...updatedHistory,
            messages: updatedMessages,
            updatedAt: new Date().toISOString(),
            userId: user.uid,
            title: updatedHistory?.title || "Conversation du " + new Date().toLocaleDateString('fr-FR') // Fallback supplémentaire
          };
          
          console.log("Structure des données à sauvegarder:", {
            userId: conversationData.userId,
            title: conversationData.title,
            messagesCount: conversationData.messages.length,
            createdAt: conversationData.createdAt,
            updatedAt: conversationData.updatedAt,
          });
          
          const newChatRef = await addDoc(collection(db, 'conversations'), conversationData);
          
          console.log("Nouvelle conversation créée avec ID:", newChatRef.id);
          
          setChatHistory(prev => ({
            ...prev!,
            id: newChatRef.id
          }));
          
          // Déclencher la mise à jour de l'historique des conversations
          window.dispatchEvent(new Event('chatHistoryRefresh'));
          
          // Rediriger vers la nouvelle URL
          router.replace(`/dashboard/chat/${newChatRef.id}`);
        } else {
          // Mettre à jour une conversation existante
          const updateData = {
            title: updatedHistory?.title || "Conversation du " + new Date().toLocaleDateString('fr-FR'), // Fallback
            messages: updatedMessages,
            updatedAt: new Date().toISOString()
          };
          
          await updateDoc(doc(db, 'conversations', chatId), updateData);
          
          console.log("Conversation existante mise à jour, ID:", chatId);
          
          // Déclencher la mise à jour de l'historique des conversations
          window.dispatchEvent(new Event('chatHistoryRefresh'));
        }
      } catch (error) {
        console.error("Erreur lors de la sauvegarde de la conversation:", error);
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
      {/* Header */}
      <header className="h-14 border-b border-[#e6e0d4] flex items-center justify-between px-4 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard?view=chat-history"
            className="p-1.5 rounded-md hover:bg-[#f0ece3] transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-600" />
          </Link>
          <h2 className="font-medium text-gray-800 truncate max-w-md">
            {chatHistory?.title || "Nouvelle conversation"}
          </h2>
        </div>
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