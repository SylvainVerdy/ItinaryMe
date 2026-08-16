"use client";

import { useId } from 'react';
import { cn } from '@/lib/utils';

type LogoProps = {
  /** Rend le lettrage en blanc, pour les fonds sombres. */
  onDark?: boolean;
  /** Masque le lettrage et ne garde que le pin (mobile très étroit). */
  markOnly?: boolean;
  className?: string;
};

/**
 * Logo ItinaryMe en vectoriel.
 * Remplace public/images/logo/logo.png, qui est un carré opaque de 1024 px
 * (fond blanc + larges marges) : inutilisable sur fond sombre et illisible
 * une fois réduit à la hauteur d'une navbar.
 */
export function Logo({ onDark = false, markOnly = false, className }: LogoProps) {
  // Plusieurs logos coexistent dans le DOM (navbar + footer, sidebar + tiroir
  // mobile). Un id de dégradé partagé casse le rendu dès que la première
  // instance est masquée : on en génère un par instance.
  const gradientId = `logo-pin-${useId()}`;

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7 flex-shrink-0"
        fill="none"
        aria-hidden
      >
        <path
          d="M12 2.5c-3.6 0-6.5 2.9-6.5 6.5 0 4.6 5.5 11.1 6.1 11.8a.5.5 0 0 0 .8 0c.6-.7 6.1-7.2 6.1-11.8 0-3.6-2.9-6.5-6.5-6.5Z"
          fill={`url(#${gradientId})`}
        />
        <circle cx="12" cy="9" r="2.6" fill={onDark ? 'hsl(197 65% 8%)' : '#ffffff'} />
        <defs>
          <linearGradient id={gradientId} x1="5.5" y1="2.5" x2="18.5" y2="21">
            <stop stopColor="hsl(187 82% 45%)" />
            <stop offset="1" stopColor="hsl(175 72% 33%)" />
          </linearGradient>
        </defs>
      </svg>

      {!markOnly && (
        <span
          className={cn(
            'font-display text-[19px] font-bold tracking-tight',
            onDark ? 'text-white' : 'text-slate-900',
          )}
        >
          Itinary<span className="text-brand-teal">Me</span>
        </span>
      )}
    </span>
  );
}
