"use client";

import Link from 'next/link';
import { Logo } from './Logo';
import { Instagram, Linkedin, Twitter } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export function Footer() {
  const { t } = useLanguage();

  const columns = [
    {
      title: t('footer_about'),
      links: [
        { label: t('footer_ourStory'), href: '/about' },
        { label: t('footer_howItWorks'), href: '/how-it-works' },
        { label: t('footer_testimonials'), href: '/about' },
      ],
    },
    {
      title: t('footer_destinations'),
      links: [
        { label: t('footer_popular'), href: '/destinations' },
        { label: t('footer_bySeason'), href: '/destinations' },
        { label: t('footer_allDestinations'), href: '/destinations' },
      ],
    },
    {
      title: t('footer_contact'),
      links: [
        { label: t('footer_contactUs'), href: '/contact' },
        { label: t('footer_support'), href: '/contact' },
        { label: t('footer_faq'), href: '/contact' },
      ],
    },
  ];

  const socials = [
    { label: 'Instagram', href: 'https://instagram.com', icon: Instagram },
    { label: 'Twitter', href: 'https://twitter.com', icon: Twitter },
    { label: 'LinkedIn', href: 'https://linkedin.com', icon: Linkedin },
  ];

  return (
    <footer className="relative overflow-hidden bg-brand-ink text-slate-400">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-brand-teal/25 blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex" aria-label="ItinaryMe">
              <Logo onDark />
            </Link>
            <p className="mt-5 text-sm leading-relaxed">{t('footer_tagline')}</p>

            <div className="mt-6 flex gap-2.5">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                >
                  <social.icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
                {column.title}
              </h3>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link href={link.href} className="text-sm transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm">{t('footer_copyright')}</p>
          <div className="flex flex-wrap justify-center gap-x-7 gap-y-2">
            {[
              { label: t('footer_privacy'), href: '/privacy' },
              { label: t('footer_terms'), href: '/terms' },
              { label: t('footer_cookies'), href: '/cookies' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
