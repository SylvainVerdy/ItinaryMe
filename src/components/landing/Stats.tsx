"use client";

import { useLanguage } from '@/hooks/useLanguage';
import { Reveal } from './Reveal';

export function Stats() {
  const { t } = useLanguage();

  const stats = [
    { value: '500+', label: t('lp_stat1') },
    { value: '2M+', label: t('lp_stat2') },
    { value: '60 s', label: t('lp_stat3') },
    { value: '4,9/5', label: t('lp_stat4') },
  ];

  return (
    <section className="relative border-b border-slate-100 bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {t('lp_statsTitle')}
          </p>
        </Reveal>

        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 90}>
              <div className="text-center">
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                  <span className="text-gradient-ocean">{stat.value}</span>
                </dd>
                <p className="mt-2 text-sm text-slate-500">{stat.label}</p>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
