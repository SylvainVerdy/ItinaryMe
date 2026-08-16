'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, MapPin, Clock, Banknote,
  Plane, Hotel, UtensilsCrossed, Landmark, Bus, Zap, MoreHorizontal, Loader2
} from 'lucide-react';
import { Activity, ActivityInput, CATEGORY_LABELS, CATEGORY_COLORS, ActivityCategory } from '@/types/activity';
import { activityService } from '@/services/activityService';
import AddActivityModal from './AddActivityModal';

interface Props {
  tripId: string;
  tripStart: string; // YYYY-MM-DD
  tripEnd: string;   // YYYY-MM-DD
}

const CATEGORY_ICONS: Record<ActivityCategory, React.ReactNode> = {
  flight: <Plane size={14} />,
  hotel: <Hotel size={14} />,
  restaurant: <UtensilsCrossed size={14} />,
  visit: <Landmark size={14} />,
  transport: <Bus size={14} />,
  activity: <Zap size={14} />,
  other: <MoreHorizontal size={14} />,
};

const STATUS_DOT: Record<string, string> = {
  planned: 'bg-slate-400',
  booked: 'bg-emerald-500',
  done: 'bg-brand-teal',
  cancelled: 'bg-red-400',
};

const STATUS_LABEL: Record<string, string> = {
  planned: 'Planifié',
  booked: 'Réservé',
  done: 'Terminé',
  cancelled: 'Annulé',
};

function getDaysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  const current = new Date(start);
  const last = new Date(end);
  while (current <= last) {
    days.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function ItineraryView({ tripId, tripStart, tripEnd }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [defaultDate, setDefaultDate] = useState(tripStart);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const days = getDaysBetween(tripStart, tripEnd);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const data = await activityService.getActivities(tripId);
      setActivities(data);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const handleSave = async (input: ActivityInput, id?: string) => {
    if (id) {
      await activityService.updateActivity(tripId, id, input);
    } else {
      await activityService.addActivity(tripId, input);
    }
    await fetchActivities();
  };

  const handleDelete = async (activity: Activity) => {
    if (!confirm(`Supprimer "${activity.title}" ?`)) return;
    setDeletingId(activity.id);
    try {
      await activityService.deleteActivity(tripId, activity.id);
      setActivities((prev) => prev.filter((a) => a.id !== activity.id));
    } finally {
      setDeletingId(null);
    }
  };

  const openAdd = (date: string) => {
    setDefaultDate(date);
    setEditingActivity(null);
    setShowModal(true);
  };

  const openEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setShowModal(true);
  };

  const totalCost = activities.reduce((sum, a) => sum + (a.price ?? 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 size={28} className="animate-spin text-brand-teal" />
      </div>
    );
  }

  return (
    <div>
      {/* Header résumé */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>{activities.length} activité{activities.length > 1 ? 's' : ''}</span>
          {totalCost > 0 && (
            <span className="flex items-center gap-1">
              <Banknote size={14} />
              {totalCost.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} estimé
            </span>
          )}
        </div>
        <button
          onClick={() => openAdd(tripStart)}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-coral to-brand-sun px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {/* Timeline jour par jour */}
      <div className="space-y-6">
        {days.map((day, dayIndex) => {
          const dayActivities = activities
            .filter((a) => a.date === day)
            .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));

          return (
            <div key={day} className="relative">
              {/* Entête jour */}
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-teal to-brand-lagoon text-xs font-bold text-white">
                  {dayIndex + 1}
                </div>
                <div>
                  <div className="font-display font-bold capitalize text-slate-900">{formatDate(day)}</div>
                </div>
                <button
                  onClick={() => openAdd(day)}
                  className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-brand-teal transition-colors hover:bg-teal-50"
                >
                  <Plus size={13} />
                  Ajouter
                </button>
              </div>

              {/* Activités du jour */}
              <div className="ml-4 space-y-3 border-l-2 border-slate-100 pl-7">
                {dayActivities.length === 0 ? (
                  <p className="py-2 text-sm italic text-slate-400">Aucune activité planifiée</p>
                ) : (
                  dayActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-lift"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Icône catégorie */}
                          <div className={`flex-shrink-0 mt-0.5 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[activity.category]}`}>
                            {CATEGORY_ICONS[activity.category]}
                            <span className="hidden sm:inline">{CATEGORY_LABELS[activity.category]}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900">{activity.title}</span>
                              {/* Statut */}
                              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[activity.status]}`} />
                                {STATUS_LABEL[activity.status]}
                              </span>
                            </div>

                            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              {(activity.startTime || activity.endTime) && (
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {activity.startTime}
                                  {activity.endTime && ` → ${activity.endTime}`}
                                </span>
                              )}
                              {activity.location && (
                                <span className="flex items-center gap-1 truncate max-w-[200px]">
                                  <MapPin size={12} />
                                  {activity.location}
                                </span>
                              )}
                              {activity.price != null && (
                                <span className="flex items-center gap-1 font-medium text-slate-700">
                                  <Banknote size={12} />
                                  {activity.price.toLocaleString('fr-FR')} {activity.currency}
                                </span>
                              )}
                            </div>

                            {activity.notes && (
                              <p className="mt-2 line-clamp-2 text-xs text-slate-500">{activity.notes}</p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(activity)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                            title="Modifier"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(activity)}
                            disabled={deletingId === activity.id}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-red-50 hover:text-red-500"
                            title="Supprimer"
                          >
                            {deletingId === activity.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Trash2 size={14} />
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <AddActivityModal
          tripId={tripId}
          tripStart={tripStart}
          tripEnd={tripEnd}
          activity={editingActivity}
          onClose={() => setShowModal(false)}
          onSave={async (input, id) => {
            // Override date with defaultDate when adding new
            const finalInput = editingActivity ? input : { ...input, date: input.date || defaultDate };
            await handleSave(finalInput, id);
          }}
        />
      )}
    </div>
  );
}
