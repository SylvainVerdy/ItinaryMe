'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, MessageSquare, Copy, Plus, X, LinkIcon, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChatMessage } from '@/lib/types';

interface LinkItem {
  id: string;
  message: ChatMessage;
  timestamp: Date;
  messageId: string;
}

interface TravelLink {
  id: string;
  url: string;
  title: string;
}

export default function LinksPage() {
  const { id } = useParams();
  const router = useRouter();
  const travelId = Array.isArray(id) ? id[0] : id;
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [manualLinks, setManualLinks] = useState<TravelLink[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [travelData, setTravelData] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
    
    if (user && travelId) {
      fetchTravelData();
      fetchLinks();
    }
  }, [user, loading, travelId]);

  const fetchTravelData = async () => {
    try {
      if (!travelId) return;
      
      const docRef = doc(db, 'travels', travelId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTravelData(data);
        
        // Récupération des liens manuels
        if (data.links && Array.isArray(data.links)) {
          setManualLinks(data.links);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données de voyage:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du voyage",
        variant: "destructive",
      });
    }
  };

  const fetchLinks = async () => {
    setIsLoading(true);
    try {
      const linksCollection = collection(db, 'messages');
      const linksQuery = query(
        linksCollection, 
        where('userId', '==', user?.uid), 
        where('linkedToTrip', '==', true),
        where('travelId', '==', travelId)
      );
      
      const querySnapshot = await getDocs(linksQuery);
      const linkedMessages: LinkItem[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        linkedMessages.push({
          id: doc.id,
          message: data as ChatMessage,
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          messageId: data.id || doc.id
        });
      });
      
      // Trier par date, du plus récent au plus ancien
      linkedMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setLinks(linkedMessages);
    } catch (error) {
      console.error("Erreur lors de la récupération des liens: ", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les liens associés",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addLink = async () => {
    if (!newLinkUrl || !newLinkTitle || !travelId) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez entrer un titre et une URL pour le lien",
        variant: "destructive",
      });
      return;
    }

    try {
      setAddingLink(true);
      
      // Valider l'URL
      let url = newLinkUrl;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      const newLink = {
        id: Date.now().toString(),
        url,
        title: newLinkTitle
      };

      const updatedLinks = [...manualLinks, newLink];

      // Mettre à jour dans Firestore
      const travelDocRef = doc(db, 'travels', travelId);
      await updateDoc(travelDocRef, {
        links: updatedLinks
      });

      // Mettre à jour l'état local
      setManualLinks(updatedLinks);
      setNewLinkTitle('');
      setNewLinkUrl('');

      toast({
        title: "Lien ajouté",
        description: "Le lien a été ajouté à votre voyage.",
        variant: "default",
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout du lien:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ajout du lien.",
        variant: "destructive",
      });
    } finally {
      setAddingLink(false);
    }
  };

  const removeLink = async (linkId: string) => {
    if (!travelId) return;
    
    try {
      const updatedLinks = manualLinks.filter(link => link.id !== linkId);

      // Mettre à jour dans Firestore
      const travelDocRef = doc(db, 'travels', travelId);
      await updateDoc(travelDocRef, {
        links: updatedLinks
      });

      // Mettre à jour l'état local
      setManualLinks(updatedLinks);

      toast({
        title: "Lien supprimé",
        description: "Le lien a été supprimé de votre voyage.",
        variant: "default",
      });
    } catch (error) {
      console.error("Erreur lors de la suppression du lien:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression du lien.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast({
        title: "Copié",
        description: "Texte copié dans le presse-papiers",
        variant: "default"
      }))
      .catch(err => toast({
        title: "Erreur",
        description: "Erreur lors de la copie",
        variant: "destructive"
      }));
  };

  if (isLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!travelId) {
    router.push('/travels');
    return null;
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <Link href={`/travel/${travelId}`} className="flex items-center text-primary hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour au voyage
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Liens associés au voyage</h1>
      
      {/* Section pour ajouter un nouveau lien */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <LinkIcon className="h-5 w-5 mr-2 text-primary" />
            Ajouter un nouveau lien
          </CardTitle>
          <CardDescription>
            Ajoutez des liens vers des sites web, des réservations, ou d'autres ressources importantes pour votre voyage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            <div>
              <label htmlFor="link-title" className="block text-sm font-medium text-gray-700 mb-1">
                Titre du lien
              </label>
              <Input 
                type="text" 
                id="link-title"
                value={newLinkTitle}
                onChange={(e) => setNewLinkTitle(e.target.value)}
                placeholder="Ex: Réservation hôtel"
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="link-url" className="block text-sm font-medium text-gray-700 mb-1">
                URL
              </label>
              <Input 
                type="text" 
                id="link-url"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="Ex: https://booking.com/reservation"
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={addLink}
            disabled={addingLink}
            className="flex items-center gap-2"
          >
            {addingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Ajouter le lien
          </Button>
        </CardFooter>
      </Card>
      
      {/* Liste des liens ajoutés manuellement */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Liens personnels</h2>
        
        {manualLinks.length === 0 ? (
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-6 text-center text-gray-500">
            Vous n'avez pas encore ajouté de liens personnels. Utilisez le formulaire ci-dessus pour ajouter vos premiers liens.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {manualLinks.map((link) => (
              <Card key={link.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50 pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-base flex items-center">
                        <LinkIcon className="h-4 w-4 mr-2 text-primary" />
                        {link.title}
                      </CardTitle>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeLink(link.id)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 pb-3 flex justify-between items-center">
                  <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm text-blue-500 hover:underline flex items-center"
                  >
                    {link.url}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(link.url)}
                    className="h-7 w-7 p-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Messages liés à ce voyage */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4">Messages d'assistance IA liés</h2>
        
        <div className="bg-white shadow-md rounded-lg p-6">
          {links.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 mb-4">Aucun message n'a encore été associé à ce voyage</p>
              <p className="text-sm text-gray-400">
                Vous pouvez associer des messages de conversation à ce voyage en cliquant sur le bouton "Lier au voyage" dans l'interface de chat.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {links.map((link) => (
                <Card key={link.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 pb-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-sm flex items-center">
                          <MessageSquare className="h-4 w-4 mr-2 text-primary" />
                          Message lié le {format(link.timestamp, 'PPP', { locale: fr })}
                        </CardTitle>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(link.message.content)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-sm whitespace-pre-wrap">
                      {link.message.content}
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 text-xs text-gray-500 flex justify-end">
                    <Link href={`/chat?travelId=${travelId}`} className="flex items-center hover:text-primary">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Voir dans la conversation
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 