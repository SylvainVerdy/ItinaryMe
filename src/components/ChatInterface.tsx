'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { interpretTravelRequest } from '@/ai/flows/interpret-travel-request';
import { analyzeBrowserContent } from '@/ai/flows/analyze-browser-content';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useBrowserAgent } from '@/hooks/useBrowserAgent';
import { Pencil } from 'lucide-react';

export const ChatInterface = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Array<{ text: string; sender: 'user' | 'assistant' }>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [tripData, setTripData] = useState<any>(null);

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
      // Récupérer l'ID du voyage depuis le localStorage
      const tripId = localStorage.getItem('currentTripId');
      
      if (!tripId) {
        // Si aucun ID de voyage n'est trouvé, afficher un message et revenir au tableau de bord
        setMessages([{ 
          text: "Aucune information de voyage trouvée. Veuillez retourner au tableau de bord pour planifier votre voyage.", 
          sender: 'assistant' 
        }]);
        return null;
      }
      
      // Récupérer les données du voyage depuis Firestore
      const tripRef = doc(db, 'trips', tripId);
      const tripSnapshot = await getDoc(tripRef);
      
      if (!tripSnapshot.exists()) {
        setMessages([{ 
          text: "Ce voyage n'existe plus. Veuillez retourner au tableau de bord pour planifier un nouveau voyage.", 
          sender: 'assistant' 
        }]);
        return null;
      }
      
      return { id: tripSnapshot.id, ...tripSnapshot.data() };
    } catch (error) {
      console.error('Erreur lors de la récupération des données du voyage:', error);
      setMessages([{ 
        text: "Une erreur est survenue lors de la récupération des informations de voyage. Veuillez réessayer.", 
        sender: 'assistant' 
      }]);
      return null;
    }
  }, []);

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

  const generateNoteFromMessage = async (message: string) => {
    if (!tripData) return;
    
    try {
      // Extraire le contenu utile du message
      const noteContent = message.replace(/^Traitement de votre demande\.\.\./, '').trim();
      
      if (!noteContent) return;
      
      // Créer une nouvelle note dans Firestore
      const newNote = {
        userId: user?.uid as string,
        tripId: tripData.id,
        title: `Note du ${new Date().toLocaleDateString('fr-FR')}`,
        content: noteContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        isImportant: false
      };
      
      // Ajouter la note à Firestore via le service
      const { addNote } = await import('@/services/noteService');
      await addNote(newNote);
      
      // Notification à l'utilisateur
      setMessages(prev => [...prev, { 
        text: "J'ai créé une note avec ces informations pour vous. Vous pouvez la retrouver dans la section notes.", 
        sender: 'assistant' 
      }]);
    } catch (error) {
      console.error('Erreur lors de la création de la note:', error);
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
            tripId: tripData.id,
            title: `Note du ${new Date().toLocaleDateString('fr-FR')}`,
            content: noteContent,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [],
            isImportant: false
          };
          
          // Ajouter la note à Firestore
          const { addNote } = await import('@/services/noteService');
          await addNote(newNote);
          
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
      console.error('Erreur lors du traitement de la demande:', error);
      
      // Remplacer l'indicateur de chargement par un message d'erreur
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); // Supprimer le message "Traitement de votre demande..."
        return [...newMessages, { 
          text: "Désolé, je n'ai pas pu comprendre votre demande. Pourriez-vous préciser vos attentes pour ce voyage ?", 
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
              {loading || isSearching 
                ? "Chargement en cours..." 
                : "Aucun message. Commencez à discuter avec l'assistant de voyage."}
            </p>
          </div>
        )}
        
        {isSearching && (
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
          disabled={isSearching}
        />
        <Button
          onClick={handleSendMessage}
          className="bg-gradient-to-r from-teal-400 to-green-500 text-white font-semibold rounded-md shadow-md hover:from-teal-500 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1"
          disabled={isSearching || inputValue.trim() === ''}
        >
          Envoyer
        </Button>
      </div>
    </div>
  );
};

