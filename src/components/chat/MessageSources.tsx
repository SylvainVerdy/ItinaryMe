"use client";

import { ExternalLink } from 'lucide-react';
import { WebSource } from '@/types/chat-message';
import { cn } from '@/lib/utils';

/**
 * Liens renvoyés par l'agent (sources et liens de réservation).
 * Partagé par les trois chats pour que l'affichage soit identique en direct
 * et à la relecture d'une conversation enregistrée.
 */
export function MessageSources({
  sources,
  className,
}: {
  sources: WebSource[];
  className?: string;
}) {
  if (!sources?.length) return null;

  return (
    <div className={cn('w-full', className)}>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        Liens
      </p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((src, i) => {
          const isBooking = src.title.startsWith('Réserver ·');
          let label = src.url;
          try {
            label = new URL(src.url).hostname.replace('www.', '');
          } catch { /* garde l'url brute */ }
          if (isBooking) label = src.title.replace('Réserver · ', '');

          return (
            <a
              key={`${src.url}-${i}`}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              title={src.title}
              className={cn(
                'inline-flex max-w-[240px] items-center gap-1 truncate rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                isBooking
                  ? 'border-transparent bg-gradient-to-r from-brand-coral to-brand-sun font-semibold text-white hover:brightness-110'
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-brand-teal hover:text-brand-teal',
              )}
            >
              <ExternalLink size={9} className="flex-shrink-0" />
              <span className="truncate">{label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
