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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {activity ? 'Modifier l\'activité' : 'Ajouter une activité'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Ex: Visite du Louvre"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => set('category', cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.category === cat
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={form.date}
                min={tripStart}
                max={tripEnd}
                onChange={(e) => set('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => set('startTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => set('endTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Lieu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Ex: Paris, Rue de Rivoli"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Prix */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price ?? ''}
                onChange={(e) => set('price', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
              <select
                value={form.currency}
                onChange={(e) => set('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set('status', s.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.status === s.value
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Informations complémentaires..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60"
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
