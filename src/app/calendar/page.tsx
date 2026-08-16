"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  PageShell, PageHero, PageLoader, EmptyState, PrimaryButton,
} from '@/components/layout/PageShell';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

interface TripEvent {
  id: string;
  title: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  numTravelers: number;
  isFavorite?: boolean;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<TripEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const { t } = useLanguage();
  
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  
  // Charger les voyages depuis Firestore
  useEffect(() => {
    const fetchTrips = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        const q = query(
          collection(db, 'travels'),
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const tripsData: TripEvent[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          tripsData.push({
            id: doc.id,
            title: data.title || data.destination,
            destination: data.destination,
            startDate: new Date(data.dateDepart || data.startDate),
            endDate: new Date(data.dateRetour || data.endDate),
            numTravelers: data.nombreVoyageurs || data.numPeople || 1,
            isFavorite: data.isFavorite || false
          });
        });
        
        setTrips(tripsData);
      } catch (err) {
        console.error("Erreur lors du chargement des voyages:", err);
        setError("Impossible de charger vos voyages");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrips();
  }, [user]);
  
  const getMonthDays = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };
  
  const getTripsForDay = (year: number, month: number, day: number) => {
    const date = new Date(year, month, day);
    
    return trips.filter(trip => {
      const tripStart = new Date(trip.startDate);
      const tripEnd = new Date(trip.endDate);
      
      return date >= tripStart && date <= tripEnd;
    });
  };
  
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  const renderCalendar = () => {
    const totalDays = getMonthDays(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    // Jours vides au début du mois
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50/60 md:h-28" />);
    }

    // Jours du mois
    for (let day = 1; day <= totalDays; day++) {
      const tripsForDay = getTripsForDay(currentYear, currentMonth, day);
      const isToday =
        day === new Date().getDate() &&
        currentMonth === new Date().getMonth() &&
        currentYear === new Date().getFullYear();

      days.push(
        <div
          key={`day-${day}`}
          className={cn(
            'h-24 overflow-hidden bg-white p-1.5 md:h-28',
            isToday && 'bg-teal-50/60',
          )}
        >
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center text-xs font-semibold',
              isToday
                ? 'rounded-full bg-gradient-to-br from-brand-coral to-brand-sun text-white'
                : 'text-slate-500',
            )}
          >
            {day}
          </div>

          <div className="mt-1 h-[calc(100%-1.75rem)] space-y-1 overflow-y-auto">
            {tripsForDay.map((trip) => (
              <Link
                href={`/travel/${trip.id}`}
                key={trip.id}
                title={trip.destination}
                className="block truncate rounded-md bg-gradient-to-r from-brand-teal to-brand-lagoon px-1.5 py-1 text-[10px] font-medium text-white transition hover:brightness-110 md:text-xs"
              >
                {trip.destination}
              </Link>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  const yearView = () => {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {months.map((month, index) => {
          const hasTrips = trips.some(trip => {
            const tripStart = new Date(trip.startDate);
            const tripEnd = new Date(trip.endDate);

            return (tripStart.getMonth() === index && tripStart.getFullYear() === currentYear) ||
                   (tripEnd.getMonth() === index && tripEnd.getFullYear() === currentYear);
          });

          return (
            <button
              key={month}
              onClick={() => setCurrentMonth(index)}
              className={cn(
                'rounded-2xl border p-4 text-left transition',
                currentMonth === index
                  ? 'border-brand-teal bg-teal-50'
                  : hasTrips
                    ? 'border-slate-200 bg-white hover:border-brand-teal'
                    : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              <div className="font-display text-sm font-bold text-slate-900">{month}</div>
              {hasTrips ? (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-brand-teal">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-teal" />
                  Voyages
                </div>
              ) : (
                <div className="mt-1 text-xs text-slate-400">—</div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <PageLoader label="Chargement du calendrier…" />;
  }

  return (
    <PageShell
      hero={
        <PageHero
          compact
          breadcrumb={[{ label: 'Tableau de bord', href: '/dashboard' }, { label: 'Calendrier' }]}
          eyebrow="Planning"
          title="Calendrier de voyage"
          subtitle="Vos départs et retours, mois par mois."
        />
      }
    >
      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Vue annuelle */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="font-display text-xl font-bold text-slate-900">Vue annuelle</h2>

              <div className="flex items-center gap-1">
                <NavButton onClick={() => setCurrentYear(currentYear - 1)} label="Année précédente">
                  <ChevronLeft size={17} />
                </NavButton>
                <span className="min-w-[4rem] text-center font-display text-lg font-bold text-slate-900">
                  {currentYear}
                </span>
                <NavButton onClick={() => setCurrentYear(currentYear + 1)} label="Année suivante">
                  <ChevronRight size={17} />
                </NavButton>
              </div>
            </div>

            {yearView()}
          </section>

          {/* Vue mensuelle */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-xl font-bold text-slate-900">
                {months[currentMonth]} {currentYear}
              </h2>

              <div className="flex items-center gap-1">
                <NavButton onClick={goToPreviousMonth} label="Mois précédent">
                  <ChevronLeft size={17} />
                </NavButton>
                <button
                  onClick={() => {
                    setCurrentMonth(new Date().getMonth());
                    setCurrentYear(new Date().getFullYear());
                  }}
                  className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                >
                  Aujourd'hui
                </button>
                <NavButton onClick={goToNextMonth} label="Mois suivant">
                  <ChevronRight size={17} />
                </NavButton>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-7 gap-px bg-slate-200">
                {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                  <div
                    key={day}
                    className="bg-slate-50 p-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {day}
                  </div>
                ))}

                {renderCalendar()}
              </div>
            </div>
          </section>

          {trips.length === 0 && (
            <EmptyState
              icon={CalendarDays}
              title="Aucun voyage planifié"
              description="Créez votre premier voyage pour le voir apparaître dans le calendrier."
              action={<PrimaryButton href="/travel/new">Créer un voyage</PrimaryButton>}
            />
          )}
        </div>
      )}
    </PageShell>
  );
}

function NavButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </button>
  );
}
