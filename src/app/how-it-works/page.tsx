"use client";

import { useLanguage } from '@/hooks/useLanguage';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Image from 'next/image';
import Link from 'next/link';

export default function HowItWorksPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#f5f0e1]">
      <Navbar />
      
      {/* Espace pour compenser la navbar fixe */}
      <div className="h-20"></div>

      <main className="max-w-6xl mx-auto py-16 px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            {t('howItWorks')}
          </h1>
          <p className="text-gray-600 max-w-3xl mx-auto text-lg">
            {t('howItWorksDescription')}
          </p>
        </div>
        
        {/* Étapes du processus */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-[#f8f5ec] rounded-lg shadow-md p-8 text-center">
            <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">1</div>
            <h3 className="text-xl font-semibold mb-4">{t('sharePreferences')}</h3>
            <p className="text-gray-600 mb-6">
              {t('sharePreferencesDescription')}
            </p>
            <Image 
              src="/images/illustrations/share-preferences.svg" 
              width={200} 
              height={200} 
              alt="Partager vos préférences" 
              className="mx-auto opacity-80"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
          
          <div className="bg-[#f8f5ec] rounded-lg shadow-md p-8 text-center">
            <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">2</div>
            <h3 className="text-xl font-semibold mb-4">{t('aiCreatesItinerary')}</h3>
            <p className="text-gray-600 mb-6">
              {t('aiCreatesItineraryDescription')}
            </p>
            <Image 
              src="/images/illustrations/ai-planning.svg" 
              width={200} 
              height={200} 
              alt="Planification IA" 
              className="mx-auto opacity-80"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
          
          <div className="bg-[#f8f5ec] rounded-lg shadow-md p-8 text-center">
            <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">3</div>
            <h3 className="text-xl font-semibold mb-4">{t('customizeAndTravel')}</h3>
            <p className="text-gray-600 mb-6">
              {t('customizeAndTravelDescription')}
            </p>
            <Image 
              src="/images/illustrations/enjoy-travel.svg" 
              width={200} 
              height={200} 
              alt="Profitez de votre voyage" 
              className="mx-auto opacity-80"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        </div>
        
        {/* Fonctionnalités détaillées */}
        <div className="bg-[#f8f5ec] rounded-lg shadow-md p-8 mb-16">
          <h2 className="text-2xl font-semibold mb-6 text-center">{t('features')}</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-start">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-lg mb-2">{t('customizedItinerariesFeature')}</h3>
                <p className="text-gray-600">
                  {t('customizedItinerariesFeatureDescription')}
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-lg mb-2">{t('quickPlanning')}</h3>
                <p className="text-gray-600">
                  {t('quickPlanningDescription')}
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-lg mb-2">{t('budgetOptions')}</h3>
                <p className="text-gray-600">
                  {t('budgetOptionsDescription')}
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-lg mb-2">{t('mapsDirections')}</h3>
                <p className="text-gray-600">
                  {t('mapsDirectionsDescription')}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Appel à l'action */}
        <div className="bg-blue-600 text-white rounded-lg shadow-md p-10 text-center">
          <h2 className="text-3xl font-semibold mb-4">{t('readyToPlan')}</h2>
          <p className="mb-8 max-w-2xl mx-auto text-lg">
            {t('startTodayDescription')}
          </p>
          <Link 
            href="/"
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-md hover:bg-gray-100 transition-colors font-medium text-lg shadow-lg"
          >
            {t('planMyTrip')}
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
} 