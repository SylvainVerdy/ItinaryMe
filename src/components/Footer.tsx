"use client";

import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';

export function Footer() {
  const { t } = useLanguage();
  
  return (
    <footer className="bg-white py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">ItinaryMe</h3>
            <p className="text-gray-600 mb-4">
              {t('footer_tagline')}
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">{t('footer_about')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-600 hover:text-blue-600">
                  {t('footer_ourStory')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 hover:text-blue-600">
                  {t('footer_howItWorks')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 hover:text-blue-600">
                  {t('footer_testimonials')}
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">{t('footer_destinations')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/destinations" className="text-gray-600 hover:text-blue-600">
                  {t('footer_popular')}
                </Link>
              </li>
              <li>
                <Link href="/destinations" className="text-gray-600 hover:text-blue-600">
                  {t('footer_bySeason')}
                </Link>
              </li>
              <li>
                <Link href="/destinations" className="text-gray-600 hover:text-blue-600">
                  {t('footer_allDestinations')}
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">{t('footer_contact')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-blue-600">
                  {t('footer_contactUs')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-blue-600">
                  {t('footer_support')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-blue-600">
                  {t('footer_faq')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-gray-600">{t('footer_copyright')}</p>
          </div>
          <div className="flex space-x-8">
            <Link href="/privacy" className="text-gray-600 hover:text-blue-600">
              {t('footer_privacy')}
            </Link>
            <Link href="/terms" className="text-gray-600 hover:text-blue-600">
              {t('footer_terms')}
            </Link>
            <Link href="/cookies" className="text-gray-600 hover:text-blue-600">
              {t('footer_cookies')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
} 