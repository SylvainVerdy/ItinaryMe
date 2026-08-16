"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CalendarDays, MapPin, PlayCircle, Sparkles, Star, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { ProductPreview } from './ProductPreview';

export function Hero() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [destination, setDestination] = useState('');
  const [dateDepart, setDateDepart] = useState('');
  const [dateRetour, setDateRetour] = useState('');
  const [travelers, setTravelers] = useState('2');

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      router.push('/auth');
      return;
    }

    const params = new URLSearchParams();
    if (destination.trim()) params.set('destination', destination.trim());
    if (dateDepart) params.set('dateDepart', dateDepart);
    if (dateRetour) params.set('dateRetour', dateRetour);
    if (travelers) params.set('nombreVoyageurs', travelers);

    const query = params.toString();
    router.push(query ? `/travel/new?${query}` : '/travel/new');
  };

  return (
    <section className="relative isolate overflow-hidden bg-brand-ink pb-24 pt-32 sm:pb-32 sm:pt-40">
      {/* Aurores */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-brand-teal/35 blur-[120px] animate-aurora" />
        <div className="absolute -right-32 top-10 h-[32rem] w-[32rem] rounded-full bg-brand-coral/30 blur-[120px] animate-aurora animation-delay-300" />
        <div className="absolute bottom-0 left-1/3 h-[28rem] w-[28rem] rounded-full bg-brand-lagoon/25 blur-[130px] animate-aurora animation-delay-700" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid mask-fade-b opacity-60" />

      {/* Trajectoire de vol décorative */}
      <svg
        aria-hidden
        viewBox="0 0 1440 500"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 top-24 -z-10 h-[26rem] w-full opacity-50"
      >
        <path
          d="M-40 380 C 320 120, 700 460, 1480 90"
          fill="none"
          stroke="hsl(var(--brand-lagoon))"
          strokeWidth="2"
          strokeDasharray="10 12"
          strokeLinecap="round"
        />
        <circle cx="180" cy="266" r="5" fill="hsl(var(--brand-sun))" />
        <circle cx="1180" cy="196" r="5" fill="hsl(var(--brand-coral))" />
      </svg>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-white"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow animate-fade-up border border-white/15 bg-white/10 text-white/90 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-brand-lagoon" />
            {t('lp_badge')}
          </span>

          <h1 className="mt-7 animate-fade-up animation-delay-100 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
            {t('lp_heroTitle')}{' '}
            <span className="text-gradient">{t('lp_heroTitleHighlight')}</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl animate-fade-up animation-delay-200 text-lg leading-relaxed text-slate-300 sm:text-xl">
            {t('lp_heroSubtitle')}
          </p>
        </div>

        {/* Barre de recherche */}
        <form
          onSubmit={handleSearch}
          className="mx-auto mt-10 max-w-4xl animate-fade-up animation-delay-300"
        >
          <div className="gradient-ring rounded-[1.75rem] shadow-float">
            <div className="grid grid-cols-1 gap-1 rounded-[1.75rem] bg-white/95 p-2 backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto]">
              <Field icon={<MapPin className="h-4 w-4" />} label={t('lp_fieldWhere')}>
                <input
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder={t('whereDoYouWantToGo')}
                  className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                />
              </Field>
              <Field icon={<CalendarDays className="h-4 w-4" />} label={t('lp_fieldDeparture')}>
                <input
                  type="date"
                  value={dateDepart}
                  onChange={(event) => setDateDepart(event.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                />
              </Field>
              <Field icon={<CalendarDays className="h-4 w-4" />} label={t('lp_fieldReturn')}>
                <input
                  type="date"
                  value={dateRetour}
                  min={dateDepart || undefined}
                  onChange={(event) => setDateRetour(event.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                />
              </Field>
              <Field icon={<Users className="h-4 w-4" />} label={t('guests')}>
                <input
                  type="number"
                  min={1}
                  value={travelers}
                  onChange={(event) => setTravelers(event.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                />
              </Field>

              <button
                type="submit"
                className="group mt-1 inline-flex items-center justify-center gap-2 rounded-[1.35rem] bg-gradient-to-r from-brand-coral to-brand-sun px-7 py-4 text-sm font-semibold text-white shadow-glow-warm transition hover:brightness-110 sm:mt-0 lg:px-8"
              >
                {t('lp_heroCta')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </form>

        {/* Preuve sociale */}
        <div className="mt-8 flex animate-fade-up animation-delay-500 flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {['from-amber-400 to-orange-500', 'from-cyan-400 to-teal-600', 'from-rose-400 to-orange-500', 'from-teal-300 to-emerald-600'].map(
                (gradient, index) => (
                  <span
                    key={gradient}
                    aria-hidden
                    className={`h-8 w-8 rounded-full bg-gradient-to-br ring-2 ring-brand-ink ${gradient}`}
                    style={{ zIndex: 4 - index }}
                  />
                ),
              )}
            </div>
            <p className="text-sm text-slate-300">{t('lp_socialProof')}</p>
          </div>

          <div className="hidden h-5 w-px bg-white/15 sm:block" />

          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm text-slate-300">{t('lp_rating')}</p>
          </div>

          <div className="hidden h-5 w-px bg-white/15 sm:block" />

          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/90 transition hover:text-white"
          >
            <PlayCircle className="h-5 w-5" />
            {t('lp_heroCtaSecondary')}
          </Link>
        </div>

        {/* Aperçu produit */}
        <div className="mt-16 sm:mt-20">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="group flex cursor-text flex-col justify-center gap-0.5 rounded-[1.35rem] px-4 py-3 transition-colors hover:bg-slate-50 focus-within:bg-slate-50">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <span className="text-brand-teal">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  );
}
