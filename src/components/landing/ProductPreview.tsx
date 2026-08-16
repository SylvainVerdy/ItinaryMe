"use client";

import { BedDouble, Check, Plane, Sparkles, Wallet } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

/**
 * Aperçu produit "vitrine" affiché sous le hero : une conversation factice avec
 * l'agent, ses résultats vols/hôtels et une carte budget flottante.
 * Purement décoratif — aucun appel réseau, masqué des lecteurs d'écran.
 */
export function ProductPreview() {
  const { t } = useLanguage();

  return (
    <div className="relative mx-auto max-w-5xl" aria-hidden>
      {/* Halo */}
      <div className="pointer-events-none absolute -inset-x-10 -top-10 bottom-10 -z-10 rounded-full bg-brand-coral/25 blur-[100px]" />

      <div className="gradient-ring animate-fade-up animation-delay-700 rounded-3xl shadow-float">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-2xl">
          {/* Barre de fenêtre */}
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3.5">
            <span className="h-3 w-3 rounded-full bg-red-400/80" />
            <span className="h-3 w-3 rounded-full bg-amber-400/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
            <div className="mx-auto flex items-center gap-2 rounded-full bg-white/5 px-4 py-1 text-xs text-slate-400">
              <Sparkles className="h-3 w-3 text-brand-lagoon" />
              itinaryme.app/chat
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Conversation */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-brand-teal to-brand-lagoon px-4 py-3 text-sm leading-relaxed text-white">
                  {t('lp_mockUser')}
                </p>
              </div>

              <div className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
                  <Sparkles className="h-4 w-4 text-brand-lagoon" />
                </span>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5 rounded-2xl bg-white/[0.04] px-3.5 py-2.5 text-xs text-slate-400 ring-1 ring-white/5">
                    {[t('lp_mockStep1'), t('lp_mockStep2'), t('lp_mockStep3')].map((step) => (
                      <span key={step} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                        {step}
                      </span>
                    ))}
                  </div>
                  <p className="max-w-[92%] rounded-2xl rounded-tl-sm bg-white/[0.07] px-4 py-3 text-sm leading-relaxed text-slate-200 ring-1 ring-white/10">
                    {t('lp_mockAgent')}
                  </p>
                </div>
              </div>
            </div>

            {/* Résultats */}
            <div className="flex flex-col gap-3">
              <ResultCard
                icon={<Plane className="h-4 w-4" />}
                tone="ocean"
                tag={t('lp_mockFlightTag')}
                title={t('lp_mockFlightTitle')}
                subtitle={t('lp_mockFlightSub')}
                price="189 €"
              />
              <ResultCard
                icon={<BedDouble className="h-4 w-4" />}
                tone="sunset"
                tag={t('lp_mockHotelTag')}
                title={t('lp_mockHotelTitle')}
                subtitle={t('lp_mockHotelSub')}
                price="96 €"
              />

              <div className="mt-1 flex items-center justify-between rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-emerald-200">
                  <Wallet className="h-4 w-4" />
                  {t('lp_mockBudget')}
                </span>
                <span className="font-display text-lg font-bold text-white">1 042 €</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cartes flottantes */}
      <div className="absolute -left-14 top-[38%] hidden animate-float xl:block rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-xl">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-lagoon">
          {t('lp_mockFloatingTag')}
        </p>
        <p className="mt-1 text-sm font-semibold text-white">{t('lp_mockFloatingValue')}</p>
      </div>

      <div className="absolute -right-14 bottom-12 hidden animate-float xl:block animation-delay-500 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-xl">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
          {t('lp_mockFloating2Tag')}
        </p>
        <p className="mt-1 text-sm font-semibold text-white">{t('lp_mockFloating2Value')}</p>
      </div>
    </div>
  );
}

const TONES = {
  ocean: 'from-cyan-400/20 to-teal-500/10 text-cyan-300',
  sunset: 'from-orange-400/20 to-rose-500/10 text-orange-300',
} as const;

function ResultCard({
  icon,
  tone,
  tag,
  title,
  subtitle,
  price,
}: {
  icon: React.ReactNode;
  tone: keyof typeof TONES;
  tag: string;
  title: string;
  subtitle: string;
  price: string;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 transition hover:bg-white/[0.07]">
      <span
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${TONES[tone]}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{tag}</p>
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        <p className="truncate text-xs text-slate-400">{subtitle}</p>
      </div>
      <span className="font-display text-base font-bold text-white">{price}</span>
    </div>
  );
}
