"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LogoutButton } from './LogoutButton';
import { createPortal } from 'react-dom';

export function Navbar({ transparent = false }) {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const languageButtonRef = useRef<HTMLButtonElement>(null);
  const buttonPositionRef = useRef<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  // Liste des langues disponibles
  const availableLanguages = [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
  ];

  // Mise à jour de la position du bouton pour le menu
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleLanguageMenu = () => {
    if (languageButtonRef.current) {
      buttonPositionRef.current = languageButtonRef.current.getBoundingClientRect();
    }
    setIsLanguageMenuOpen(!isLanguageMenuOpen);
  };

  const handleLanguageSelect = (langCode: string) => {
    setLanguage(langCode as any);
    setIsLanguageMenuOpen(false);
  };

  // Fermer le menu quand l'utilisateur clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        languageMenuRef.current && 
        !languageMenuRef.current.contains(event.target as Node) &&
        languageButtonRef.current && 
        !languageButtonRef.current.contains(event.target as Node)
      ) {
        setIsLanguageMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navBgClass = transparent 
    ? "bg-transparent" 
    : "bg-white shadow-md";

  const textColorClass = transparent 
    ? "text-white" 
    : "text-gray-600";

  const hoverTextColorClass = transparent 
    ? "hover:text-gray-200" 
    : "hover:text-blue-600";

  const buttonHoverBgClass = transparent 
    ? "hover:bg-white/10" 
    : "hover:bg-gray-100";
    
  // Calculer la position du menu déroulant
  const menuPosition = buttonPositionRef.current ? {
    top: `${buttonPositionRef.current.bottom + window.scrollY}px`,
    right: `${window.innerWidth - buttonPositionRef.current.right}px`,
  } : {};

  return (
    <nav className={`w-full p-4 ${navBgClass}`}>
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/logo/logo.png"
            alt="Logo ItinaryMe"
            width={120}
            height={40}
            className="object-contain"
          />
        </Link>
        
        <div className="hidden md:flex items-center space-x-8">
          <Link href="/destinations" className={`${textColorClass} ${hoverTextColorClass}`}>
            {t('destinations')}
          </Link>
          <Link href="/about" className={`${textColorClass} ${hoverTextColorClass}`}>
            {t('about')}
          </Link>
          {user && (
            <Link href="/dashboard" className={`${textColorClass} ${hoverTextColorClass}`}>
              {t('myTrips')}
            </Link>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Sélecteur de langue */}
          <div className="relative">
            <button 
              ref={languageButtonRef}
              onClick={toggleLanguageMenu}
              className={`flex items-center text-sm ${textColorClass} ${hoverTextColorClass} p-2 rounded-md ${buttonHoverBgClass}`}
            >
              <span className="mr-1">{availableLanguages.find(lang => lang.code === language)?.name}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Utiliser un portail pour rendre le menu à la racine du document */}
            {mounted && isLanguageMenuOpen && createPortal(
              <div 
                ref={languageMenuRef}
                className="fixed shadow-lg py-1 bg-white rounded-md w-40"
                style={{
                  ...menuPosition,
                  zIndex: 9999,
                }}
              >
                {availableLanguages.map(lang => (
                  <button
                    key={lang.code}
                    className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left ${
                      language === lang.code ? 'bg-gray-100' : ''
                    }`}
                    onClick={() => handleLanguageSelect(lang.code)}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>
          
          {user ? (
            <>
              <span className={`text-sm ${textColorClass} hidden md:inline`}>
                {user.email}
              </span>
              <Link 
                href="/dashboard" 
                className={`text-sm ${transparent ? 'text-white' : 'text-blue-600'} ${transparent ? 'hover:text-gray-200' : 'hover:text-blue-800'}`}
              >
                Dashboard
              </Link>
              <LogoutButton className="text-sm px-3 py-1" />
            </>
          ) : (
            <Link 
              href="/auth" 
              className={`px-4 py-2 ${transparent ? 'bg-white text-blue-600 hover:bg-gray-100' : 'bg-blue-600 text-white hover:bg-blue-700'} rounded-md transition-colors`}
            >
              {t('login')}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
} 