"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Calendar, MapPin, Users, ArrowLeft } from 'lucide-react';
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
      days.push(<div key={`empty-${i}`} className="border border-[#e6e0d4] bg-[#f8f5ec]/30 h-24 md:h-32"></div>);
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
          className={`border border-[#e6e0d4] h-24 md:h-32 p-1 overflow-hidden ${
            isToday ? 'bg-blue-50' : 'bg-white'
          }`}
        >
          <div className={`text-xs font-medium ${isToday ? 'bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-gray-700'}`}>
            {day}
          </div>
          
          <div className="mt-1 space-y-1 overflow-y-auto h-[calc(100%-20px)]">
            {tripsForDay.map((trip) => (
              <Link 
                href={`/travel/${trip.id}`} 
                key={trip.id} 
                className="block text-[9px] md:text-xs truncate rounded p-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white"
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
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
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
              className={`p-4 rounded-lg border ${
                hasTrips 
                  ? 'border-blue-300 bg-blue-50 text-blue-700' 
                  : 'border-[#e6e0d4] bg-white text-gray-700'
              } hover:shadow-sm transition-all`}
            >
              <div className="font-medium">{month}</div>
              {hasTrips && (
                <div className="text-xs text-blue-600 mt-1">Voyages planifiés</div>
              )}
            </button>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-[#f8f5ec]">
      <Navbar />
      
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/dashboard"
              className="p-1.5 rounded-md hover:bg-[#f0ece3] transition-colors"
            >
              <ArrowLeft size={18} className="text-gray-600" />
            </Link>
            <h1 className="text-2xl font-medium text-gray-800">Calendrier de voyage</h1>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-lg text-red-700">
              {error}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6">
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-medium text-gray-800">Vue annuelle {currentYear}</h2>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCurrentYear(currentYear - 1)}
                      className="p-1.5 rounded-md hover:bg-[#f0ece3] transition-colors"
                    >
                      <ArrowLeft size={18} className="text-gray-600" />
                    </button>
                    
                    <span className="text-lg font-medium">{currentYear}</span>
                    
                    <button
                      onClick={() => setCurrentYear(currentYear + 1)}
                      className="p-1.5 rounded-md hover:bg-[#f0ece3] transition-colors transform rotate-180"
                    >
                      <ArrowLeft size={18} className="text-gray-600" />
                    </button>
                  </div>
                </div>
                
                {yearView()}
              </div>
              
              <div className="mt-12">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-medium text-gray-800">
                    {months[currentMonth]} {currentYear}
                  </h2>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={goToPreviousMonth}
                      className="p-1.5 rounded-md hover:bg-[#f0ece3] transition-colors"
                    >
                      <ArrowLeft size={18} className="text-gray-600" />
                    </button>
                    
                    <button
                      onClick={() => {
                        setCurrentMonth(new Date().getMonth());
                        setCurrentYear(new Date().getFullYear());
                      }}
                      className="px-3 py-1 text-sm rounded-md hover:bg-[#f0ece3] transition-colors"
                    >
                      Aujourd'hui
                    </button>
                    
                    <button
                      onClick={goToNextMonth}
                      className="p-1.5 rounded-md hover:bg-[#f0ece3] transition-colors transform rotate-180"
                    >
                      <ArrowLeft size={18} className="text-gray-600" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-7 gap-px">
                  {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-700 bg-[#f0ece3]">
                      {day}
                    </div>
                  ))}
                  
                  {renderCalendar()}
                </div>
              </div>
              
              {trips.length === 0 && (
                <div className="bg-[#f8f5ec] rounded-lg p-6 mt-8 text-center">
                  <Calendar size={36} className="mx-auto text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Aucun voyage planifié</h3>
                  <p className="text-gray-600 mb-4">
                    Vous n'avez pas encore de voyages planifiés pour cette période. Créez votre premier voyage pour le voir apparaître dans le calendrier.
                  </p>
                  <Link
                    href="/travel/new"
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-colors"
                  >
                    <span>Créer un voyage</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 