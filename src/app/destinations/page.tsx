"use client";

import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, MapPinOff } from 'lucide-react';
import { DestinationCard, DestinationCardProps } from '@/components/DestinationCard';
import { destinationService } from '@/services/destinationService';
import { PageShell, PageHero, EmptyState, SecondaryButton } from '@/components/layout/PageShell';
import { useLanguage } from '@/hooks/useLanguage';

const SEASONS = [
  { label: 'spring', value: 'mars à mai' },
  { label: 'summer', value: 'juin à août' },
  { label: 'autumn', value: 'septembre à novembre' },
  { label: 'winter', value: 'décembre à février' },
];

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState<DestinationCardProps[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<DestinationCardProps[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    // Charger toutes les destinations
    const allDestinations = destinationService.getAllDestinations();
    setDestinations(allDestinations);
    setFilteredDestinations(allDestinations);
  }, []);

  // Filtrer les destinations en fonction de la recherche et du filtre de saison
  useEffect(() => {
    let results = destinations;

    if (searchQuery) {
      results = destinationService.searchDestinations(searchQuery);
    }

    if (seasonFilter) {
      results = results.filter(dest =>
        dest.bestTimeToVisit.toLowerCase().includes(seasonFilter.toLowerCase())
      );
    }

    setFilteredDestinations(results);
  }, [searchQuery, seasonFilter, destinations]);

  return (
    <PageShell
      hero={
        <PageHero
          eyebrow={t('popularDestinations')}
          title={t('destinations')}
          subtitle={t('destinationsDescription')}
        >
          {/* Filtres, posés à cheval sur le bandeau */}
          <div className="flex flex-col gap-3 rounded-3xl border border-white/15 bg-white/10 p-3 backdrop-blur-xl sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder={t('searchDestination')}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/10 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-brand-lagoon/60 focus:bg-white/15"
              />
            </div>

            <div className="relative sm:w-64">
              <SlidersHorizontal
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                id="seasonFilter"
                aria-label={t('filterBySeason')}
                value={seasonFilter}
                onChange={(event) => setSeasonFilter(event.target.value)}
                className="w-full appearance-none rounded-2xl border border-white/10 bg-white/10 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-brand-lagoon/60 focus:bg-white/15 [&>option]:text-slate-900"
              >
                <option value="">{t('allSeasons')}</option>
                {SEASONS.map((season) => (
                  <option key={season.value} value={season.value}>
                    {t(season.label)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </PageHero>
      }
    >
      {filteredDestinations.length === 0 ? (
        <EmptyState
          icon={MapPinOff}
          title={t('noDestinationsFound')}
          action={
            <SecondaryButton
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSeasonFilter('');
              }}
            >
              Réinitialiser les filtres
            </SecondaryButton>
          }
        />
      ) : (
        <>
          <p className="mb-6 text-sm text-slate-500">
            {filteredDestinations.length} destination{filteredDestinations.length > 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDestinations.map((destination) => (
              <DestinationCard
                key={destination.id}
                id={destination.id}
                name={destination.name}
                imageUrl={destination.imageUrl}
                description={destination.description}
                highlights={destination.highlights}
                bestTimeToVisit={destination.bestTimeToVisit}
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-16 rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
        <p className="mx-auto max-w-xl leading-relaxed text-slate-600">
          {t('cantFindDreamDestination')}
        </p>
        <SecondaryButton href="/contact" className="mt-6">
          {t('contactUs')}
        </SecondaryButton>
      </div>
    </PageShell>
  );
}
