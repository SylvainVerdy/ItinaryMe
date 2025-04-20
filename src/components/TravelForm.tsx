"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TravelFormProps {
  onSubmit: (data: {
    destination: string;
    startDate: string;
    endDate: string;
    numPeople: number;
    notes?: string;
  }) => void;
  onCancel?: () => void;
  initialValues?: {
    destination?: string;
    startDate?: string;
    endDate?: string;
    numPeople?: number;
    notes?: string;
  };
  isLoading?: boolean;
}

export const TravelForm = ({
  onSubmit,
  onCancel,
  initialValues = {},
  isLoading = false
}: TravelFormProps) => {
  // Valeurs par défaut
  const defaultStartDate = new Date().toISOString().split('T')[0];
  const defaultEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Formatage de date pour rendre la saisie plus facile
  const formatDateForInput = (dateString: string | Date | undefined | null): string => {
    if (!dateString) return '';
    
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '';
    
    // Format YYYY-MM-DD pour les inputs type="date"
    return date.toISOString().split('T')[0];
  };

  // État du formulaire
  const [formData, setFormData] = useState({
    destination: initialValues.destination || '',
    startDate: formatDateForInput(initialValues.startDate) || defaultStartDate,
    endDate: formatDateForInput(initialValues.endDate) || defaultEndDate,
    numPeople: initialValues.numPeople || 1,
    notes: initialValues.notes || ''
  });

  // État de validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Gérer les changements dans le formulaire
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Gérer les nombres
    if (name === 'numPeople') {
      const numValue = parseInt(value);
      
      // Valider que c'est un nombre positif
      if (isNaN(numValue) || numValue < 1) {
        setErrors(prev => ({ ...prev, [name]: 'Le nombre de voyageurs doit être au moins 1' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
      
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      // Gérer les champs de texte
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Validation pour les champs requis
      if (name === 'destination' && !value.trim()) {
        setErrors(prev => ({ ...prev, [name]: 'La destination est requise' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }
  };

  // Soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation finale
    const newErrors: Record<string, string> = {};
    
    if (!formData.destination.trim()) {
      newErrors.destination = 'La destination est requise';
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'La date de départ est requise';
    }
    
    if (!formData.endDate) {
      newErrors.endDate = 'La date de retour est requise';
    }
    
    // Vérifier que la date de retour est après la date de départ
    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = 'La date de retour doit être après la date de départ';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Soumettre le formulaire
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="destination">Destination</Label>
        <Input
          id="destination"
          name="destination"
          value={formData.destination}
          onChange={handleChange}
          placeholder="Paris, Tokyo, New York..."
          disabled={isLoading}
          className={errors.destination ? 'border-red-500' : ''}
        />
        {errors.destination && (
          <p className="text-red-500 text-sm mt-1">{errors.destination}</p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Date de départ</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
            disabled={isLoading}
            className={errors.startDate ? 'border-red-500' : ''}
          />
          {errors.startDate && (
            <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="endDate">Date de retour</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            value={formData.endDate}
            onChange={handleChange}
            disabled={isLoading}
            className={errors.endDate ? 'border-red-500' : ''}
          />
          {errors.endDate && (
            <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>
          )}
        </div>
      </div>
      
      <div>
        <Label htmlFor="numPeople">Nombre de voyageurs</Label>
        <Input
          id="numPeople"
          name="numPeople"
          type="number"
          min="1"
          value={formData.numPeople}
          onChange={handleChange}
          disabled={isLoading}
          className={errors.numPeople ? 'border-red-500' : ''}
        />
        {errors.numPeople && (
          <p className="text-red-500 text-sm mt-1">{errors.numPeople}</p>
        )}
      </div>
      
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Préférences, informations importantes..."
          value={formData.notes}
          onChange={handleChange}
          disabled={isLoading}
          rows={4}
        />
      </div>
      
      <div className="flex justify-end space-x-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={isLoading || Object.keys(errors).length > 0}>
          {isLoading ? 'Chargement...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  );
}; 