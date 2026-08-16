"use client";

import { Compass, Rocket, Sparkles, Target } from 'lucide-react';
import { PageShell, PageHero, PrimaryButton } from '@/components/layout/PageShell';
import { Reveal } from '@/components/landing/Reveal';
import { useLanguage } from '@/hooks/useLanguage';

export default function AboutPage() {
  const { t } = useLanguage();

  const steps = [
    {
      icon: Compass,
      title: t('shareYourPreferences'),
      description: t('shareYourPreferencesDescription'),
      accent: 'from-brand-lagoon to-cyan-400',
    },
    {
      icon: Sparkles,
      title: t('personalizedAIAssistant'),
      description: t('personalizedAIAssistantDescription'),
      accent: 'from-brand-teal to-brand-lagoon',
    },
    {
      icon: Rocket,
      title: t('enjoyYourTrip'),
      description: t('enjoyYourTripDescription'),
      accent: 'from-brand-coral to-brand-sun',
    },
  ];

  return (
    <PageShell
      hero={
        <PageHero
          eyebrow={t('aboutUs')}
          title={t('ourMission')}
          subtitle={t('aboutDescription')}
        />
      }
    >
      {/* Mission & histoire */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Reveal>
          <article className="h-full rounded-3xl border border-slate-200 bg-white p-8">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-brand-teal">
              <Target size={22} strokeWidth={1.7} />
            </span>
            <h2 className="mt-6 font-display text-2xl font-bold text-slate-900">
              {t('ourMission')}
            </h2>
            <p className="mt-4 leading-relaxed text-slate-500">{t('ourMissionDescription1')}</p>
            <p className="mt-3 leading-relaxed text-slate-500">{t('ourMissionDescription2')}</p>
          </article>
        </Reveal>

        <Reveal delay={100}>
          <article className="h-full rounded-3xl border border-slate-200 bg-white p-8">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <Compass size={22} strokeWidth={1.7} />
            </span>
            <h2 className="mt-6 font-display text-2xl font-bold text-slate-900">
              {t('ourHistory')}
            </h2>
            <p className="mt-4 leading-relaxed text-slate-500">{t('ourHistoryDescription1')}</p>
            <p className="mt-3 leading-relaxed text-slate-500">{t('ourHistoryDescription2')}</p>
          </article>
        </Reveal>
      </div>

      {/* Fonctionnement */}
      <section className="mt-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow bg-teal-50 text-teal-700">{t('howItFunctions')}</span>
          <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {t('howItWorks')}
          </h2>
        </Reveal>

        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <Reveal as="li" key={step.title} delay={index * 110}>
              <div className="flex flex-col items-center text-center md:items-start md:text-left">
                <div className="relative">
                  <span
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${step.accent} text-white`}
                  >
                    <step.icon size={26} strokeWidth={1.6} />
                  </span>
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white font-display text-xs font-bold text-slate-900">
                    {index + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-slate-500">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* CTA */}
      <Reveal className="mt-20">
        <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-brand-ink px-6 py-16 text-center sm:px-16">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-teal/40 blur-[100px]" />
            <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-brand-sun/30 blur-[100px]" />
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-50" />

          <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {t('readyToPlanYourNextTrip')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-slate-300">
            {t('joinThousandsOfTravelers')}
          </p>
          <PrimaryButton href="/travel/new" className="mt-8">
            {t('startYourItinerary')}
          </PrimaryButton>
        </div>
      </Reveal>
    </PageShell>
  );
}
