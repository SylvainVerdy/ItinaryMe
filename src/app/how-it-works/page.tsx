"use client";

import { Banknote, CalendarClock, Map, MessagesSquare, Route, Sparkles, Ticket } from 'lucide-react';
import { PageShell, PageHero, PrimaryButton } from '@/components/layout/PageShell';
import { Reveal } from '@/components/landing/Reveal';
import { useLanguage } from '@/hooks/useLanguage';

export default function HowItWorksPage() {
  const { t } = useLanguage();

  const steps = [
    {
      icon: MessagesSquare,
      title: t('sharePreferences'),
      description: t('sharePreferencesDescription'),
      accent: 'from-brand-lagoon to-cyan-400',
    },
    {
      icon: Sparkles,
      title: t('aiCreatesItinerary'),
      description: t('aiCreatesItineraryDescription'),
      accent: 'from-brand-teal to-brand-lagoon',
    },
    {
      icon: Ticket,
      title: t('customizeAndTravel'),
      description: t('customizeAndTravelDescription'),
      accent: 'from-brand-coral to-brand-sun',
    },
  ];

  const features = [
    {
      icon: Route,
      accent: 'bg-teal-50 text-teal-700',
      title: t('customizedItinerariesFeature'),
      description: t('customizedItinerariesFeatureDescription'),
    },
    {
      icon: CalendarClock,
      accent: 'bg-cyan-50 text-cyan-700',
      title: t('quickPlanning'),
      description: t('quickPlanningDescription'),
    },
    {
      icon: Banknote,
      accent: 'bg-emerald-50 text-emerald-700',
      title: t('budgetOptions'),
      description: t('budgetOptionsDescription'),
    },
    {
      icon: Map,
      accent: 'bg-orange-50 text-orange-700',
      title: t('mapsDirections'),
      description: t('mapsDirectionsDescription'),
    },
  ];

  return (
    <PageShell
      hero={
        <PageHero
          eyebrow={t('howItWorks')}
          title={t('howItWorks')}
          subtitle={t('howItWorksDescription')}
        />
      }
    >
      {/* Étapes */}
      <section className="relative">
        <div
          aria-hidden
          className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent md:block"
        />
        <ol className="relative grid gap-10 md:grid-cols-3">
          {steps.map((step, index) => (
            <Reveal as="li" key={step.title} delay={index * 110}>
              <div className="flex flex-col items-center text-center md:items-start md:text-left">
                <div className="relative">
                  <span
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${step.accent} text-white shadow-glow`}
                  >
                    <step.icon size={26} strokeWidth={1.6} />
                  </span>
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white font-display text-xs font-bold text-slate-900">
                    {index + 1}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-xl font-bold text-slate-900">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-slate-500">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Fonctionnalités */}
      <section className="mt-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow bg-teal-50 text-teal-700">{t('features')}</span>
          <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {t('features')}
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={(index % 2) * 100}>
              <article className="h-full rounded-3xl border border-slate-200 bg-white p-8 transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lift">
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${feature.accent}`}
                >
                  <feature.icon size={22} strokeWidth={1.6} />
                </span>
                <h3 className="mt-6 font-display text-xl font-bold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-3 leading-relaxed text-slate-500">{feature.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <Reveal className="mt-24">
        <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-brand-ink px-6 py-16 text-center sm:px-16">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-teal/40 blur-[100px]" />
            <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-brand-sun/30 blur-[100px]" />
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-50" />

          <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {t('readyToPlan')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-slate-300">
            {t('startTodayDescription')}
          </p>
          <PrimaryButton href="/travel/new" className="mt-8">
            {t('planMyTrip')}
          </PrimaryButton>
        </div>
      </Reveal>
    </PageShell>
  );
}
