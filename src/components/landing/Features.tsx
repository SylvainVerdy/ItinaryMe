"use client";

import { CreditCard, Globe2, Map, PiggyBank, Plane, Route } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Reveal } from './Reveal';

export function Features() {
  const { t } = useLanguage();

  return (
    <section className="relative bg-slate-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow bg-orange-50 text-orange-700">{t('lp_featuresTag')}</span>
          <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            {t('lp_featuresTitle')}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-500">{t('lp_featuresSubtitle')}</p>
        </Reveal>

        <div className="mt-16 grid gap-5 lg:grid-cols-6">
          {/* Carte principale */}
          <Reveal className="lg:col-span-4">
            <article className="group relative h-full overflow-hidden rounded-4xl bg-brand-ink p-8 sm:p-10">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-brand-sun/35 blur-[90px] transition-opacity duration-500 group-hover:opacity-80"
              />
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-50" />

              <div className="relative">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-brand-lagoon ring-1 ring-white/15">
                  <Route className="h-6 w-6" strokeWidth={1.6} />
                </span>
                <h3 className="mt-6 font-display text-2xl font-bold text-white sm:text-3xl">
                  {t('lp_feat1Title')}
                </h3>
                <p className="mt-3 max-w-lg leading-relaxed text-slate-300">{t('lp_feat1Desc')}</p>

                {/* Mini itinéraire */}
                <ul className="mt-8 space-y-2.5">
                  {[
                    { day: t('lp_feat1Day1'), detail: t('lp_feat1Day1Detail') },
                    { day: t('lp_feat1Day2'), detail: t('lp_feat1Day2Detail') },
                    { day: t('lp_feat1Day3'), detail: t('lp_feat1Day3Detail') },
                  ].map((item, index) => (
                    <li
                      key={item.day}
                      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition-transform duration-300 hover:translate-x-1"
                      style={{ transitionDelay: `${index * 40}ms` }}
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-teal to-brand-lagoon text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-white">{item.day}</span>
                        <span className="block truncate text-xs text-slate-400">{item.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </Reveal>

          <Reveal className="lg:col-span-2" delay={80}>
            <FeatureCard
              icon={Plane}
              accent="text-teal-700 bg-teal-50"
              title={t('lp_feat2Title')}
              description={t('lp_feat2Desc')}
            />
          </Reveal>

          <Reveal className="lg:col-span-2" delay={160}>
            <FeatureCard
              icon={Map}
              accent="text-cyan-700 bg-cyan-50"
              title={t('lp_feat3Title')}
              description={t('lp_feat3Desc')}
            />
          </Reveal>

          <Reveal className="lg:col-span-2" delay={240}>
            <FeatureCard
              icon={CreditCard}
              accent="text-emerald-700 bg-emerald-50"
              title={t('lp_feat4Title')}
              description={t('lp_feat4Desc')}
            />
          </Reveal>

          <Reveal className="lg:col-span-2" delay={320}>
            <FeatureCard
              icon={PiggyBank}
              accent="text-orange-600 bg-orange-50"
              title={t('lp_feat5Title')}
              description={t('lp_feat5Desc')}
            />
          </Reveal>

          <Reveal className="lg:col-span-6" delay={400}>
            <article className="flex flex-col items-start gap-6 rounded-4xl border border-slate-200 bg-white p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div className="flex items-start gap-5">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-brand-teal">
                  <Globe2 className="h-6 w-6" strokeWidth={1.6} />
                </span>
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-900">{t('lp_feat6Title')}</h3>
                  <p className="mt-2 max-w-2xl leading-relaxed text-slate-500">{t('lp_feat6Desc')}</p>
                </div>
              </div>
              <div className="flex flex-shrink-0 gap-2 text-2xl" aria-hidden>
                {['🇫🇷', '🇬🇧', '🇪🇸', '🇩🇪', '🇮🇹'].map((flag) => (
                  <span
                    key={flag}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  accent,
  title,
  description,
}: {
  icon: React.ElementType;
  accent: string;
  title: string;
  description: string;
}) {
  return (
    <article className="h-full rounded-4xl border border-slate-200 bg-white p-8 transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lift">
      <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}>
        <Icon className="h-6 w-6" strokeWidth={1.6} />
      </span>
      <h3 className="mt-6 font-display text-xl font-bold text-slate-900">{title}</h3>
      <p className="mt-3 leading-relaxed text-slate-500">{description}</p>
    </article>
  );
}
