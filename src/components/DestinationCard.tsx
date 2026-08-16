"use client";

import { FC } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, CalendarRange, Sparkles } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export interface DestinationCardProps {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  highlights: string[];
  bestTimeToVisit: string;
}

export const DestinationCard: FC<DestinationCardProps> = ({
  id,
  name,
  imageUrl,
  description,
  highlights,
  bestTimeToVisit
}) => {
  const { t } = useLanguage();

  // Déterminer si on doit utiliser les traductions pour cette destination
  const destinationKey = `destination_${id.replace(/-/g, '_')}`;
  const hasTranslation = t(destinationKey) !== destinationKey;

  const displayName = hasTranslation ? t(destinationKey) : name;
  const displayDescription = hasTranslation ? t(`${destinationKey}_desc`) : description;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lift">
      <Link href={`/destinations/${id}`} className="relative block h-52 overflow-hidden">
        <Image
          src={imageUrl}
          alt={displayName}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />

        <h3 className="absolute bottom-4 left-5 right-12 truncate font-display text-xl font-bold text-white">
          {displayName}
        </h3>
        <span className="absolute bottom-4 right-4 flex h-8 w-8 translate-y-1 items-center justify-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight size={15} />
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">{displayDescription}</p>

        {highlights.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {highlights.slice(0, 3).map((highlight, index) => (
              <li
                key={index}
                className="max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
              >
                {highlight}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 flex items-start gap-1.5 text-xs text-slate-400">
          <CalendarRange size={14} className="mt-px flex-shrink-0 text-brand-teal" />
          <span>
            <span className="font-medium text-slate-600">{t('best_time_to_visit')} : </span>
            {bestTimeToVisit}
          </span>
        </p>

        <Link
          href={`/travel/new?destination=${encodeURIComponent(name)}`}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-coral to-brand-sun px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          <Sparkles size={15} />
          {t('planMyTrip')}
        </Link>
      </div>
    </article>
  );
};
