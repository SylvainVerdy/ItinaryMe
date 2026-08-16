"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowUpRight, Banknote, CalendarRange, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { destinationService } from '@/services/destinationService';
import { DestinationCardProps } from '@/components/DestinationCard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageLoader, PrimaryButton } from '@/components/layout/PageShell';
import { useLanguage } from '@/hooks/useLanguage';

export default function DestinationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const destinationId = params.id as string;
  const { t } = useLanguage();

  const [destination, setDestination] = useState<DestinationCardProps | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDestination = () => {
      const destData = destinationService.getDestinationById(destinationId);

      if (destData) {
        setDestination(destData);
      } else {
        // Si la destination n'existe pas, rediriger vers la page des destinations
        router.push('/destinations');
      }

      setLoading(false);
    };

    fetchDestination();
  }, [destinationId, router]);

  if (loading) {
    return <PageLoader />;
  }

  if (!destination) {
    return null; // La redirection sera gérée par l'effet
  }

  // Réutilise les traductions de destination quand elles existent.
  const key = `destination_${destination.id.replace(/-/g, '_')}`;
  const hasTranslation = t(key) !== key;
  const displayName = hasTranslation ? t(key) : destination.name;
  const displayDescription = hasTranslation ? t(`${key}_desc`) : destination.description;
  const shortName = displayName.split(',')[0];

  const others = destinationService
    .getAllDestinations()
    .filter((dest) => dest.id !== destination.id)
    .slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        {/* En-tête immersif */}
        <section className="relative isolate overflow-hidden bg-brand-ink pt-16">
          <div className="absolute inset-0 -z-10">
            <Image
              src={destination.imageUrl}
              alt={displayName}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-ink via-brand-ink/70 to-brand-ink/40" />
          </div>

          <div className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 lg:px-8">
            <Link
              href="/destinations"
              className="inline-flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-white"
            >
              <ArrowLeft size={16} />
              {t('destinations')}
            </Link>

            <h1 className="mt-8 font-display text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
              {displayName}
            </h1>

            <p className="mt-4 flex items-center gap-2 text-sm text-slate-300">
              <CalendarRange size={16} className="text-brand-lagoon" />
              {t('best_time_to_visit')} : {destination.bestTimeToVisit}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
            {/* Description */}
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                À propos de cette destination
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed text-slate-600">
                {displayDescription}
              </p>

              <h3 className="mt-10 font-display text-xl font-bold text-slate-900">
                {t('highlights')}
              </h3>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {destination.highlights.map((highlight, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
                  >
                    <CheckCircle2 size={17} className="mt-px flex-shrink-0 text-brand-teal" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>

            {/* Infos pratiques */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-7">
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Informations pratiques
                </h3>

                <dl className="mt-6 space-y-5">
                  <PracticalInfo icon={CalendarRange} label={t('best_time_to_visit')}>
                    {destination.bestTimeToVisit}
                  </PracticalInfo>
                  <PracticalInfo icon={Clock} label="Durée recommandée">
                    5 à 7 jours
                  </PracticalInfo>
                  <PracticalInfo icon={Banknote} label="Budget estimé">
                    À partir de 800 € par personne
                  </PracticalInfo>
                </dl>

                <PrimaryButton
                  href={`/travel/new?destination=${encodeURIComponent(destination.name)}`}
                  className="mt-7 w-full"
                >
                  <Sparkles size={16} />
                  Planifier {shortName}
                </PrimaryButton>
                <p className="mt-3 text-center text-xs text-slate-400">
                  L'assistant compose l'itinéraire complet
                </p>
              </div>
            </aside>
          </div>

          {/* Autres destinations */}
          <section className="mt-20">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Autres destinations qui pourraient vous plaire
            </h2>

            <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {others.map((dest) => {
                const otherKey = `destination_${dest.id.replace(/-/g, '_')}`;
                const otherName = t(otherKey) !== otherKey ? t(otherKey) : dest.name;
                return (
                  <Link
                    key={dest.id}
                    href={`/destinations/${dest.id}`}
                    className="group relative block h-48 overflow-hidden rounded-3xl bg-slate-900"
                  >
                    <Image
                      src={dest.imageUrl}
                      alt={otherName}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                    <h3 className="absolute bottom-4 left-5 right-12 truncate font-display text-lg font-bold text-white">
                      {otherName}
                    </h3>
                    <span className="absolute bottom-4 right-4 flex h-8 w-8 translate-y-1 items-center justify-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <ArrowUpRight size={15} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function PracticalInfo({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white text-brand-teal">
        <Icon size={16} />
      </span>
      <div>
        <dt className="text-xs uppercase tracking-wider text-slate-400">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium text-slate-800">{children}</dd>
      </div>
    </div>
  );
}
