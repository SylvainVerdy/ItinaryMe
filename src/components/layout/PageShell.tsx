"use client";

import Link from 'next/link';
import { ChevronRight, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { cn } from '@/lib/utils';

/**
 * Coquille commune aux pages publiques et applicatives : navbar fixe, contenu,
 * footer. `hero` est rendu hors du conteneur pour pouvoir occuper toute la
 * largeur (bandeau sombre).
 */
export function PageShell({
  children,
  hero,
  className,
  contained = true,
}: {
  children: React.ReactNode;
  hero?: React.ReactNode;
  className?: string;
  /** Enveloppe `children` dans un conteneur centré. Désactiver pour gérer soi-même. */
  contained?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className={cn('flex-1', !hero && 'pt-16')}>
        {hero}
        {contained ? (
          <div className={cn('mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8', className)}>
            {children}
          </div>
        ) : (
          children
        )}
      </main>
      <Footer />
    </div>
  );
}

/** Bandeau d'en-tête sombre, décliné de l'identité de la page d'accueil. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
  breadcrumb,
  compact = false,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        'relative isolate overflow-hidden bg-brand-ink',
        compact ? 'pb-12 pt-28' : 'pb-16 pt-32 sm:pb-20 sm:pt-36',
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand-teal/35 blur-[110px]" />
        <div className="absolute -right-24 top-0 h-[24rem] w-[24rem] rounded-full bg-brand-coral/25 blur-[110px]" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-50" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="mb-5 flex flex-wrap items-center gap-1 text-sm text-slate-400">
            {breadcrumb.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 && <ChevronRight size={14} className="text-slate-600" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-white">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-200">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {eyebrow && (
          <span className="eyebrow border border-white/15 bg-white/10 text-white/90 backdrop-blur">
            {eyebrow}
          </span>
        )}

        <h1
          className={cn(
            'font-display font-extrabold tracking-tight text-white',
            eyebrow && 'mt-5',
            compact ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl',
          )}
        >
          {title}
        </h1>

        {subtitle && (
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">{subtitle}</p>
        )}

        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

/** Spinner plein écran aux couleurs de la marque. */
export function PageLoader({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

/** État vide illustré, réutilisé par les listes (voyages, favoris, documents). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-teal to-brand-lagoon text-white">
        <Icon size={28} />
      </span>
      <h3 className="font-display text-lg font-bold text-slate-900">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Bouton principal (dégradé coucher de soleil), en <Link> ou <button>. */
export function PrimaryButton({
  href,
  children,
  className,
  ...props
}: {
  href?: string;
  children: React.ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-coral to-brand-sun px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60',
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

/** Bouton secondaire clair, contour discret. */
export function SecondaryButton({
  href,
  children,
  className,
  ...props
}: {
  href?: string;
  children: React.ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-60',
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
