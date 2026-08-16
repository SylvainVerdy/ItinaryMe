"use client";

import { Globe, Hotel, Plane, Ticket, FerrisWheel, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Capacités activables par l'utilisateur. Les identifiants doivent rester
 * alignés sur `CAPABILITIES` dans src/app/api/chat/route.ts, qui les traduit
 * en outils réellement exposés au modèle.
 */
export const CAPABILITY_OPTIONS = [
  { id: 'web',         label: 'Recherche web', icon: Globe,            hint: 'Cherche des informations à jour sur internet' },
  { id: 'flights',     label: 'Vols',          icon: Plane,            hint: 'Recherche de vols réservables' },
  { id: 'hotels',      label: 'Hôtels',        icon: Hotel,            hint: 'Recherche d\'hébergements réservables' },
  { id: 'restaurants', label: 'Restaurants',   icon: UtensilsCrossed,  hint: 'Recherche de restaurants et bars' },
  { id: 'activities',  label: 'Activités',     icon: FerrisWheel,         hint: 'Visites, excursions et billets réservables' },
  { id: 'booking',     label: 'Réservations',  icon: Ticket,           hint: 'Trouve les liens de réservation directe' },
] as const;

export type CapabilityId = (typeof CAPABILITY_OPTIONS)[number]['id'];

/** Toutes les capacités actives — état par défaut. */
export const ALL_CAPABILITIES: CapabilityId[] = CAPABILITY_OPTIONS.map((c) => c.id);

export function ChatCapabilities({
  active,
  onChange,
  className,
}: {
  active: CapabilityId[];
  onChange: (next: CapabilityId[]) => void;
  className?: string;
}) {
  const toggle = (id: CapabilityId) => {
    onChange(active.includes(id) ? active.filter((c) => c !== id) : [...active, id]);
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Outils
      </span>

      {CAPABILITY_OPTIONS.map((cap) => {
        const isOn = active.includes(cap.id);
        return (
          <button
            key={cap.id}
            type="button"
            onClick={() => toggle(cap.id)}
            title={cap.hint}
            aria-pressed={isOn}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
              isOn
                ? 'border-brand-teal/30 bg-teal-50 text-teal-700'
                : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600',
            )}
          >
            <cap.icon size={13} className={isOn ? 'text-brand-teal' : 'text-slate-400'} />
            {cap.label}
          </button>
        );
      })}

      {active.length === 0 && (
        <span className="text-xs text-amber-600">
          Aucun outil actif — l&apos;assistant répondra sans rien chercher.
        </span>
      )}
    </div>
  );
}
