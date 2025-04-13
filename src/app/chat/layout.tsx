'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Pencil, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
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
    <div className="flex h-screen">
      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Barre d'en-tête */}
        <header className="w-full p-4 bg-white shadow-md z-10">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="mr-2"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Tableau de bord
              </Button>
              <h1 className="text-xl font-bold text-gray-800">Assistant de Voyage ItinaryMe</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 mr-2">
                {user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden"
              >
                {sidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </header>

        {/* Version mobile : onglets pour basculer entre chat et notes */}
        <div className="md:hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2">
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
                  <p className="text-gray-500">Aucun voyage sélectionné</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Version desktop : affichage côte à côte */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          <div className="flex-1 p-4 overflow-auto">
            {children}
          </div>
          
          {sidebarOpen && (
            <div className="w-96 bg-gray-50 p-4 overflow-auto border-l">
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
                  <p className="text-gray-500">Aucun voyage sélectionné</p>
                </div>
              )}
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex fixed right-0 top-1/2 transform -translate-y-1/2 z-10 h-12 w-6 items-center justify-center rounded-l-md rounded-r-none bg-gray-100"
          >
            {sidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
} 