import React, { useState, useEffect } from 'react';
import { formatISO } from 'date-fns';

interface TripFormProps {
  onSubmit: (formData: any) => void;
  onCancel?: () => void;
  initialValues?: {
    destination?: string;
    startDate?: string;
    endDate?: string;
    travelers?: number;
    notes?: string;
  };
  isLoading?: boolean;
}

const TripForm: React.FC<TripFormProps> = ({
  onSubmit,
  onCancel,
  initialValues = {},
  isLoading = false,
}) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const defaultStartDate = formatISO(today, { representation: 'date' });
  const defaultEndDate = formatISO(tomorrow, { representation: 'date' });

  const [destination, setDestination] = useState(initialValues.destination || '');
  const [startDate, setStartDate] = useState(initialValues.startDate || defaultStartDate);
  const [endDate, setEndDate] = useState(initialValues.endDate || defaultEndDate);
  const [travelers, setTravelers] = useState(initialValues.travelers?.toString() || '1');
  const [notes, setNotes] = useState(initialValues.notes || '');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialValues.destination) setDestination(initialValues.destination);
    if (initialValues.startDate) setStartDate(initialValues.startDate);
    if (initialValues.endDate) setEndDate(initialValues.endDate);
    if (initialValues.travelers) setTravelers(initialValues.travelers.toString());
    if (initialValues.notes) setNotes(initialValues.notes);
  }, [initialValues]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!destination.trim()) {
      newErrors.destination = 'La destination est requise';
    }

    if (!startDate) {
      newErrors.startDate = 'La date de début est requise';
    }

    if (!endDate) {
      newErrors.endDate = 'La date de fin est requise';
    } else if (endDate < startDate) {
      newErrors.endDate = 'La date de fin doit être après la date de début';
    }

    const travelersNum = parseInt(travelers, 10);
    if (isNaN(travelersNum) || travelersNum < 1) {
      newErrors.travelers = 'Le nombre de voyageurs doit être au moins 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        destination,
        startDate,
        endDate,
        travelers: parseInt(travelers, 10),
        notes,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="destination" className="block text-sm font-medium">
          Destination
        </label>
        <input
          type="text"
          id="destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className={`mt-1 block w-full rounded-md border ${
            errors.destination ? 'border-red-500' : 'border-gray-300'
          } shadow-sm p-2`}
          disabled={isLoading}
        />
        {errors.destination && (
          <p className="mt-1 text-red-500 text-sm">{errors.destination}</p>
        )}
      </div>

      <div>
        <label htmlFor="startDate" className="block text-sm font-medium">
          Date de début
        </label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className={`mt-1 block w-full rounded-md border ${
            errors.startDate ? 'border-red-500' : 'border-gray-300'
          } shadow-sm p-2`}
          disabled={isLoading}
        />
        {errors.startDate && (
          <p className="mt-1 text-red-500 text-sm">{errors.startDate}</p>
        )}
      </div>

      <div>
        <label htmlFor="endDate" className="block text-sm font-medium">
          Date de fin
        </label>
        <input
          type="date"
          id="endDate"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className={`mt-1 block w-full rounded-md border ${
            errors.endDate ? 'border-red-500' : 'border-gray-300'
          } shadow-sm p-2`}
          disabled={isLoading}
        />
        {errors.endDate && (
          <p className="mt-1 text-red-500 text-sm">{errors.endDate}</p>
        )}
      </div>

      <div>
        <label htmlFor="travelers" className="block text-sm font-medium">
          Nombre de voyageurs
        </label>
        <input
          type="number"
          id="travelers"
          value={travelers}
          onChange={(e) => setTravelers(e.target.value)}
          min="1"
          className={`mt-1 block w-full rounded-md border ${
            errors.travelers ? 'border-red-500' : 'border-gray-300'
          } shadow-sm p-2`}
          disabled={isLoading}
        />
        {errors.travelers && (
          <p className="mt-1 text-red-500 text-sm">{errors.travelers}</p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium">
          Notes / Préférences
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
          disabled={isLoading}
          placeholder="Préférences particulières, centres d'intérêt, etc."
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isLoading}
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
          disabled={isLoading}
        >
          {isLoading ? 'Chargement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
};

export default TripForm; 