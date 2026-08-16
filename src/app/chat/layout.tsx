'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Pencil, MessageSquare, ChevronLeft, ChevronRight, PanelRight } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { generateNoteContent } from '@/services/noteService';

export default function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tripId, setTripId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('chat');

  useEffect(() => {
    // Récupérer l'ID du voyage depuis le localStorage
    if (typeof window !== 'undefined') {
      const storedTripId = localStorage.getItem('currentTripId');
      setTripId(storedTripId);
    }
  }, []);

  useEffect(() => {
    // Rediriger vers la page d'authentification si l'utilisateur n'est pas connecté
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  // Génération de note via l'agent conversationnel
  const handleGenerateNote = async (prompt: string): Promise<string> => {
    if (!tripId) return 'Aucun voyage sélectionné. Veuillez retourner au tableau de bord.';
    
    try {
      return await generateNoteContent(prompt, tripId);
    } catch (error) {
      console.error('Erreur lors de la génération de la note:', error);
      return 'Une erreur est survenue lors de la génération de la note. Veuillez réessayer.';
    }
  };

  // Si chargement ou utilisateur non connecté, ne rien afficher (sera redirigé)
  if (loading || !user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Barre d'en-tête */}
        <header className="z-10 w-full flex-shrink-0 border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/" className="hidden flex-shrink-0 sm:block" aria-label="ItinaryMe">
                <Logo />
              </Link>
              <span aria-hidden className="hidden h-6 w-px bg-slate-200 sm:block" />
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <ChevronLeft className="h-4 w-4" /> Tableau de bord
              </button>
            </div>
            
            <div className="flex flex-shrink-0 items-center gap-2.5">
              <span className="hidden truncate text-sm text-slate-500 sm:block">{user.email}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-teal to-brand-lagoon text-sm font-semibold text-white">
                {(user.email ?? '?').charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Version mobile : onglets pour basculer entre chat et notes */}
        <div className="md:hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-slate-200 bg-white p-0">
              <TabsTrigger value="chat">
                <MessageSquare className="h-4 w-4 mr-2" /> Chat
              </TabsTrigger>
              <TabsTrigger value="notes">
                <Pencil className="h-4 w-4 mr-2" /> Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="m-0 p-0 h-[calc(100vh-120px)]">
              {children}
            </TabsContent>

            <TabsContent value="notes" className="m-0 p-4 h-[calc(100vh-120px)] overflow-auto">
              {tripId ? (
                <div className="h-full">
                  {/* Importer dynamiquement le composant TravelNotes pour éviter les problèmes de rendu côté serveur */}
                  {(() => {
                    const TravelNotes = require('@/components/TravelNotes').default;
                    return (
                      <TravelNotes 
                        tripId={tripId} 
                        onGenerateNote={handleGenerateNote}
                      />
                    );
                  })()}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-slate-400">Aucun voyage sélectionné</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Version desktop : affichage côte à côte */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto p-5">
            {children}
          </div>
          
          {sidebarOpen && (
            <div className="w-96 flex-shrink-0 overflow-auto border-l border-slate-200 bg-white p-5">
              {tripId ? (
                <div className="h-full">
                  {/* Importer dynamiquement le composant TravelNotes pour éviter les problèmes de rendu côté serveur */}
                  {(() => {
                    const TravelNotes = require('@/components/TravelNotes').default;
                    return (
                      <TravelNotes 
                        tripId={tripId} 
                        onGenerateNote={handleGenerateNote}
                      />
                    );
                  })()}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-slate-400">Aucun voyage sélectionné</p>
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Masquer les notes' : 'Afficher les notes'}
            title={sidebarOpen ? 'Masquer les notes' : 'Afficher les notes'}
            className="fixed right-0 top-1/2 z-10 hidden h-12 w-7 -translate-y-1/2 items-center justify-center rounded-l-xl border border-r-0 border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-900 md:flex"
          >
            <PanelRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 