"use client";

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CalendarRange } from 'lucide-react';
import { destinationService } from '@/services/destinationService';
import { useLanguage } from '@/hooks/useLanguage';
import { Reveal } from './Reveal';

const FEATURED_IDS = ['santorini', 'tokyo', 'bali', 'marrakech', 'new-york', 'rome'];

export function DestinationsShowcase() {
  const { t } = useLanguage();

  const all = destinationService.getAllDestinations();
  const featured = FEATURED_IDS.map((id) => all.find((destination) => destination.id === id))
    .filter((destination): destination is (typeof all)[number] => Boolean(destination))
    .slice(0, 6);
  const destinations = featured.length ? featured : all.slice(0, 6);

  return (
    <section className="relative overflow-hidden bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="eyebrow bg-orange-50 text-orange-700">{t('lp_destTag')}</span>
            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              {t('lp_destTitle')}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-500">{t('lp_destSubtitle')}</p>
          </div>

          <Link
            href="/destinations"
            className="group inline-flex flex-shrink-0 items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
          >
            {t('lp_destCta')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((destination, index) => (
            <Reveal key={destination.id} delay={(index % 3) * 100}>
              <Link
                href={`/destinations/${destination.id}`}
                className="group relative block h-80 overflow-hidden rounded-4xl bg-slate-900"
              >
                <Image
                  src={`${destination.imageUrl}?w=800&q=70&auto=format&fit=crop`}
                  alt={destination.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-xl font-bold text-white">{destination.name}</h3>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-300">
                        <CalendarRange className="h-3.5 w-3.5" />
                        <span className="truncate">{destination.bestTimeToVisit}</span>
                      </p>
                    </div>
                    <span className="flex h-9 w-9 flex-shrink-0 translate-y-1 items-center justify-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
