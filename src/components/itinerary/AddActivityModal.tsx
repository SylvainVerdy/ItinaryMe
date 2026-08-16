'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import {
  Activity,
  ActivityInput,
  ActivityCategory,
  ActivityStatus,
  CATEGORY_LABELS,
} from '@/types/activity';

interface Props {
  tripId: string;
  tripStart: string; // YYYY-MM-DD
  tripEnd: string;   // YYYY-MM-DD
  activity?: Activity | null; // if set → edit mode
  onClose: () => void;
  onSave: (input: ActivityInput, id?: string) => Promise<void>;
}

const CATEGORIES: ActivityCategory[] = [
  'flight',
  'hotel',
  'restaurant',
  'visit',
  'transport',
  'activity',
  'other',
];

const STATUSES: { value: ActivityStatus; label: string }[] = [
  { value: 'planned', label: 'Planifié' },
  { value: 'booked', label: 'Réservé' },
  { value: 'done', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
];

export default function AddActivityModal({ tripId, tripStart, tripEnd, activity, onClose, onSave }: Props) {
  const [form, setForm] = useState<ActivityInput>({
    title: '',
    date: tripStart,
    startTime: '',
    endTime: '',
    category: 'activity',
    location: '',
    notes: '',
    price: undefined,
    currency: 'EUR',
    status: 'planned',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activity) {
      setForm({
        title: activity.title,
        date: activity.date,
        startTime: activity.startTime ?? '',
        endTime: activity.endTime ?? '',
        category: activity.category,
        location: activity.location ?? '',
        notes: activity.notes ?? '',
        price: activity.price,
        currency: activity.currency ?? 'EUR',
        status: activity.status,
      });
    }
  }, [activity]);

  const set = (key: keyof ActivityInput, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Le titre est obligatoire.'); return; }
    if (!form.date) { setError('La date est obligatoire.'); return; }
    setError('');
    setSaving(true);
    try {
      await onSave(form, activity?.id);
      onClose();
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-float">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="font-display text-lg font-bold text-slate-900">
            {activity ? 'Modifier l\'activité' : 'Ajouter une activité'}
          </h2>
          <button onClick={onClose} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Titre */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Titre *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Ex: Visite du Louvre"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10"
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Catégorie</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => set('category', cat)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                    form.category === cat
                      ? 'border-transparent bg-gradient-to-r from-brand-teal to-brand-lagoon text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand-teal'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Date + Horaires */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">Date *</label>
              <input
                type="date"
                value={form.date}
                min={tripStart}
                max={tripEnd}
                onChange={(e) => set('date', e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">Début</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => set('startTime', e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">Fin</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => set('endTime', e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10"
              />
            </div>
          </div>

          {/* Lieu */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Lieu</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Ex: Paris, Rue de Rivoli"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10"
            />
          </div>

          {/* Prix */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-800">Prix</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price ?? ''}
                onChange={(e) => set('price', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0.00"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">Devise</label>
              <select
                value={form.currency}
                onChange={(e) => set('currency', e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10"
              >
                <option>EUR</option>
                <option>USD</option>
                <option>GBP</option>
                <option>JPY</option>
                <option>CAD</option>
              </select>
            </div>
          </div>

          {/* Statut */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Statut</label>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set('status', s.value)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                    form.status === s.value
                      ? 'border-transparent bg-emerald-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Informations complémentaires..."
              rows={3}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-coral to-brand-sun px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {activity ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
