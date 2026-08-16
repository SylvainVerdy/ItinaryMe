"use client";

import { Logo } from './Logo';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Check, Globe, LogOut, Menu, Sparkles, User, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LogoutButton } from './LogoutButton';
import { CartDrawer } from './cart/CartDrawer';
import { cn } from '@/lib/utils';

const AVAILABLE_LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
];

export function Navbar({ transparent = false }) {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const languageRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Le style "transparent" n'est valable qu'en haut de page (hero sombre).
  const onDark = transparent && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fermer les menus au clic extérieur / touche Échap.
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setLanguageMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setLanguageMenuOpen(false);
      setProfileMenuOpen(false);
      setMobileMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // Refermer le menu mobile à chaque navigation.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const links = [
    { href: '/destinations', label: t('destinations') },
    { href: '/how-it-works', label: t('howItWorks') },
    { href: '/about', label: t('about') },
    ...(user ? [{ href: '/dashboard', label: t('myTrips') }] : []),
  ];

  const iconButton = cn(
    'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
    onDark ? 'text-white hover:bg-white/15' : 'text-slate-600 hover:bg-slate-100',
  );

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-[999] transition-all duration-300',
        scrolled || mobileMenuOpen
          ? 'border-b border-slate-200/70 bg-white/85 backdrop-blur-xl shadow-[0_1px_20px_-8px_rgb(15_23_42/0.25)]'
          : transparent
            ? 'bg-transparent'
            : 'border-b border-slate-200/70 bg-white',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex flex-shrink-0 items-center" aria-label="ItinaryMe">
          <Logo onDark={onDark} />
        </Link>

        {/* Navigation desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  onDark
                    ? active
                      ? 'bg-white/15 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                    : active
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <div className={onDark ? 'text-white' : 'text-slate-600'}>
            <CartDrawer />
          </div>

          {/* Sélecteur de langue */}
          <div className="relative" ref={languageRef}>
            <button
              type="button"
              onClick={() => setLanguageMenuOpen((open) => !open)}
              className={iconButton}
              aria-haspopup="menu"
              aria-expanded={languageMenuOpen}
              aria-label="Langue"
            >
              <Globe className="h-[18px] w-[18px]" />
            </button>
            {languageMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift animate-fade-up"
              >
                {AVAILABLE_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    role="menuitem"
                    onClick={() => {
                      setLanguage(lang.code as never);
                      setLanguageMenuOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors',
                      language === lang.code
                        ? 'bg-slate-100 font-medium text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    <span aria-hidden>{lang.flag}</span>
                    {lang.name}
                    {language === lang.code && <Check className="ml-auto h-4 w-4 text-brand-teal" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Compte */}
          {user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white transition',
                  'bg-gradient-to-br from-brand-teal to-brand-lagoon hover:opacity-90',
                )}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                aria-label="Menu du compte"
              >
                {(user.email ?? '?').charAt(0).toUpperCase()}
              </button>
              {profileMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift animate-fade-up"
                >
                  <p className="truncate border-b border-slate-100 px-3 py-2.5 text-xs text-slate-500">
                    {user.email}
                  </p>
                  <Link
                    href="/dashboard"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    {t('dashboard')}
                  </Link>
                  <Link
                    href="/chat"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <Sparkles className="h-4 w-4" />
                    {t('lp_navPlan')}
                  </Link>
                  <div className="mt-1 flex items-center gap-2.5 border-t border-slate-100 px-3 pt-2">
                    <LogOut className="h-4 w-4 text-red-500" />
                    <LogoutButton className="w-full bg-transparent px-0 py-1.5 text-left text-sm text-red-600 hover:text-red-700" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/auth"
                className={cn(
                  'hidden rounded-full px-4 py-2 text-sm font-medium transition-colors sm:block',
                  onDark ? 'text-white/85 hover:text-white' : 'text-slate-600 hover:text-slate-900',
                )}
              >
                {t('login')}
              </Link>
              <Link
                href="/auth"
                className="group hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-coral to-brand-sun px-5 py-2.5 text-sm font-semibold text-white shadow-glow-warm transition hover:brightness-110 sm:inline-flex"
              >
                {t('lp_navCta')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </>
          )}

          {/* Burger mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className={cn(iconButton, 'md:hidden')}
            aria-label="Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200/70 bg-white px-4 pb-5 pt-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                {link.label}
              </Link>
            ))}
          </div>
          {!user && (
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/auth"
                className="rounded-full border border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-slate-700"
              >
                {t('login')}
              </Link>
              <Link
                href="/auth"
                className="rounded-full bg-gradient-to-r from-brand-coral to-brand-sun px-4 py-2.5 text-center text-sm font-semibold text-white"
              >
                {t('lp_navCta')}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
