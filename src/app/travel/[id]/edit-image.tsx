"use client";

import { useState, useRef } from 'react';
import { doc, updateDoc, addDoc, collection, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Image, Link as LinkIcon, Upload, X, CheckCircle, Loader2 } from 'lucide-react';

interface TravelLink {
  id: string;
  url: string;
  title: string;
}

interface EditImageProps {
  travelId: string;
  currentImageUrl?: string;
  currentLinks?: TravelLink[];
  onUpdate?: () => void;
}

export default function EditTravelImage({ travelId, currentImageUrl, currentLinks = [], onUpdate }: EditImageProps) {
  const [imageUrl, setImageUrl] = useState<string | undefined>(currentImageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [links, setLinks] = useState<TravelLink[]>(currentLinks);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Gérer l'upload d'image
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("Aucun fichier sélectionné");
      return;
    }

    console.log("Fichier sélectionné:", file.name, "Type:", file.type, "Taille:", file.size);

    // Vérifier le type et la taille du fichier
    if (!file.type.startsWith('image/')) {
      console.error("Type de fichier non supporté:", file.type);
      toast({
        title: "Type de fichier non supporté",
        description: "Veuillez sélectionner une image (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Limiter la taille à 5MB
    if (file.size > 5 * 1024 * 1024) {
      console.error("Fichier trop volumineux:", file.size);
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale autorisée est de 5 MB pour une image",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      console.log("Début du traitement de l'image pour le voyage:", travelId);

      // Lire le fichier comme Data URL (base64)
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          if (!event.target || typeof event.target.result !== 'string') {
            throw new Error("Erreur lors de la lecture du fichier");
          }
          
          const base64Image = event.target.result;
          console.log("Image encodée en base64, longueur:", base64Image.length);
          
          // Mettre à jour directement dans Firestore avec l'image en base64
          console.log("Mise à jour de Firestore avec l'image encodée...");
          await updateDoc(doc(db, 'travels', travelId), {
            imageUrl: base64Image
          });
          console.log("Firestore mis à jour avec succès");
          
          // Mettre à jour l'état local
          setImageUrl(base64Image);
          
          toast({
            title: "Image mise à jour",
            description: "L'image de votre voyage a été mise à jour avec succès.",
            variant: "default",
          });
          
          if (onUpdate) {
            console.log("Appel de la fonction de rappel onUpdate");
            onUpdate();
          }
        } catch (error) {
          console.error("Erreur lors de la mise à jour de l'image:", error);
          
          let errorMessage = "Une erreur est survenue lors de la mise à jour de l'image.";
          if (error instanceof Error) {
            errorMessage += ` (${error.name}: ${error.message})`;
          }
          
          toast({
            title: "Erreur",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        console.error("Erreur lors de la lecture du fichier");
        toast({
          title: "Erreur",
          description: "Impossible de lire le fichier sélectionné.",
          variant: "destructive",
        });
        setIsUploading(false);
      };
      
      // Démarrer la lecture du fichier
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error("Erreur lors du traitement de l'image:", error);
      
      let errorMessage = "Une erreur est survenue lors du traitement de l'image.";
      if (error instanceof Error) {
        errorMessage += ` (${error.name}: ${error.message})`;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
      
      setIsUploading(false);
    }
  };

  // Ajouter un nouveau lien
  const addLink = async () => {
    if (!newLinkUrl || !newLinkTitle) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez entrer un titre et une URL pour le lien",
        variant: "destructive",
      });
      return;
    }

    try {
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

      const updatedLinks = [...links, newLink];

      // Mettre à jour dans Firestore
      await updateDoc(doc(db, 'travels', travelId), {
        links: updatedLinks
      });

      // Mettre à jour l'état local
      setLinks(updatedLinks);
      setNewLinkTitle('');
      setNewLinkUrl('');

      toast({
        title: "Lien ajouté",
        description: "Le lien a été ajouté à votre voyage.",
        variant: "default",
      });

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Erreur lors de l'ajout du lien:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ajout du lien.",
        variant: "destructive",
      });
    }
  };

  // Supprimer un lien
  const removeLink = async (linkId: string) => {
    try {
      const updatedLinks = links.filter(link => link.id !== linkId);

      // Mettre à jour dans Firestore
      await updateDoc(doc(db, 'travels', travelId), {
        links: updatedLinks
      });

      // Mettre à jour l'état local
      setLinks(updatedLinks);

      toast({
        title: "Lien supprimé",
        description: "Le lien a été supprimé.",
        variant: "default",
      });

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Erreur lors de la suppression du lien:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression du lien.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6">
      <h3 className="text-xl font-medium text-gray-800 mb-6">Personnalisation</h3>

      {/* Section Image */}
      <div className="mb-8">
        <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Image size={18} className="text-blue-500" />
          <span>Image du voyage</span>
        </h4>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/3 flex justify-center">
            <div className="h-40 w-full max-w-md bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center relative">
              {imageUrl ? (
                <>
                  <img 
                    src={imageUrl} 
                    alt="Image du voyage" 
                    className="w-full h-full object-cover" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 p-2 bg-white/80 hover:bg-white rounded-full shadow-sm transition-colors"
                  >
                    <Upload size={16} className="text-blue-500" />
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center text-gray-500 hover:text-blue-500 transition-colors"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={24} className="animate-spin mb-2" />
                      <span className="text-sm">Envoi en cours...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={24} className="mb-2" />
                      <span className="text-sm">Télécharger une image</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-3">
              Ajoutez une image représentative pour votre voyage. Cela peut être une photo de votre destination, un monument emblématique ou tout autre visuel lié à votre voyage.
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Formats acceptés : JPG, PNG, GIF • Taille max : 1 MB
            </p>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
              disabled={isUploading}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              disabled={isUploading}
            >
              {isUploading ? (
                <span className="flex items-center gap-1">
                  <Loader2 size={14} className="animate-spin" />
                  Envoi en cours...
                </span>
              ) : imageUrl ? "Changer l'image" : "Sélectionner une image"}
            </button>
          </div>
        </div>
      </div>

      {/* Section Liens */}
      <div>
        <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
          <LinkIcon size={18} className="text-blue-500" />
          <span>Liens utiles</span>
        </h4>

        <p className="text-sm text-gray-600 mb-4">
          Ajoutez des liens vers des ressources utiles pour votre voyage (réservations, sites touristiques, documents, etc.).
        </p>

        {/* Liste des liens existants */}
        {links.length > 0 && (
          <div className="mb-4 border rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {links.map(link => (
                <li key={link.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LinkIcon size={14} className="text-blue-500 flex-shrink-0" />
                    <div>
                      <h5 className="font-medium text-sm">{link.title}</h5>
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-blue-500 hover:underline truncate max-w-xs inline-block"
                      >
                        {link.url}
                      </a>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeLink(link.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Formulaire pour ajouter un lien */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
          <div>
            <label htmlFor="link-title" className="block text-sm font-medium text-gray-700 mb-1">
              Titre du lien
            </label>
            <input 
              type="text" 
              id="link-title"
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              placeholder="Ex: Réservation hôtel"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="link-url" className="block text-sm font-medium text-gray-700 mb-1">
              URL
            </label>
            <input 
              type="text" 
              id="link-url"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="Ex: https://booking.com/reservation"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <button 
          onClick={addLink}
          className="mt-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
        >
          Ajouter un lien
        </button>
      </div>
    </div>
  );
} 