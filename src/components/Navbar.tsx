"use client";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className={`w-full px-4 md:px-8 py-3 ${navBgClass} fixed top-0 left-0 right-0 z-[999]`} style={{pointerEvents: 'auto'}}>
      <div className="flex justify-between items-center">
        {/* Logo à gauche */}
        <div className="flex-shrink-0">
          <a 
            href="/" 
            className="block"
            style={{pointerEvents: 'auto'}}
            onClick={() => window.location.href = '/'}
          >
            <Image
              src="/images/logo/logo.png"
              alt="Logo ItinaryMe"
              width={120}
              height={40}
              className="object-contain"
            />
          </a>
        </div>
        
        {/* Bouton menu mobile */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-md focus:outline-none"
          style={{pointerEvents: 'auto'}}
        >
          <svg className={`h-6 w-6 ${textColorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        
        {/* Navigation centrale - Desktop */}
        <div className="hidden md:flex items-center justify-center space-x-10">
          <a
            href="/destinations"
            className={`${textColorClass} ${hoverTextColorClass} font-medium text-base py-2 px-3 rounded-md hover:bg-gray-100 hover:bg-opacity-20`}
            style={{pointerEvents: 'auto'}}
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/destinations';
            }}
          >
            {t('destinations')}
          </a>
          <a
            href="/about"
            className={`${textColorClass} ${hoverTextColorClass} font-medium text-base py-2 px-3 rounded-md hover:bg-gray-100 hover:bg-opacity-20`}
            style={{pointerEvents: 'auto'}}
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/about';
            }}
          >
            {t('about')}
          </a>
          <a
            href="/how-it-works"
            className={`${textColorClass} ${hoverTextColorClass} font-medium text-base py-2 px-3 rounded-md hover:bg-gray-100 hover:bg-opacity-20`}
            style={{pointerEvents: 'auto'}}
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/how-it-works';
            }}
          >
            {t('howItWorks')}
          </a>
          {user && (
            <a
              href="/dashboard"
              className={`${textColorClass} ${hoverTextColorClass} font-medium text-base py-2 px-3 rounded-md hover:bg-gray-100 hover:bg-opacity-20`}
              style={{pointerEvents: 'auto'}}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/dashboard';
              }}
            >
              {t('myTrips')}
            </a>
          )}
        </div>
        
        {/* Contrôles à droite */}
        <div className="flex items-center space-x-2 md:space-x-5">
          {/* Sélecteur de langue */}
          <button 
            ref={languageButtonRef}
            onClick={toggleLanguageMenu}
            className={`flex items-center justify-center p-2 rounded-full w-8 h-8 ${buttonHoverBgClass}`}
            aria-label="Sélectionner la langue"
            style={{pointerEvents: 'auto'}}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${textColorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </button>
          
          {/* Bouton d'aide / Comment ça marche - visible uniquement sur desktop */}
          <a 
            href="/how-it-works" 
            className={`hidden md:flex items-center justify-center p-2 rounded-full w-8 h-8 ${buttonHoverBgClass}`}
            aria-label="Comment ça marche"
            style={{pointerEvents: 'auto'}}
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/how-it-works';
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${textColorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </a>
          
          {/* Profil / Connexion */}
          {user ? (
            <div className="relative group" style={{pointerEvents: 'auto'}}>
              <button
                className={`flex items-center justify-center p-2 rounded-full w-8 h-8 ${buttonHoverBgClass}`}
                aria-label="Menu de profil"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${textColorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 hidden group-hover:block">
                <span className="block px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                  {user.email}
                </span>
                <a 
                  href="/dashboard" 
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = '/dashboard';
                  }}
                >
                  Dashboard
                </a>
                <div className="px-4 py-1">
                  <LogoutButton className="w-full text-left text-sm px-0 py-1 bg-transparent text-red-600 hover:text-red-800" />
                </div>
              </div>
            </div>
          ) : (
            <a 
              href="/auth" 
              className={`flex items-center justify-center p-2 rounded-full w-8 h-8 ${buttonHoverBgClass}`}
              aria-label="Se connecter"
              style={{pointerEvents: 'auto'}}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/auth';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${textColorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </a>
          )}
        </div>
      </div>
      
      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-col space-y-2 pb-3">
            <a 
              href="/destinations" 
              className={`${textColorClass} ${hoverTextColorClass} py-2 px-4 rounded-md hover:bg-gray-100`}
              style={{pointerEvents: 'auto'}}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/destinations';
                setMobileMenuOpen(false);
              }}
            >
              {t('destinations')}
            </a>
            <a 
              href="/about" 
              className={`${textColorClass} ${hoverTextColorClass} py-2 px-4 rounded-md hover:bg-gray-100`}
              style={{pointerEvents: 'auto'}}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/about';
                setMobileMenuOpen(false);
              }}
            >
              {t('about')}
            </a>
            <a 
              href="/how-it-works" 
              className={`${textColorClass} ${hoverTextColorClass} py-2 px-4 rounded-md hover:bg-gray-100`}
              style={{pointerEvents: 'auto'}}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/how-it-works';
                setMobileMenuOpen(false);
              }}
            >
              {t('howItWorks')}
            </a>
            {user && (
              <a 
                href="/dashboard" 
                className={`${textColorClass} ${hoverTextColorClass} py-2 px-4 rounded-md hover:bg-gray-100`}
                style={{pointerEvents: 'auto'}}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/dashboard';
                  setMobileMenuOpen(false);
                }}
              >
                {t('myTrips')}
              </a>
            )}
          </div>
        </div>
      )}
      
      {/* Portail pour le menu de langues */}
      {mounted && isLanguageMenuOpen && createPortal(
        <div 
          ref={languageMenuRef}
          className="fixed shadow-lg py-1 bg-white rounded-md w-40"
          style={{
            ...menuPosition,
            zIndex: 9999,
            pointerEvents: 'auto'
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
  );
} 