import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ChatHistory } from '@/lib/types';
import Link from 'next/link';
import { 
  MessageSquare, 
  PlusCircle, 
  Clock, 
  Search, 
  Filter,
  Bookmark,
  BookmarkX,
  Trash2,
  MoreHorizontal,
  Tag
} from 'lucide-react';

interface ChatHistoryListProps {
  tripId?: string; // Optionnel, pour filtrer par voyage
}

export const ChatHistoryList: React.FC<ChatHistoryListProps> = ({ tripId }) => {
  const { user } = useAuth();
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Fonction pour rafraîchir les données
  const refreshChatHistories = async () => {
    if (!user) {
      console.log("Aucun utilisateur connecté, impossible de charger les conversations");
      return;
    }
    
    setLoading(true);
    setError(null);
    console.log("Chargement des conversations pour l'utilisateur:", user.uid);
    
    try {
      // Essayons d'abord sans le tri par updatedAt pour éviter l'erreur d'index
      try {
        let historiesQuery = query(
          collection(db, 'conversations'),
          where('userId', '==', user.uid)
          // Trier côté client en attendant que l'index soit créé
        );
        
        // Si un tripId est fourni, filtrer par voyage
        if (tripId) {
          historiesQuery = query(
            collection(db, 'conversations'),
            where('userId', '==', user.uid),
            where('tripId', '==', tripId)
            // Trier côté client en attendant que l'index soit créé
          );
        }
        
        console.log("Exécution de la requête Firestore sur la collection 'conversations'...");
        const querySnapshot = await getDocs(historiesQuery);
        console.log("Nombre de documents retournés:", querySnapshot.size);
        
        const histories: ChatHistory[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data() as ChatHistory;
          console.log("Document trouvé:", doc.id, "titre:", data.title, "messages:", data.messages?.length || 0);
          histories.push({
            ...data,
            id: doc.id
          });
        });
        
        // Trier les histoires côté client par la date de mise à jour (décroissant)
        histories.sort((a, b) => {
          const dateA = new Date(a.updatedAt).getTime();
          const dateB = new Date(b.updatedAt).getTime();
          return dateB - dateA;
        });
        
        console.log("Historique des conversations chargé:", histories.length, "conversations trouvées");
        // Vérification de structure des données
        if (histories.length > 0) {
          const firstHistory = histories[0];
          console.log("Structure de la première conversation:", {
            id: firstHistory.id,
            title: firstHistory.title,
            messagesCount: firstHistory.messages?.length || 0,
            hasMessages: Array.isArray(firstHistory.messages),
            createdAt: firstHistory.createdAt,
            updatedAt: firstHistory.updatedAt
          });
        }
        
        setChatHistories(histories);
      } catch (err) {
        console.error("Erreur lors de la récupération de l'historique des conversations:", err);
        setError(`Impossible de charger l'historique des conversations. Veuillez créer l'index dans Firebase: ${err}`);
        setChatHistories([]);
      }
    } catch (mainErr) {
      console.error("Erreur principale:", mainErr);
      setError("Erreur inattendue lors du chargement");
      setChatHistories([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Récupérer l'historique des conversations au chargement
  useEffect(() => {
    console.log("ChatHistoryList monté - lancement du chargement initial");
    refreshChatHistories();
    
    // Écouter l'événement de rafraîchissement
    const handleRefresh = () => {
      console.log("Événement de rafraîchissement détecté");
      refreshChatHistories();
    };
    
    window.addEventListener('chatHistoryRefresh', handleRefresh);
    
    // Nettoyer l'écouteur d'événement lors du démontage
    return () => {
      console.log("ChatHistoryList démonté - nettoyage des écouteurs");
      window.removeEventListener('chatHistoryRefresh', handleRefresh);
    };
  }, [user, tripId]);
  
  // Filtrer les conversations par terme de recherche
  const filteredHistories = chatHistories.filter(history => {
    // Vérifier que history.title existe avant de l'utiliser
    if (!history || !history.title) {
      console.log("Conversation sans titre détectée:", history);
      return false;
    }
    return history.title.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Supprimer une conversation
  const deleteConversation = async (id: string) => {
    if (!user || !id) return;
    
    try {
      await deleteDoc(doc(db, 'conversations', id));
      setChatHistories(prev => prev.filter(history => history.id !== id));
    } catch (err) {
      console.error("Erreur lors de la suppression de la conversation:", err);
      setError("Impossible de supprimer la conversation");
    }
  };
  
  // Marquer une conversation comme favorite ou non
  const toggleFavorite = async (id: string, isFavorite: boolean) => {
    if (!user || !id) return;
    
    try {
      await updateDoc(doc(db, 'conversations', id), {
        isFavorite: !isFavorite
      });
      
      setChatHistories(prev => 
        prev.map(history => 
          history.id === id 
            ? { ...history, isFavorite: !isFavorite } 
            : history
        )
      );
    } catch (err) {
      console.error("Erreur lors de la mise à jour du statut favori:", err);
      setError("Impossible de mettre à jour la conversation");
    }
  };
  
  // Formater la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Extraire un résumé de la conversation
  const getConversationSummary = (history: ChatHistory) => {
    if (!history.messages || !Array.isArray(history.messages) || history.messages.length === 0) {
      return "Pas de message";
    }
    
    const lastMessage = history.messages
      .filter(msg => msg.role !== 'system')
      .slice(-1)[0];
      
    if (!lastMessage) return "Pas de message";
    
    let content = lastMessage.content;
    if (content.length > 70) {
      content = content.substring(0, 70) + '...';
    }
    
    return `${lastMessage.role === 'user' ? 'Vous' : 'IA'}: ${content}`;
  };
  
  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6 mb-6">
        <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-4">
          <p className="font-medium mb-2">Erreur lors du chargement des conversations</p>
          <p className="text-sm">{error}</p>
        </div>
        
        {error.includes('index') && (
          <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg mb-4">
            <p className="font-medium mb-2">Action requise : Création d'index Firebase</p>
            <p className="text-sm mb-3">
              Pour résoudre ce problème, vous devez créer un index dans Firebase. Suivez ces étapes:
            </p>
            <ol className="list-decimal pl-5 text-sm space-y-1 mb-3">
              <li>Cliquez sur le lien dans le message d'erreur ci-dessus</li>
              <li>Connectez-vous à votre compte Firebase si nécessaire</li>
              <li>Cliquez sur "Créer l'index" pour confirmer</li>
              <li>Attendez quelques minutes que l'index soit créé</li>
              <li>Revenez à cette page et actualisez</li>
            </ol>
            <button 
              onClick={refreshChatHistories}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors text-sm"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                <path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
              </svg>
              <span>Réessayer</span>
            </button>
          </div>
        )}
        
        <div className="flex justify-center">
          <Link 
            href="/dashboard/chat/new" 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition-colors text-sm font-medium"
          >
            <PlusCircle size={16} />
            <span>Démarrer une nouvelle conversation</span>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-gray-800">
          {tripId ? 'Conversations du voyage' : 'Historique des conversations'}
        </h2>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={refreshChatHistories}
            className="p-1.5 rounded-lg hover:bg-[#f8f5ec] transition-colors"
            title="Rafraîchir"
            disabled={loading}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className={`text-gray-600 ${loading ? 'animate-spin' : ''}`}
            >
              <path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
              <path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
            </svg>
          </button>
          
          <Link 
            href="/dashboard/chat/new" 
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors text-sm font-medium"
          >
            <PlusCircle size={14} />
            <span>Nouvelle conversation</span>
          </Link>
        </div>
      </div>
      
      {/* Barre de recherche et filtres */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-grow">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une conversation..."
            className="w-full p-2 pl-10 rounded-lg border border-[#e6e0d4] focus:outline-none focus:border-purple-300 transition-colors"
          />
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        </div>
        
        <button className="p-2 rounded-lg border border-[#e6e0d4] hover:bg-[#f8f5ec] transition-colors">
          <Filter size={16} className="text-gray-500" />
        </button>
      </div>
      
      {/* Liste des conversations */}
      {filteredHistories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="h-16 w-16 rounded-full bg-[#f0ece3] flex items-center justify-center mb-4">
            <MessageSquare className="text-gray-500" size={28} />
          </div>
          <h4 className="text-lg font-medium text-gray-800 mb-2">Aucune conversation trouvée</h4>
          <p className="text-gray-500 mb-6 text-center max-w-md">
            {searchTerm 
              ? "Aucune conversation ne correspond à votre recherche." 
              : "Vous n'avez pas encore enregistré de conversation. Commencez dès maintenant !"}
          </p>
          <Link 
            href="/dashboard/chat/new" 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition-colors text-sm font-medium"
          >
            <PlusCircle size={16} />
            <span>Démarrer une nouvelle conversation</span>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-[#e6e0d4]">
          {filteredHistories.map((history) => (
            <div 
              key={history.id} 
              className="py-4 px-3 -mx-3 hover:bg-[#f8f5ec] transition-colors rounded-lg group relative"
            >
              <Link 
                href={`/dashboard/chat/${history.id}`}
                className="block"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-gradient-to-br from-purple-400 to-purple-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                    <MessageSquare size={20} />
                  </div>
                  
                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-800 group-hover:text-purple-600 transition-colors">
                        {history.title || "Sans titre"}
                      </h3>
                      {history.isFavorite && (
                        <Bookmark size={14} className="text-purple-500" />
                      )}
                    </div>
                    
                    <p className="text-gray-500 text-sm mt-1 mb-2">
                      {getConversationSummary(history)}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{formatDate(history.updatedAt)}</span>
                      </div>
                      
                      {history.tags && history.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag size={12} />
                          <span>{history.tags.slice(0, 2).join(', ')}{history.tags.length > 2 ? '...' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
              
              {/* Menu d'actions */}
              <div className="absolute right-3 top-4 flex items-center">
                <button 
                  onClick={() => setActiveMenuId(activeMenuId === history.id ? null : history.id || null)}
                  className="p-1.5 rounded-full hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal size={16} className="text-gray-500" />
                </button>
              </div>
              
              {activeMenuId === history.id && (
                <div className="absolute right-8 top-8 bg-white shadow-md rounded-lg p-2 z-10 border border-[#e6e0d4]">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); 
                      toggleFavorite(history.id!, history.isFavorite || false);
                      setActiveMenuId(null);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[#f8f5ec] transition-colors w-full text-left text-sm"
                  >
                    {history.isFavorite ? (
                      <>
                        <BookmarkX size={14} className="text-gray-500" />
                        <span>Retirer des favoris</span>
                      </>
                    ) : (
                      <>
                        <Bookmark size={14} className="text-gray-500" />
                        <span>Ajouter aux favoris</span>
                      </>
                    )}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Êtes-vous sûr de vouloir supprimer cette conversation ?")) {
                        deleteConversation(history.id!);
                      }
                      setActiveMenuId(null);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[#f8f5ec] transition-colors w-full text-left text-sm text-red-600"
                  >
                    <Trash2 size={14} />
                    <span>Supprimer</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 