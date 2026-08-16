"use client";

import { MessagesSquare, Sparkles, Ticket } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Reveal } from './Reveal';

export function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    {
      icon: MessagesSquare,
      title: t('lp_step1Title'),
      description: t('lp_step1Desc'),
      accent: 'from-brand-lagoon to-cyan-400',
    },
    {
      icon: Sparkles,
      title: t('lp_step2Title'),
      description: t('lp_step2Desc'),
      accent: 'from-brand-teal to-brand-lagoon',
    },
    {
      icon: Ticket,
      title: t('lp_step3Title'),
      description: t('lp_step3Desc'),
      accent: 'from-brand-coral to-brand-sun',
    },
  ];

  return (
    <section className="relative overflow-hidden bg-white py-24 sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-dark opacity-40" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow bg-teal-50 text-teal-700">{t('lp_stepsTag')}</span>
          <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            {t('lp_stepsTitle')}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-500">{t('lp_stepsSubtitle')}</p>
        </Reveal>

        <div className="relative mt-16">
          {/* Ligne de liaison desktop */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-[3.25rem] hidden h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent lg:block"
          />

          <ol className="grid gap-10 lg:grid-cols-3 lg:gap-8">
            {steps.map((step, index) => (
              <Reveal as="li" key={step.title} delay={index * 120} className="relative">
                <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                  <div className="relative">
                    <span
                      className={`flex h-[6.5rem] w-[6.5rem] items-center justify-center rounded-3xl bg-gradient-to-br ${step.accent} text-white shadow-glow`}
                    >
                      <step.icon className="h-9 w-9" strokeWidth={1.6} />
                    </span>
                    <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white font-display text-sm font-bold text-slate-900 shadow-sm">
                      {index + 1}
                    </span>
                  </div>

                  <h3 className="mt-7 font-display text-xl font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-3 max-w-sm leading-relaxed text-slate-500">{step.description}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
