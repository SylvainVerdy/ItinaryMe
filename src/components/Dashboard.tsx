"use client";

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
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
  Bookmark
} from 'lucide-react';
import { TravelDocumentList } from './TravelDocumentList';
import { ChatHistoryList } from './ChatHistoryList';

interface TravelPlan {
  id: string;
  destination: string;
  dateDepart: string;
  dateRetour: string;
  nombreVoyageurs: number;
  createdAt: Date;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export function Dashboard() {
  const { user } = useAuth();
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
        const travelQuery = query(
          collection(db, 'travels'),
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(travelQuery);
        const travels: TravelPlan[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          travels.push({
            id: doc.id,
            destination: data.destination,
            dateDepart: data.dateDepart,
            dateRetour: data.dateRetour,
            nombreVoyageurs: data.nombreVoyageurs,
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        });
        
        // Trier par date de création (plus récent en premier)
        travels.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setTravelPlans(travels);
      } catch (error) {
        console.error("Erreur lors de la récupération des voyages:", error);
      } finally {
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

      // Sauvegarder la conversation dans Firestore
      if (user) {
        try {
          await addDoc(collection(db, 'conversations'), {
            userId: user.uid,
            messages: [userMessage, assistantMessage],
            timestamp: new Date()
          });
        } catch (error) {
          console.error("Erreur lors de la sauvegarde de la conversation:", error);
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
    <div className="flex h-screen bg-[#f8f5ec] overflow-hidden">
      {/* Sidebar */}
      {sidebar && (
        <div className="w-60 bg-white border-r border-[#e6e0d4] flex flex-col h-full shadow-sm">
          <div className="p-4 border-b border-[#e6e0d4] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Globe size={18} className="text-white" />
              </div>
              <h1 className="font-medium text-lg tracking-tight">ItinaryMe</h1>
            </div>
            <button 
              onClick={() => setSidebar(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="px-2 py-4">
            <div className="relative mb-4">
              <input 
                type="text" 
                placeholder="Rechercher..." 
                className="w-full py-1.5 pl-8 pr-3 rounded-md bg-[#f8f5ec] text-sm border border-transparent focus:border-[#e6e0d4] focus:outline-none transition-colors"
              />
              <Search size={14} className="absolute left-2.5 top-2 text-gray-400" />
            </div>
            
            <button 
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
                currentView === 'dashboard' 
                  ? 'bg-[#f0ece3] text-gray-800 font-medium' 
                  : 'text-gray-600 hover:bg-[#f8f5ec]'
              }`}
              onClick={() => setCurrentView('dashboard')}
            >
              <FolderOpen size={16} />
              <span>{t('dashboard')}</span>
            </button>
            
            <button 
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
                currentView === 'chat' 
                  ? 'bg-[#f0ece3] text-gray-800 font-medium' 
                  : 'text-gray-600 hover:bg-[#f8f5ec]'
              }`}
              onClick={() => setCurrentView('chat')}
            >
              <Sparkles size={16} />
              <span>Assistant IA</span>
            </button>

            <button 
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
                currentView === 'documents' 
                  ? 'bg-[#f0ece3] text-gray-800 font-medium' 
                  : 'text-gray-600 hover:bg-[#f8f5ec]'
              }`}
              onClick={() => setCurrentView('documents')}
            >
              <FileText size={16} />
              <span>Documents</span>
            </button>

            <button 
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
                currentView === 'chat-history' 
                  ? 'bg-[#f0ece3] text-gray-800 font-medium' 
                  : 'text-gray-600 hover:bg-[#f8f5ec]'
              }`}
              onClick={() => setCurrentView('chat-history')}
            >
              <MessageSquare size={16} />
              <span>Historique des conversations</span>
            </button>
          </div>
          
          <div className="px-3 mt-2">
            <div className="flex items-center justify-between px-2 py-1">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Mes Voyages</h3>
              <Link href="/travel/new">
                <PlusCircle size={14} className="text-gray-400 hover:text-gray-600 transition-colors" />
              </Link>
            </div>
            
            <div className="mt-1 space-y-0.5">
              {travelPlans.length > 0 ? (
                travelPlans.map(travel => (
                  <Link 
                    key={travel.id}
                    href={`/travel/${travel.id}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-[#f8f5ec] text-gray-700 transition-colors group"
                  >
                    <div className="flex-shrink-0 h-4 w-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 opacity-80"></div>
                    <span className="truncate group-hover:text-gray-900">{travel.destination}</span>
                  </Link>
                ))
              ) : (
                <div className="text-xs text-gray-400 px-2 py-2">Aucun voyage planifié</div>
              )}
            </div>
          </div>
          
          <div className="mt-auto p-3">
            <div className="px-2 py-1 mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Raccourcis
            </div>
            <div className="space-y-1">
              <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-[#f8f5ec] text-gray-700 transition-colors">
                <Calendar size={14} className="text-gray-500" />
                <span>Calendrier</span>
              </button>
              <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-[#f8f5ec] text-gray-700 transition-colors">
                <Globe size={14} className="text-gray-500" />
                <span>Destinations</span>
              </button>
              <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-[#f8f5ec] text-gray-700 transition-colors">
                <Bookmark size={14} className="text-gray-500" />
                <span>Favoris</span>
              </button>
            </div>
          </div>
          
          <div className="mt-2 p-3 border-t border-[#e6e0d4]">
            <div className="flex items-center justify-between py-1 px-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-200 to-purple-300 flex items-center justify-center text-purple-800 font-medium overflow-hidden">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="text-sm font-medium">{user.email?.split('@')[0]}</div>
              </div>
              <LogoutButton variant="icon" />
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
            <div className="max-w-5xl mx-auto">
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
                    onClick={() => setCurrentView('chat-history')}
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
              <ChatHistoryList />
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
                        <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
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
        )}
      </div>
    </div>
  );
} 