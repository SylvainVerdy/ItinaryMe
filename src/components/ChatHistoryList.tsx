import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc, limit, startAfter, getDoc } from 'firebase/firestore';
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
  Tag,
  ChevronLeft,
  ChevronRight
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
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // Augmenté à 5 par page pour une meilleure expérience
  const [hasMore, setHasMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  // Garder trace des IDs pour éviter les doublons
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  
  // Fonction pour rafraîchir les données
  const refreshChatHistories = async (reset = true) => {
    if (!user) {
      console.log("Aucun utilisateur connecté, impossible de charger les conversations");
      return;
    }
    
    if (reset) {
      setCurrentPage(1);
      setLastVisible(null);
      setChatHistories([]);
      setLoadedIds(new Set()); // Réinitialiser les IDs chargés
    }
    
    setLoading(true);
    setError(null);
    console.log("Chargement des conversations pour l'utilisateur:", user.uid, "page:", currentPage, "pageSize:", itemsPerPage);
    
    try {
      // Compter le nombre total de conversations pour la pagination
      let countQuery = query(
        collection(db, 'conversations'),
        where('userId', '==', user.uid)
      );
      if (tripId) {
        countQuery = query(
          collection(db, 'conversations'),
          where('userId', '==', user.uid),
          where('tripId', '==', tripId)
        );
      }
      const countSnapshot = await getDocs(countQuery);
      setTotalItems(countSnapshot.size);
      
      // Si nous avons déjà tout chargé, ne pas continuer
      if (!reset && loadedIds.size >= countSnapshot.size) {
        console.log("Toutes les conversations sont déjà chargées");
        setLoading(false);
        setHasMore(false);
        return;
      }
      
      // Créer la requête pour la page actuelle
      let historiesQuery;
      try {
        if (lastVisible && !reset) {
          // Requête pour la pagination avec cursor
          console.log("Utilisation du curseur pour charger plus de conversations");
          historiesQuery = query(
            collection(db, 'conversations'),
            where('userId', '==', user.uid),
            orderBy('updatedAt', 'desc'),
            startAfter(lastVisible),
            limit(itemsPerPage)
          );
          
          if (tripId) {
            historiesQuery = query(
              collection(db, 'conversations'),
              where('userId', '==', user.uid),
              where('tripId', '==', tripId),
              orderBy('updatedAt', 'desc'), 
              startAfter(lastVisible),
              limit(itemsPerPage)
            );
          }
        } else {
          // Première requête
          console.log("Première requête sans curseur");
          historiesQuery = query(
            collection(db, 'conversations'),
            where('userId', '==', user.uid),
            orderBy('updatedAt', 'desc'),
            limit(itemsPerPage)
          );
          
          if (tripId) {
            historiesQuery = query(
              collection(db, 'conversations'),
              where('userId', '==', user.uid),
              where('tripId', '==', tripId),
              orderBy('updatedAt', 'desc'),
              limit(itemsPerPage)
            );
          }
        }
        
        console.log("Exécution de la requête Firestore sur la collection 'conversations'...");
        const querySnapshot = await getDocs(historiesQuery);
        console.log("Nombre de documents retournés:", querySnapshot.size);
        
        if (querySnapshot.empty) {
          console.log("Aucun document retourné dans cette requête");
          setHasMore(false);
          setLoading(false);
          return;
        }
        
        const histories: ChatHistory[] = [];
        const currentIds = new Set<string>();
        
        // Sauvegarder le dernier document visible pour la pagination
        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        if (lastDoc) {
          console.log("Dernier document défini:", lastDoc.id);
          setLastVisible(lastDoc);
        } else {
          console.log("Aucun dernier document trouvé");
          setLastVisible(null);
        }
        
        // Traitement des documents
        for (const docSnapshot of querySnapshot.docs) {
          try {
            const docId = docSnapshot.id;
            
            // Vérifier si ce document est déjà chargé
            if (loadedIds.has(docId)) {
              console.log("Document déjà chargé, ignoré:", docId);
              continue;
            }
            
            const data = docSnapshot.data() as ChatHistory;
            console.log("Document trouvé:", docId, "titre:", data.title);
            
            // Vérifier que les données sont valides
            if (!data) {
              console.warn("Document sans données:", docId);
              continue;
            }
            
            // S'assurer que le tableau de messages existe
            if (!data.messages) {
              console.warn("Document sans messages:", docId);
              data.messages = [];
            }
            
            // S'assurer que le titre existe
            if (!data.title) {
              console.warn("Document sans titre:", docId);
              data.title = "Conversation sans titre";
            }
            
            histories.push({
              ...data,
              id: docId
            });
            
            // Ajouter l'ID à la liste des IDs chargés
            currentIds.add(docId);
          } catch (e) {
            console.error("Erreur lors du traitement du document:", docSnapshot.id, e);
          }
        }
        
        console.log(`Historique des conversations chargé: ${histories.length} conversations trouvées sur cette page, ${currentIds.size} nouveaux IDs`);
        
        // Mettre à jour la liste des IDs chargés
        const newLoadedIds = new Set([...loadedIds, ...currentIds]);
        setLoadedIds(newLoadedIds);
        
        // Si reset est true, remplacer les conversations, sinon les ajouter
        if (reset) {
          console.log(`Initialisation avec ${histories.length} conversations`);
          setChatHistories(histories);
        } else {
          console.log(`Ajout de ${histories.length} nouvelles conversations aux ${chatHistories.length} existantes.`);
          setChatHistories(prev => [...prev, ...histories]);
        }
        
        // Mettre à jour hasMore APRÈS avoir mis à jour les conversations
        const moreAvailable = (newLoadedIds.size < totalItems) && histories.length > 0;
        console.log(`Plus de conversations disponibles: ${moreAvailable ? 'Oui' : 'Non'} (${newLoadedIds.size}/${totalItems})`);
        setHasMore(moreAvailable);
        
      } catch (err: any) {
        // Vérifier si l'erreur est due à un index manquant
        if (err.message && err.message.includes('index')) {
          console.error("Erreur d'index Firebase:", err);
          setError(`Impossible de charger l'historique des conversations. Veuillez créer l'index dans Firebase: ${err}`);
          
          // Tentative de récupération sans tri
          try {
            console.log("Tentative de récupération sans tri...");
            const fallbackQuery = query(
              collection(db, 'conversations'),
              where('userId', '==', user.uid)
            );
            
            const fallbackSnapshot = await getDocs(fallbackQuery);
            const fallbackHistories: ChatHistory[] = [];
            
            fallbackSnapshot.forEach((doc) => {
              const data = doc.data() as ChatHistory;
              fallbackHistories.push({
                ...data,
                id: doc.id
              });
            });
            
            // Trier manuellement
            fallbackHistories.sort((a, b) => {
              const dateA = new Date(a.updatedAt).getTime();
              const dateB = new Date(b.updatedAt).getTime();
              return dateB - dateA;
            });
            
            console.log("Récupération de secours réussie:", fallbackHistories.length, "conversations");
            setChatHistories(fallbackHistories);
          } catch (fallbackErr) {
            console.error("Échec de la tentative de récupération sans tri:", fallbackErr);
          }
        } else {
          console.error("Erreur lors de la récupération de l'historique des conversations:", err);
          setError(`Impossible de charger l'historique des conversations: ${err.message}`);
        }
      }
    } catch (mainErr: any) {
      console.error("Erreur principale:", mainErr);
      setError(`Erreur inattendue lors du chargement: ${mainErr.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Chargement de la page suivante
  const loadMoreConversations = () => {
    console.log(`Chargement de la page ${currentPage + 1}, déjà chargées: ${chatHistories.length} sur un total de ${totalItems}, IDs uniques: ${loadedIds.size}`);
    
    if (!lastVisible) {
      console.error("Impossible de charger plus de conversations: lastVisible est null");
      return;
    }
    
    // Si nous avons déjà tout chargé, ne pas continuer
    if (loadedIds.size >= totalItems) {
      console.log("Toutes les conversations sont déjà chargées");
      setHasMore(false);
      return;
    }
    
    setCurrentPage(prev => prev + 1);
    refreshChatHistories(false);
  };
  
  // Récupérer l'historique des conversations au chargement
  useEffect(() => {
    console.log("ChatHistoryList monté - lancement du chargement initial");
    refreshChatHistories(true);
    
    // Écouter l'événement de rafraîchissement
    const handleRefresh = () => {
      console.log("Événement de rafraîchissement détecté");
      refreshChatHistories(true);
    };
    
    window.addEventListener('chatHistoryRefresh', handleRefresh);
    
    // Nettoyer l'écouteur d'événement lors du démontage
    return () => {
      console.log("ChatHistoryList démonté - nettoyage des écouteurs");
      window.removeEventListener('chatHistoryRefresh', handleRefresh);
    };
  }, [user, tripId]);
  
  // Vérification de santé individuelle pour chaque conversation
  const verifyConversation = async (id: string) => {
    if (!user || !id) return;
    
    try {
      const convRef = doc(db, 'conversations', id);
      const convSnapshot = await getDoc(convRef);
      
      if (!convSnapshot.exists()) {
        console.log("La conversation n'existe pas dans Firestore:", id);
        setChatHistories(prev => prev.filter(history => history.id !== id));
      } else {
        console.log("La conversation existe dans Firestore:", id);
      }
    } catch (err) {
      console.error("Erreur lors de la vérification de la conversation:", id, err);
    }
  };
  
  // Fonction pour vérifier toutes les conversations visibles
  const verifyAllConversations = () => {
    setLoading(true);
    
    // Vérifier chaque conversation individuellement
    const promises = chatHistories.map(history => history.id && verifyConversation(history.id));
    
    Promise.all(promises)
      .then(() => {
        console.log("Vérification de toutes les conversations terminée");
        refreshChatHistories(true);
      })
      .catch(err => {
        console.error("Erreur lors de la vérification des conversations:", err);
        setError("Impossible de vérifier les conversations");
      })
      .finally(() => {
        setLoading(false);
      });
  };
  
  // Filtrer les conversations par terme de recherche et s'assurer qu'elles sont uniques
  const filteredHistories = chatHistories.filter((history, index, self) => {
    // Vérifier que history.title existe avant de l'utiliser
    if (!history || !history.title) {
      console.log("Conversation sans titre détectée:", history);
      return false;
    }
    
    // S'assurer que l'élément est unique (pas de doublons) en vérifiant l'ID
    const isUnique = index === self.findIndex(h => h.id === history.id);
    
    return isUnique && history.title.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Supprimer une conversation
  const deleteConversation = async (id: string) => {
    if (!user || !id) return;
    
    try {
      await deleteDoc(doc(db, 'conversations', id));
      setChatHistories(prev => prev.filter(history => history.id !== id));
      setTotalItems(prev => prev - 1);
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
  
  // Fonction de débogage pour vérifier l'unicité des conversations
  const checkDuplicates = () => {
    const ids = chatHistories.map(h => h.id || ''); // Conversion en chaîne vide si undefined
    const uniqueIds = new Set(ids);
    const hasDuplicates = ids.length !== uniqueIds.size;
    
    if (hasDuplicates) {
      console.error("Doublons détectés dans les conversations!");
      // Trouver les doublons
      const counts: Record<string, number> = {};
      ids.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
      });
      
      const duplicates = Object.entries(counts)
        .filter(([_, count]) => count > 1)
        .map(([id, count]) => ({ id, count }));
      
      console.error("IDs dupliqués:", duplicates);
      
      // Corriger automatiquement
      const uniqueHistories = chatHistories.filter(
        (history, index) => {
          if (!history.id) return true; // Garder les éléments sans ID
          return ids.indexOf(history.id) === index;
        }
      );
      
      console.log(`Correction automatique: ${chatHistories.length} -> ${uniqueHistories.length} conversations`);
      setChatHistories(uniqueHistories);
    } else {
      console.log("Aucun doublon détecté. Toutes les conversations sont uniques.");
    }
    
    return !hasDuplicates;
  };
  
  if (loading && chatHistories.length === 0) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }
  
  if (error && chatHistories.length === 0) {
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
              onClick={() => refreshChatHistories(true)}
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
          {totalItems > 0 && <span className="text-sm text-gray-500 ml-2">({totalItems})</span>}
        </h2>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="p-1.5 rounded-lg hover:bg-[#f8f5ec] transition-colors"
            title={showDebug ? "Masquer le mode debug" : "Afficher le mode debug"}
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
              className="text-gray-600"
            >
              <path d="M12 3v4"></path>
              <path d="M8 7l2 2"></path>
              <path d="M14 7l-2 2"></path>
              <path d="M20 12h-4"></path>
              <path d="M4 12h4"></path>
              <circle cx="12" cy="12" r="9"></circle>
              <rect width="10" height="6" x="7" y="14" rx="2"></rect>
            </svg>
          </button>
        
          <button 
            onClick={verifyAllConversations}
            className="p-1.5 rounded-lg hover:bg-[#f8f5ec] transition-colors"
            title="Vérifier toutes les conversations"
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
              className="text-gray-600"
            >
              <path d="M9 12l2 2 4-4"></path>
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
          </button>
        
          <button 
            onClick={() => refreshChatHistories(true)}
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
      
      {/* Mode débogage - informations de pagination */}
      {showDebug && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg text-xs text-gray-600 font-mono">
          <div>État: {loading ? 'Chargement...' : 'Prêt'}</div>
          <div>Page actuelle: {currentPage}</div>
          <div>Éléments par page: {itemsPerPage}</div>
          <div>Conversations chargées: {chatHistories.length}</div>
          <div>Total conversations: {totalItems}</div>
          <div>IDs uniques chargés: {loadedIds.size}</div>
          <div>Plus à charger: {hasMore ? 'Oui' : 'Non'}</div>
          <div>Dernier visible: {lastVisible ? 'Défini' : 'Non défini'}</div>
          <div>Conversations uniques: {new Set(chatHistories.map(h => h.id)).size}/{chatHistories.length}</div>
          
          <button 
            onClick={checkDuplicates}
            className="mt-2 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
          >
            Vérifier doublons
          </button>
        </div>
      )}
      
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
      
      {error && (
        <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg mb-4">
          <p className="font-medium mb-1">Problème de chargement</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => refreshChatHistories(true)}
            className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors text-xs"
          >
            <span>Réessayer</span>
          </button>
        </div>
      )}
      
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
        <>
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
          
          {/* Pagination */}
          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Affichage de {filteredHistories.length > 0 ? 1 : 0}-{filteredHistories.length} sur {totalItems} conversations
            </div>
            
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <button
                  onClick={() => {
                    setCurrentPage(1);
                    setLastVisible(null);
                    refreshChatHistories(true);
                  }}
                  className="p-2 rounded-lg border border-[#e6e0d4] hover:bg-[#f8f5ec] transition-colors"
                  disabled={loading}
                >
                  <ChevronLeft size={16} className="text-gray-500" />
                </button>
              )}
              
              {/* État de la pagination */}
              <div className="text-xs text-gray-500 mr-2">
                {`Page ${currentPage} | ${loadedIds.size < totalItems ? `${totalItems - loadedIds.size} restants` : 'Tout affiché'}`}
              </div>
              
              {/* Afficher le bouton de pagination si on a moins d'éléments que le total */}
              {(loadedIds.size < totalItems) && (
                <button
                  onClick={loadMoreConversations}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors text-sm font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="animate-spin h-4 w-4 border-t-2 border-purple-500 rounded-full mr-1"></div>
                  ) : (
                    <ChevronRight size={16} />
                  )}
                  <span>Charger plus</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Afficher un indicateur de chargement pendant la pagination */}
      {loading && chatHistories.length > 0 && (
        <div className="my-4 flex justify-center items-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500 mr-2"></div>
          <span className="text-sm text-gray-500">Chargement de plus de conversations...</span>
        </div>
      )}
    </div>
  );
}; 