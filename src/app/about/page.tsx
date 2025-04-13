"use client";

import Link from 'next/link';
import { LogoutButton } from '@/components/LogoutButton';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function AboutPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f5f0e1]">
      <Navbar />

      <main className="max-w-7xl mx-auto py-12 px-4">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            À propos de ItinaryMe
          </h1>
          <p className="text-gray-600 max-w-3xl mx-auto">
            Découvrez comment nous transformons la façon dont vous planifiez vos voyages
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          <div className="bg-[#f8f5ec] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-600">Notre mission</h2>
            <p className="text-gray-700 mb-4">
              Chez ItinaryMe, notre mission est de simplifier la planification de voyage en offrant une plateforme intuitive qui combine technologie et expertise humaine.
            </p>
            <p className="text-gray-700">
              Nous croyons que chaque voyage devrait être une expérience unique, adaptée à vos préférences personnelles et dépourvue des tracas habituels liés à la planification.
            </p>
          </div>

          <div className="bg-[#f8f5ec] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-600">Notre histoire</h2>
            <p className="text-gray-700 mb-4">
              ItinaryMe est né en 2023 de la frustration de ses fondateurs face à la complexité de planifier des voyages mémorables sans y passer des heures.
            </p>
            <p className="text-gray-700">
              Depuis, nous avons aidé des milliers de voyageurs à créer des itinéraires personnalisés qui correspondent parfaitement à leurs envies et à leur budget.
            </p>
          </div>
        </div>

        <div className="bg-[#f8f5ec] rounded-lg shadow-md p-8 mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-center">Comment ça fonctionne</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
              <h3 className="font-medium mb-2">Partagez vos préférences</h3>
              <p className="text-gray-600">
                Indiquez-nous votre destination, dates de voyage et vos centres d'intérêt.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
              <h3 className="font-medium mb-2">Assistant IA personnalisé</h3>
              <p className="text-gray-600">
                Notre assistant intelligent créera un itinéraire adapté à vos préférences.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
              <h3 className="font-medium mb-2">Profitez de votre voyage</h3>
              <p className="text-gray-600">
                Accédez à votre itinéraire détaillé et modifiez-le à tout moment.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-600 text-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Prêt à planifier votre prochain voyage ?</h2>
          <p className="mb-6 max-w-2xl mx-auto">
            Rejoignez des milliers de voyageurs qui ont déjà simplifié leur planification avec ItinaryMe.
          </p>
          <Link 
            href="/travel/new"
            className="inline-block px-6 py-3 bg-white text-blue-600 rounded-md hover:bg-gray-100 transition-colors font-medium"
          >
            Commencer votre itinéraire
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
} 