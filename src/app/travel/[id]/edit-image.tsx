"use client";

import { useState, useRef, useEffect } from 'react';
import { doc, updateDoc, addDoc, collection, deleteDoc, query, where, getDocs, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { ImageIcon, Link as LinkIcon, Upload, X, CheckCircle, Loader2, FileText, Plus } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '@/components/layout/PageShell';

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
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Récupérer les notes existantes
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const docRef = doc(db, 'travels', travelId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.notes) {
            setNotes(data.notes);
          }
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des notes:", error);
      }
    };
    
    fetchNotes();
  }, [travelId]);

  // Sauvegarder les notes
  const saveNotes = async () => {
    if (isSavingNotes) return;
    
    try {
      setIsSavingNotes(true);
      
      await updateDoc(doc(db, 'travels', travelId), {
        notes: notes
      });
      
      toast({
        title: "Notes enregistrées",
        description: "Vos notes ont été enregistrées avec succès.",
        variant: "default",
      });
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des notes:", error);
      
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement des notes.",
        variant: "destructive",
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

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

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
      <h3 className="font-display text-xl font-bold text-slate-900">Personnalisation</h3>

      {/* Image */}
      <section className="mt-7">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ImageIcon size={16} className="text-brand-teal" />
          Image du voyage
        </h4>

        <div className="mt-4 flex flex-col gap-5 md:flex-row">
          <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 md:w-64">
            {imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Image du voyage" className="h-full w-full object-cover" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brand-teal shadow-sm transition hover:bg-white"
                  aria-label="Changer l'image"
                >
                  <Upload size={15} />
                </button>
              </>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500 transition-colors hover:text-brand-teal"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={22} className="animate-spin" />
                    <span className="text-sm">Envoi en cours…</span>
                  </>
                ) : (
                  <>
                    <Upload size={22} />
                    <span className="text-sm">Télécharger une image</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex-1">
            <p className="text-sm leading-relaxed text-slate-500">
              Ajoutez un visuel représentatif : une photo de la destination, un monument
              emblématique, ou tout autre repère lié à ce voyage.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Formats acceptés : JPG, PNG, GIF · taille max 1 Mo
            </p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <SecondaryButton
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mt-4"
            >
              {isUploading && <Loader2 size={15} className="animate-spin" />}
              {isUploading
                ? 'Envoi en cours…'
                : imageUrl
                  ? "Changer l'image"
                  : 'Sélectionner une image'}
            </SecondaryButton>
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="mt-9 border-t border-slate-100 pt-7">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <FileText size={16} className="text-brand-teal" />
          Notes de voyage
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Vos notes, idées et réflexions sur ce voyage. Elles sont également disponibles dans la
          section Documents.
        </p>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-4 min-h-[200px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[15px] text-slate-800 outline-none transition focus:border-brand-teal focus:bg-white focus:ring-4 focus:ring-brand-teal/10"
          placeholder="Écrivez vos notes ici…"
        />

        <div className="mt-4 flex justify-end">
          <PrimaryButton onClick={saveNotes} disabled={isSavingNotes}>
            {isSavingNotes ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <CheckCircle size={15} />
            )}
            {isSavingNotes ? 'Enregistrement…' : 'Enregistrer les notes'}
          </PrimaryButton>
        </div>
      </section>

      {/* Liens */}
      <section className="mt-9 border-t border-slate-100 pt-7">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <LinkIcon size={16} className="text-brand-teal" />
          Liens utiles
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Réservations, sites touristiques, documents… gardez tout à portée de main.
        </p>

        {links.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
            {links.map(link => (
              <li key={link.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50 text-brand-teal">
                    <LinkIcon size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{link.title}</p>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-xs text-slate-400 hover:text-brand-teal hover:underline"
                    >
                      {link.url}
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => removeLink(link.id)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  aria-label="Supprimer le lien"
                >
                  <X size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="link-title" className="mb-2 block text-sm font-semibold text-slate-800">
              Titre du lien
            </label>
            <input
              type="text"
              id="link-title"
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              placeholder="Ex : Réservation hôtel"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="link-url" className="mb-2 block text-sm font-semibold text-slate-800">
              URL
            </label>
            <input
              type="text"
              id="link-url"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="Ex : https://booking.com/reservation"
              className={inputClass}
            />
          </div>
        </div>

        <SecondaryButton type="button" onClick={addLink} className="mt-4">
          <Plus size={15} />
          Ajouter un lien
        </SecondaryButton>
      </section>
    </div>
  );
}
