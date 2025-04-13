"use client";

import Link from 'next/link';
import { LogoutButton } from '@/components/LogoutButton';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useLanguage } from '@/hooks/useLanguage';

export default function AboutPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow bg-gray-50 pt-24">
        <div className="container mx-auto px-4 py-8">
          {/* <h1 className="text-4xl font-bold mb-8 text-center">{t('aboutUs')}</h1> */}
          <div className="mb-10 text-center">
            <p className="text-gray-600 max-w-3xl mx-auto">
              {t('aboutDescription')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
            <div className="bg-[#f8f5ec] rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-600">{t('ourMission')}</h2>
              <p className="text-gray-700 mb-4">
                {t('ourMissionDescription1')}
              </p>
              <p className="text-gray-700">
                {t('ourMissionDescription2')}
              </p>
            </div>

            <div className="bg-[#f8f5ec] rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-600">{t('ourHistory')}</h2>
              <p className="text-gray-700 mb-4">
                {t('ourHistoryDescription1')}
              </p>
              <p className="text-gray-700">
                {t('ourHistoryDescription2')}
              </p>
            </div>
          </div>

          <div className="bg-[#f8f5ec] rounded-lg shadow-md p-8 mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-center">{t('howItFunctions')}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
                <h3 className="font-medium mb-2">{t('shareYourPreferences')}</h3>
                <p className="text-gray-600">
                  {t('shareYourPreferencesDescription')}
                </p>
              </div>

              <div className="text-center">
                <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
                <h3 className="font-medium mb-2">{t('personalizedAIAssistant')}</h3>
                <p className="text-gray-600">
                  {t('personalizedAIAssistantDescription')}
                </p>
              </div>

              <div className="text-center">
                <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
                <h3 className="font-medium mb-2">{t('enjoyYourTrip')}</h3>
                <p className="text-gray-600">
                  {t('enjoyYourTripDescription')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-600 text-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">{t('readyToPlanYourNextTrip')}</h2>
            <p className="mb-6 max-w-2xl mx-auto">
              {t('joinThousandsOfTravelers')}
            </p>
            <Link 
              href="/travel/new"
              className="inline-block px-6 py-3 bg-white text-blue-600 rounded-md hover:bg-gray-100 transition-colors font-medium"
            >
              {t('startYourItinerary')}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
} 