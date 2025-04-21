'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Calendar, AlertCircle } from 'lucide-react';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface EditTripDatesProps {
  tripId: string;
  startDate: string | Date;
  endDate: string | Date;
  onUpdate?: (startDate: string, endDate: string) => void;
}

export function EditTripDates({ tripId, startDate: currentStartDate, endDate: currentEndDate, onUpdate }: EditTripDatesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(formatDateForInput(currentStartDate));
  const [endDate, setEndDate] = useState(formatDateForInput(currentEndDate));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  // Formatage de date pour le input type="date"
  function formatDateForInput(dateString: string | Date): string {
    if (!dateString) return '';
    
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '';
    
    return date.toISOString().split('T')[0];
  }

  // Réinitialiser le formulaire quand on l'ouvre
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setStartDate(formatDateForInput(currentStartDate));
      setEndDate(formatDateForInput(currentEndDate));
      setError('');
    }
  };

  // Valider et enregistrer les modifications
  const handleSave = async () => {
    // Validation
    if (!startDate || !endDate) {
      setError('Les deux dates sont requises.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Dates invalides.');
      return;
    }

    if (start > end) {
      setError('La date de départ doit être antérieure à la date de retour.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Mettre à jour dans Firestore
      await updateDoc(doc(db, 'travels', tripId), {
        startDate: startDate,
        endDate: endDate,
        dateDepart: startDate, // Pour compatibilité avec le format existant
        dateRetour: endDate,   // Pour compatibilité avec le format existant
        updatedAt: serverTimestamp()
      });

      // Notification de succès
      toast({
        title: "Dates modifiées",
        description: "Les dates de votre voyage ont été mises à jour avec succès.",
        variant: "default",
      });

      // Fermer la boîte de dialogue
      setIsOpen(false);

      // Callback pour rafraîchir les données parentes avec les nouvelles dates
      if (onUpdate) {
        onUpdate(startDate, endDate);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour des dates:", error);
      setError('Une erreur est survenue lors de la modification des dates.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          Modifier les dates
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier les dates du voyage</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {error && (
            <div className="flex items-center gap-2 text-red-500 bg-red-50 p-2 rounded border border-red-200">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="startDate">Date de départ</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div>
              <Label htmlFor="endDate">Date de retour</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <Button variant="outline" disabled={isLoading}>Annuler</Button>
          </DialogClose>
          <Button 
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 