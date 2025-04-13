"use client";

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">ItinaryMe</h3>
            <p className="text-gray-600 mb-4">
              Votre partenaire de confiance pour planifier des voyages inoubliables et personnalisés.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">À propos</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-600 hover:text-blue-600">
                  Notre histoire
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 hover:text-blue-600">
                  Comment ça marche
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 hover:text-blue-600">
                  Témoignages
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Destinations</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/destinations" className="text-gray-600 hover:text-blue-600">
                  Populaires
                </Link>
              </li>
              <li>
                <Link href="/destinations" className="text-gray-600 hover:text-blue-600">
                  Par saison
                </Link>
              </li>
              <li>
                <Link href="/destinations" className="text-gray-600 hover:text-blue-600">
                  Toutes les destinations
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Contact</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-blue-600">
                  Nous contacter
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-blue-600">
                  Support
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-blue-600">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-gray-600">© 2024 ItinaryMe. Tous droits réservés.</p>
          </div>
          <div className="flex space-x-8">
            <Link href="/privacy" className="text-gray-600 hover:text-blue-600">
              Confidentialité
            </Link>
            <Link href="/terms" className="text-gray-600 hover:text-blue-600">
              Conditions
            </Link>
            <Link href="/cookies" className="text-gray-600 hover:text-blue-600">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
} 