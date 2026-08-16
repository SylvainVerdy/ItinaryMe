"use client";

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Reveal } from './Reveal';

export function FinalCTA() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const href = user ? '/travel/new' : '/auth';

  return (
    <section className="bg-white pb-24 pt-8 sm:pb-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-brand-ink px-6 py-20 text-center sm:px-16">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-teal/40 blur-[100px] animate-aurora" />
              <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-brand-sun/35 blur-[100px] animate-aurora animation-delay-500" />
            </div>
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-50" />

            <h2 className="mx-auto max-w-3xl font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              {t('lp_ctaTitle')}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
              {t('lp_ctaSubtitle')}
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href={href}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-coral to-brand-sun px-8 py-4 font-semibold text-white shadow-glow-warm transition hover:brightness-110 sm:w-auto"
              >
                {t('lp_ctaButton')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex w-full items-center justify-center rounded-full border border-white/20 px-8 py-4 font-semibold text-white transition hover:bg-white/10 sm:w-auto"
              >
                {t('lp_ctaSecondary')}
              </Link>
            </div>

            <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm text-slate-400">
              {[t('lp_ctaPerk1'), t('lp_ctaPerk2'), t('lp_ctaPerk3')].map((perk) => (
                <li key={perk} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
