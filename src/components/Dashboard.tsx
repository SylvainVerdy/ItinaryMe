"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, getDoc, doc } from 'firebase/firestore';
import { LogoutButton } from './LogoutButton';
import { Logo } from './Logo';
import Link from 'next/link';
import {
  PlusCircle,
  MessageSquare,
  FolderOpen,
  Calendar,
  MapPin,
  Send,
  Loader,
  X,
  Globe,
  Search,
  Menu,
  Clock,
  Users,
  Sparkles,
  FileText,
  Bookmark,
  ArrowRight,
  Plane,
  RefreshCw,
  CalendarClock,
  Check,
  Ticket,
} from 'lucide-react';
import { TravelDocumentList } from './TravelDocumentList';
import { ChatHistoryList } from './ChatHistoryList';
import FlightResultCard from './chat/FlightResultCard';
import { CartDrawer } from './cart/CartDrawer';
import { ChatCapabilities, ALL_CAPABILITIES, CapabilityId } from './chat/ChatCapabilities';
import HotelResultCard from './chat/HotelResultCard';
import ActivityResultCard from './chat/ActivityResultCard';
import { ChatCard, WebSource } from '@/types/chat-message';
import { cn } from '@/lib/utils';

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
  /** Résultats structurés renvoyés par l'agent (vols, hôtels). */
  cards?: ChatCard[];
  /** Étapes d'outillage parcourues par l'agent. */
  steps?: string[];
  /** Liens sources / réservation. */
  sources?: WebSource[];
}

interface FirestoreImageData {
  base64Data: string;
  travelId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: any;
}

type View = 'dashboard' | 'travel' | 'chat' | 'documents' | 'chat-history';

/** Dégradés de vignette, choisis de façon stable à partir de l'id du voyage. */
const CARD_GRADIENTS = [
  'from-teal-500 to-cyan-500',
  'from-orange-500 to-amber-500',
  'from-cyan-500 to-blue-500',
  'from-rose-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-violet-500 to-fuchsia-500',
];

function gradientFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i)) % CARD_GRADIENTS.length;
  return CARD_GRADIENTS[hash];
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [travelPlans, setTravelPlans] = useState<TravelPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebar, setSidebar] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<View>('dashboard');
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
  const [capabilities, setCapabilities] = useState<CapabilityId[]>(ALL_CAPABILITIES);
  const [inputValue, setInputValue] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Ouvrir directement la bonne vue quand on arrive avec ?view=… (retour
  // depuis l'éditeur de document, par exemple).
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('view');
    const allowed: View[] = ['dashboard', 'travel', 'chat', 'documents', 'chat-history'];
    if (requested && (allowed as string[]).includes(requested)) {
      setCurrentView(requested as View);
    }
  }, []);

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

        // Créer un tableau pour stocker les promesses de récupération d'images
        const imagePromises: Promise<void>[] = [];

        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          const travel = {
            id: docSnapshot.id,
            destination: data.destination,
            dateDepart: data.dateDepart,
            dateRetour: data.dateRetour,
            nombreVoyageurs: data.nombreVoyageurs,
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

        // Attendre que toutes les images soient récupérées
        await Promise.all(imagePromises);

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

  // Envoi d'un message a l'agent outille (/api/chat)
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
      // On passe par /api/chat plutôt que d'appeler Ollama en direct : cette
      // route expose à l'agent les outils search_flights / search_hotels /
      // search_restaurants / web_search / find_booking_url. Sans elle, le
      // modèle répondait de mémoire et ne pouvait rien chercher.
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: inputValue,
          // Pas de voyage sélectionné ici : la route gère ce cas (hasTrip).
          tripContext: nextTrip
            ? {
                tripId: nextTrip.id,
                destination: nextTrip.destination,
                startDate: nextTrip.dateDepart,
                endDate: nextTrip.dateRetour,
                travelers: nextTrip.nombreVoyageurs,
              }
            : undefined,
          history: chatMessages
            .filter(msg => msg.role !== 'system')
            .map(msg => ({ role: msg.role, text: msg.content })),
          capabilities,
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent indisponible (HTTP ${response.status})`);
      }

      const data = await response.json();

      // Ajouter la réponse de l'assistant au chat
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.text || 'Voici les résultats.',
        cards: data.cards?.length ? data.cards : undefined,
        steps: data.steps?.length ? data.steps : undefined,
        sources: data.sources?.length ? data.sources : undefined,
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
                model: 'qwen3.5:9b',
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

  // Voyage à venir le plus proche + compte à rebours.
  const nextTrip = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...travelPlans]
      .filter((trip) => {
        const start = new Date(trip.dateDepart);
        return !Number.isNaN(start.getTime()) && start >= today;
      })
      .sort((a, b) => new Date(a.dateDepart).getTime() - new Date(b.dateDepart).getTime())[0];
  }, [travelPlans]);

  const daysUntilNextTrip = useMemo(() => {
    if (!nextTrip) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(nextTrip.dateDepart);
    return Math.max(0, Math.round((start.getTime() - today.getTime()) / 86_400_000));
  }, [nextTrip]);

  const filteredTrips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return travelPlans;
    return travelPlans.filter((trip) => trip.destination?.toLowerCase().includes(q));
  }, [travelPlans, searchQuery]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center text-slate-500">
        Veuillez vous connecter pour accéder à votre tableau de bord.
      </div>
    );
  }

  const displayName = user.email?.split('@')[0] ?? 'voyageur';
  const initial = user.email?.charAt(0).toUpperCase() || 'U';

  const navItems: { view: View; label: string; icon: React.ElementType }[] = [
    // Le reste de ce composant est en français en dur : on reste cohérent
    // plutôt que de mélanger une seule étiquette traduite.
    { view: 'dashboard', label: 'Tableau de bord', icon: FolderOpen },
    { view: 'chat', label: 'Assistant IA', icon: Sparkles },
    { view: 'documents', label: 'Documents', icon: FileText },
    { view: 'chat-history', label: 'Conversations', icon: MessageSquare },
  ];

  const shortcuts = [
    { href: '/calendar', label: 'Calendrier', icon: Calendar },
    { href: '/destinations', label: 'Destinations', icon: Globe },
    { href: '/favorites', label: 'Favoris', icon: Bookmark },
  ];

  const viewTitle =
    currentView === 'dashboard'
      ? 'Tableau de bord'
      : currentView === 'chat'
        ? 'Assistant IA Voyageur'
        : currentView === 'documents'
          ? 'Mes documents de voyage'
          : currentView === 'chat-history'
            ? 'Historique des conversations'
            : 'Voyages';

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-5 py-5">
        <Link href="/" aria-label="ItinaryMe">
          <Logo onDark />
        </Link>
        <button
          onClick={() => {
            setSidebar(false);
            setMobileNavOpen(false);
          }}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Fermer le menu"
        >
          <X size={18} />
        </button>
      </div>

      <div className="px-3">
        <Link
          href="/travel/new"
          className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-coral to-brand-sun px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          <PlusCircle size={16} />
          Nouveau voyage
        </Link>

        <div className="relative mb-5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Rechercher un voyage…"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-brand-lagoon/60 focus:bg-white/10"
          />
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => {
                setCurrentView(item.view);
                setMobileNavOpen(false);
                if (item.view === 'chat-history') {
                  window.dispatchEvent(new Event('chatHistoryRefresh'));
                }
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors',
                currentView === item.view
                  ? 'bg-white/10 font-medium text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-7 min-h-0 flex-1 overflow-y-auto px-3">
        <div className="flex items-center justify-between px-3 py-1.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Mes voyages
          </h3>
          <Link
            href="/travel/new"
            className="text-slate-500 transition-colors hover:text-white"
            aria-label="Ajouter un voyage"
          >
            <PlusCircle size={14} />
          </Link>
        </div>

        <div className="mt-1 space-y-0.5">
          {filteredTrips.length > 0 ? (
            filteredTrips.map((travel) => (
              <Link
                key={travel.id}
                href={`/travel/${travel.id}`}
                className="group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <span
                  className={cn(
                    'h-2 w-2 flex-shrink-0 rounded-full bg-gradient-to-br',
                    gradientFor(travel.id),
                  )}
                />
                <span className="truncate">{travel.destination}</span>
              </Link>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-slate-600">
              {searchQuery ? 'Aucun résultat' : 'Aucun voyage planifié'}
            </p>
          )}
        </div>

        <h3 className="mt-6 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Raccourcis
        </h3>
        <div className="space-y-0.5">
          {shortcuts.map((shortcut) => (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <shortcut.icon size={14} />
              {shortcut.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-teal to-brand-lagoon text-sm font-semibold text-white">
              {initial}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-white">{displayName}</span>
              <span className="block truncate text-xs text-slate-500">{user.email}</span>
            </span>
          </div>
          <LogoutButton
            variant="icon"
            className="flex-shrink-0 text-slate-400 hover:bg-white/10 hover:text-white"
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
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar desktop */}
      {sidebar && (
        <aside className="hidden w-72 flex-shrink-0 flex-col bg-brand-ink lg:flex">
          {sidebarContent}
        </aside>
      )}

      {/* Sidebar mobile (overlay) */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Fermer le menu"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-brand-ink shadow-float">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Contenu principal */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu size={18} />
            </button>
            {!sidebar && (
              <button
                onClick={() => setSidebar(true)}
                className="hidden rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:block"
                aria-label="Afficher la barre latérale"
              >
                <Menu size={18} />
              </button>
            )}
            <h2 className="truncate font-display text-lg font-bold text-slate-900">{viewTitle}</h2>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              title="Actualiser"
              aria-label="Actualiser"
            >
              <RefreshCw size={17} />
            </button>
            <Link
              href="/destinations"
              className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white sm:block"
            >
              Explorer
            </Link>

            {/* Panier accessible depuis toutes les vues, avec son paiement */}
            <div className="ml-1 text-slate-600">
              <CartDrawer />
            </div>
          </div>
        </header>

        {/* Vue tableau de bord */}
        {currentView === 'dashboard' && (
          <div className="flex-1 overflow-auto">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
              {/* Bandeau d'accueil */}
              <section className="relative isolate overflow-hidden rounded-3xl bg-brand-ink p-7 sm:p-9">
                <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                  <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand-teal/40 blur-[90px]" />
                  <div className="absolute -bottom-24 right-1/3 h-64 w-64 rounded-full bg-brand-coral/30 blur-[90px]" />
                </div>
                <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-50" />

                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Bon retour parmi nous</p>
                    <h1 className="mt-1.5 font-display text-3xl font-extrabold capitalize tracking-tight text-white sm:text-4xl">
                      {displayName}
                    </h1>
                    <p className="mt-3 max-w-md text-slate-300">
                      {nextTrip
                        ? `Prochain départ pour ${nextTrip.destination}${
                            daysUntilNextTrip === 0
                              ? " — c'est aujourd'hui !"
                              : ` dans ${daysUntilNextTrip} jour${daysUntilNextTrip! > 1 ? 's' : ''}.`
                          }`
                        : "Aucun départ prévu pour l'instant. Lancez l'assistant, il compose votre prochain voyage en une minute."}
                    </p>
                  </div>

                  <div className="flex flex-shrink-0 flex-col gap-2.5 sm:flex-row">
                    <Link
                      href="/travel/new"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-coral to-brand-sun px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                    >
                      <PlusCircle size={16} />
                      Nouvel itinéraire
                    </Link>
                    <button
                      onClick={() => setCurrentView('chat')}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      <Sparkles size={16} />
                      Assistant IA
                    </button>
                  </div>
                </div>
              </section>

              {/* Statistiques */}
              <section className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  icon={Plane}
                  accent="bg-teal-50 text-teal-700"
                  value={String(travelPlans.length)}
                  label={`voyage${travelPlans.length > 1 ? 's' : ''} planifié${travelPlans.length > 1 ? 's' : ''}`}
                />
                <StatCard
                  icon={CalendarClock}
                  accent="bg-orange-50 text-orange-700"
                  value={daysUntilNextTrip === null ? '—' : `J-${daysUntilNextTrip}`}
                  label="avant le départ"
                />
                <StatCard
                  icon={MapPin}
                  accent="bg-cyan-50 text-cyan-700"
                  value={String(new Set(travelPlans.map((trip) => trip.destination)).size)}
                  label="destinations"
                />
                <StatCard
                  icon={Users}
                  accent="bg-amber-50 text-amber-700"
                  value={String(
                    travelPlans.reduce((sum, trip) => sum + (Number(trip.nombreVoyageurs) || 0), 0),
                  )}
                  label="voyageurs au total"
                />
              </section>

              {/* Accès rapides */}
              <section className="mt-5 grid gap-4 md:grid-cols-3">
                <ActionCard
                  icon={Sparkles}
                  accent="from-teal-500 to-cyan-500"
                  title="Assistant IA"
                  description="Recommandations personnalisées et itinéraires sur mesure, en conversation."
                  actionLabel="Démarrer une conversation"
                  onClick={() => setCurrentView('chat')}
                />
                <ActionCard
                  icon={FileText}
                  accent="from-orange-500 to-amber-500"
                  title="Documents"
                  description="Billets, réservations et notes de voyage réunis dans un espace éditable."
                  actionLabel="Voir mes documents"
                  onClick={() => setCurrentView('documents')}
                />
                <ActionCard
                  icon={MessageSquare}
                  accent="from-cyan-500 to-blue-500"
                  title="Conversations"
                  description="Retrouvez tous les échanges passés avec l'assistant et leurs suggestions."
                  actionLabel="Voir l'historique"
                  onClick={() => {
                    setCurrentView('chat-history');
                    window.dispatchEvent(new Event('chatHistoryRefresh'));
                  }}
                />
              </section>

              {/* Itinéraires */}
              <section className="mt-8">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="font-display text-xl font-bold text-slate-900">Mes itinéraires</h3>
                  <Link
                    href="/travel/new"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                  >
                    <PlusCircle size={14} />
                    Nouveau
                  </Link>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-20">
                    <Loader className="mb-4 h-7 w-7 animate-spin text-brand-teal" />
                    <p className="text-sm text-slate-500">Chargement de vos voyages…</p>
                  </div>
                ) : travelPlans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-20 text-center">
                    <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-teal to-brand-lagoon text-white">
                      <Globe size={28} />
                    </span>
                    <h4 className="font-display text-lg font-bold text-slate-900">
                      Aucun voyage planifié
                    </h4>
                    <p className="mb-6 mt-2 max-w-md text-sm text-slate-500">
                      Créez votre premier itinéraire, ou laissez l'assistant IA le composer à partir
                      d'une simple phrase.
                    </p>
                    <Link
                      href="/travel/new"
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-coral to-brand-sun px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                    >
                      <PlusCircle size={16} />
                      Créer mon premier itinéraire
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {travelPlans.map((travel) => (
                      <Link
                        key={travel.id}
                        href={`/travel/${travel.id}`}
                        className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lift"
                      >
                        <div
                          className={cn(
                            'relative h-24 bg-gradient-to-br',
                            gradientFor(travel.id),
                          )}
                        >
                          {travel.imageUrl && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={travel.imageUrl}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
                          <span className="absolute bottom-3 left-4 flex items-center gap-1.5 font-display text-base font-bold text-white">
                            <MapPin size={14} />
                            <span className="truncate">{travel.destination}</span>
                          </span>
                        </div>

                        <div className="flex flex-1 flex-col p-5">
                          <div className="space-y-2 text-sm text-slate-500">
                            <p className="flex items-center gap-2">
                              <Clock size={14} className="flex-shrink-0 text-slate-400" />
                              <span className="truncate">
                                {new Date(travel.dateDepart).toLocaleDateString()} →{' '}
                                {new Date(travel.dateRetour).toLocaleDateString()}
                              </span>
                            </p>
                            <p className="flex items-center gap-2">
                              <Users size={14} className="flex-shrink-0 text-slate-400" />
                              {travel.nombreVoyageurs} voyageur
                              {travel.nombreVoyageurs > 1 ? 's' : ''}
                            </p>
                          </div>

                          <span className="mt-5 flex items-center gap-1.5 border-t border-slate-100 pt-4 text-sm font-semibold text-brand-teal">
                            Voir l'itinéraire
                            <ArrowRight
                              size={15}
                              className="transition-transform group-hover:translate-x-1"
                            />
                          </span>
                        </div>
                      </Link>
                    ))}

                    <Link
                      href="/travel/new"
                      className="flex min-h-[15rem] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white/60 p-5 text-center transition hover:border-brand-teal hover:bg-white"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-brand-teal">
                        <PlusCircle size={22} />
                      </span>
                      <span>
                        <span className="block font-display font-bold text-slate-900">
                          Nouveau voyage
                        </span>
                        <span className="mt-1 block text-sm text-slate-500">
                          Créer un nouvel itinéraire
                        </span>
                      </span>
                    </Link>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* Vue documents */}
        {currentView === 'documents' && (
          <div className="flex-1 overflow-auto">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
              <TravelDocumentList />
            </div>
          </div>
        )}

        {/* Vue historique des conversations */}
        {currentView === 'chat-history' && (
          <div className="flex-1 overflow-auto">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
              <ChatHistoryList key={`chat-history-${Date.now()}`} />
            </div>
          </div>
        )}

        {/* Vue chat */}
        {currentView === 'chat' && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-auto px-4 py-6 sm:px-6">
              <div className="mx-auto max-w-3xl space-y-6">
                {chatMessages
                  .filter((msg) => msg.role !== 'system')
                  .map((msg, index) => (
                    <div
                      key={index}
                      className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white',
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-brand-coral to-brand-sun'
                            : 'bg-gradient-to-br from-brand-teal to-brand-lagoon',
                        )}
                      >
                        {msg.role === 'user' ? initial : <Sparkles size={16} />}
                      </span>

                      <div
                        className={cn(
                          'flex min-w-0 max-w-[80%] flex-col gap-3',
                          msg.role === 'user' ? 'items-end' : 'items-start',
                        )}
                      >
                        {msg.steps && msg.steps.length > 0 && (
                          <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
                            {msg.steps.map((step, i) => (
                              <span key={i} className="flex items-center gap-2">
                                <Check size={12} className="flex-shrink-0 text-emerald-500" />
                                {step}
                              </span>
                            ))}
                          </div>
                        )}

                        <div
                          className={cn(
                            'rounded-2xl px-4 py-3',
                            msg.role === 'user'
                              ? 'rounded-tr-sm bg-brand-ink text-white'
                              : 'rounded-tl-sm border border-slate-200 bg-white text-slate-800',
                          )}
                        >
                          <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                            {msg.content}
                          </div>
                          <div className="mt-2 text-xs text-slate-400">
                            {msg.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>

                        {/* Résultats structurés de l'agent */}
                        {msg.cards?.map((card, ci) => (
                          <div key={ci} className="w-full">
                            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                              {card.type === 'flights' && (
                                <>
                                  <Plane size={13} /> {card.results.length} vol
                                  {card.results.length > 1 ? 's' : ''}
                                </>
                              )}
                              {card.type === 'hotels' && (
                                <>
                                  <MapPin size={13} /> {card.results.length} hôtel
                                  {card.results.length > 1 ? 's' : ''}
                                </>
                              )}
                              {card.type === 'activities' && (
                                <>
                                  <Ticket size={13} /> {card.results.length} activité
                                  {card.results.length > 1 ? 's' : ''}
                                </>
                              )}
                            </p>
                            {card.type === 'flights' && (
                              <div className="flex flex-col gap-3">
                                {card.results.map((o) => (
                                  <FlightResultCard key={o.offerId} offer={o} tripId={nextTrip?.id ?? ''} />
                                ))}
                              </div>
                            )}
                            {card.type === 'hotels' && (
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {card.results.map((o) => (
                                  <HotelResultCard key={o.rateId} offer={o} tripId={nextTrip?.id ?? ''} />
                                ))}
                              </div>
                            )}
                            {card.type === 'activities' && (
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {card.results.map((o) => (
                                  <ActivityResultCard key={o.activityId} offer={o} tripId={nextTrip?.id ?? ''} />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}

                        {msg.sources && msg.sources.length > 0 && (
                          <div className="w-full">
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Sources
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.sources.map((src, i) => {
                                const isBooking = src.title.startsWith('Réserver ·');
                                let label = src.url;
                                try {
                                  label = new URL(src.url).hostname.replace('www.', '');
                                } catch { /* garde l'url brute */ }
                                if (isBooking) label = src.title.replace('Réserver · ', '');
                                return (
                                  <a
                                    key={i}
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={src.title}
                                    className={cn(
                                      'inline-flex max-w-[240px] items-center gap-1 truncate rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                                      isBooking
                                        ? 'border-transparent bg-gradient-to-r from-brand-coral to-brand-sun font-semibold text-white hover:brightness-110'
                                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-brand-teal hover:text-brand-teal',
                                    )}
                                  >
                                    <span className="truncate">{label}</span>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                {isSendingMessage && (
                  <div className="flex gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-teal to-brand-lagoon text-white">
                      <Sparkles size={16} />
                    </span>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-4">
                      {[0, 1, 2].map((dot) => (
                        <span
                          key={dot}
                          className="h-2 w-2 animate-bounce rounded-full bg-slate-300"
                          style={{ animationDelay: `${dot * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div className="mx-auto max-w-3xl">
                <ChatCapabilities
                  active={capabilities}
                  onChange={setCapabilities}
                  className="mb-3"
                />
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-brand-teal/60 focus-within:bg-white">
                  <textarea
                    ref={chatInputRef}
                    className="w-full resize-none bg-transparent py-3.5 pl-4 pr-14 text-[15px] text-slate-800 outline-none placeholder:text-slate-400"
                    rows={2}
                    placeholder="Posez une question sur votre voyage…"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSendingMessage}
                  />
                  <button
                    className={cn(
                      'absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full transition',
                      inputValue.trim() && !isSendingMessage
                        ? 'bg-gradient-to-r from-brand-coral to-brand-sun text-white hover:brightness-110'
                        : 'cursor-not-allowed bg-slate-200 text-slate-400',
                    )}
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isSendingMessage}
                    aria-label="Envoyer"
                  >
                    {isSendingMessage ? (
                      <Loader size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-400">
                    Propulsé par Ollama · les réponses sont générées par IA et peuvent être
                    imprécises.
                  </p>
                  <button
                    className="text-xs font-medium text-brand-teal transition-colors hover:text-brand-lagoon"
                    onClick={() => setCurrentView('chat-history')}
                  >
                    Voir l'historique
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

function StatCard({
  icon: Icon,
  accent,
  value,
  label,
}: {
  icon: React.ElementType;
  accent: string;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl', accent)}>
        <Icon size={19} />
      </span>
      <p className="mt-4 font-display text-2xl font-extrabold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-0.5 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  accent,
  title,
  description,
  actionLabel,
  onClick,
}: {
  icon: React.ElementType;
  accent: string;
  title: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex h-full flex-col items-start rounded-3xl border border-slate-200 bg-white p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lift"
    >
      <span
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white',
          accent,
        )}
      >
        <Icon size={20} />
      </span>
      <h3 className="mt-5 font-display text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{description}</p>
      <span className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-teal">
        {actionLabel}
        <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
      </span>
    </button>
  );
}
