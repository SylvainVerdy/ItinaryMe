"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { travelService, TravelPlanInput } from '@/services/travelService';
import { AlertCircle, CalendarDays, Loader2, MapPin, NotebookPen, Users } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '@/components/layout/PageShell';

interface TravelFormProps {
  initialData?: TravelPlanInput;
  travelId?: string;
  isEditing?: boolean;
}

export function TravelForm({ initialData, travelId, isEditing = false }: TravelFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<TravelPlanInput>({
    destination: '',
    dateDepart: '',
    dateRetour: '',
    nombreVoyageurs: 1,
    notes: '',
    activities: []
  });

  // Si on est en mode édition, charger les données initiales
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      // Préremplir depuis l'URL (recherche lancée depuis la page d'accueil)
      const searchParams = new URLSearchParams(window.location.search);
      const destination = searchParams.get('destination');
      const dateDepart = searchParams.get('dateDepart');
      const dateRetour = searchParams.get('dateRetour');
      const voyageurs = Number(searchParams.get('nombreVoyageurs'));

      setFormData(prev => ({
        ...prev,
        ...(destination ? { destination } : {}),
        ...(dateDepart ? { dateDepart } : {}),
        ...(dateRetour ? { dateRetour } : {}),
        ...(Number.isFinite(voyageurs) && voyageurs > 0 ? { nombreVoyageurs: voyageurs } : {}),
      }));
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'nombreVoyageurs' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setFormError("Vous devez être connecté pour créer un voyage.");
      return;
    }

    if (!formData.destination || !formData.dateDepart || !formData.dateRetour) {
      setFormError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      if (isEditing && travelId) {
        // Mode édition
        await travelService.updateTravel(travelId, formData);
        router.push(`/travel/${travelId}`);
      } else {
        // Mode création
        const newTravelId = await travelService.createTravel(user.uid, formData);
        router.push(`/travel/${newTravelId}`);
      }
    } catch (error: any) {
      console.error("Erreur lors de l'enregistrement du voyage:", error);
      // Afficher le message d'erreur spécifique si disponible
      setFormError(error.message || "Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <p>{formError}</p>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="space-y-6">
          <Field
            label="Destination"
            htmlFor="destination"
            icon={MapPin}
            hint="Ville, région ou pays"
            required
          >
            <input
              type="text"
              id="destination"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              className={inputClass}
              placeholder="Lisbonne, Tokyo, New York…"
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="Date de départ" htmlFor="dateDepart" icon={CalendarDays} required>
              <input
                type="date"
                id="dateDepart"
                name="dateDepart"
                value={formData.dateDepart}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </Field>

            <Field label="Date de retour" htmlFor="dateRetour" icon={CalendarDays} required>
              <input
                type="date"
                id="dateRetour"
                name="dateRetour"
                value={formData.dateRetour}
                min={formData.dateDepart || undefined}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </Field>
          </div>

          <Field label="Nombre de voyageurs" htmlFor="nombreVoyageurs" icon={Users}>
            <select
              id="nombreVoyageurs"
              name="nombreVoyageurs"
              value={formData.nombreVoyageurs}
              onChange={handleChange}
              className={inputClass}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <option key={num} value={num}>
                  {num} voyageur{num > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Notes"
            htmlFor="notes"
            icon={NotebookPen}
            hint="Optionnel — envies, contraintes, budget…"
          >
            <textarea
              id="notes"
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              rows={4}
              className={`${inputClass} resize-y`}
              placeholder="Plutôt gastronomie et musées, budget 1 200 € pour deux…"
            />
          </Field>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <SecondaryButton type="button" onClick={() => router.back()}>
          Annuler
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting
            ? 'Enregistrement…'
            : isEditing
              ? 'Mettre à jour le voyage'
              : 'Créer le voyage'}
        </PrimaryButton>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  icon: Icon,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  icon: React.ElementType;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"
      >
        <Icon size={15} className="text-brand-teal" />
        {label}
        {required && <span className="text-brand-coral">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
