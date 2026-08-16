"use client";

import { Quote, Star } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Reveal } from './Reveal';

export function Testimonials() {
  const { t } = useLanguage();

  const testimonials = [
    {
      quote: t('lp_testi1'),
      name: t('lp_testi1Name'),
      role: t('lp_testi1Role'),
      initials: 'CL',
      accent: 'from-cyan-400 to-teal-600',
    },
    {
      quote: t('lp_testi2'),
      name: t('lp_testi2Name'),
      role: t('lp_testi2Role'),
      initials: 'MR',
      accent: 'from-rose-400 to-orange-500',
    },
    {
      quote: t('lp_testi3'),
      name: t('lp_testi3Name'),
      role: t('lp_testi3Role'),
      initials: 'AD',
      accent: 'from-amber-400 to-orange-500',
    },
  ];

  return (
    <section className="bg-slate-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow bg-teal-50 text-teal-700">{t('lp_testiTag')}</span>
          <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            {t('lp_testiTitle')}
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Reveal key={testimonial.name} delay={index * 110}>
              <figure className="relative flex h-full flex-col rounded-4xl border border-slate-200 bg-white p-8 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                <Quote className="h-8 w-8 text-slate-200" aria-hidden />

                <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-slate-700">
                  “{testimonial.quote}”
                </blockquote>

                <div className="mt-6 flex gap-0.5" aria-hidden>
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star key={starIndex} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <figcaption className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-5">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${testimonial.accent}`}
                    aria-hidden
                  >
                    {testimonial.initials}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{testimonial.name}</span>
                    <span className="block text-xs text-slate-500">{testimonial.role}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
