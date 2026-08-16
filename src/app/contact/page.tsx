"use client";

import { useState } from 'react';
import {
  AlertCircle, CheckCircle2, Clock, Loader2, Mail, MapPin, MessageSquare, Phone, Send, User,
} from 'lucide-react';
import { PageShell, PageHero, PrimaryButton, SecondaryButton } from '@/components/layout/PageShell';
import { useLanguage } from '@/hooks/useLanguage';

export default function ContactPage() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset states
    setFormError(null);
    setFormSuccess(false);

    // Validate form
    if (!formData.name || !formData.email || !formData.message) {
      setFormError(t('fillAllFields'));
      return;
    }

    // Simulate form submission
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Reset form after successful submission
      setFormData({
        name: '',
        email: '',
        message: ''
      });

      setFormSuccess(true);
    } catch (err) {
      setFormError(t('errorOccurred'));
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10';

  return (
    <PageShell
      hero={
        <PageHero
          eyebrow={t('contact')}
          title={t('contactUs')}
          subtitle={t('contactDescription')}
        />
      }
    >
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Formulaire */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-9">
          {formSuccess ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={30} />
              </span>
              <h2 className="mt-6 font-display text-2xl font-bold text-slate-900">
                {t('messageSent')}
              </h2>
              <p className="mt-3 max-w-md leading-relaxed text-slate-500">
                {t('thankYouMessage')}
              </p>
              <SecondaryButton
                type="button"
                onClick={() => setFormSuccess(false)}
                className="mt-7"
              >
                {t('sendAnotherMessage')}
              </SecondaryButton>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {formError && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <p>{formError}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="name"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"
                >
                  <User size={15} className="text-brand-teal" />
                  {t('fullName')}
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Camille Dupont"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"
                >
                  <Mail size={15} className="text-brand-teal" />
                  {t('email')}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="camille@exemple.com"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"
                >
                  <MessageSquare size={15} className="text-brand-teal" />
                  {t('message')}
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  className={`${inputClass} resize-y`}
                  placeholder="Votre message…"
                />
              </div>

              <PrimaryButton type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {isSubmitting ? t('sending') : t('sendMessage')}
              </PrimaryButton>
            </form>
          )}
        </div>

        {/* Coordonnées */}
        <aside className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-7">
            <h2 className="font-display text-lg font-bold text-slate-900">{t('contactInfo')}</h2>

            <dl className="mt-6 space-y-5">
              <InfoRow icon={Mail} label={t('email')}>
                contact@itinaryme.app
              </InfoRow>
              <InfoRow icon={Phone} label={t('phone')}>
                +33 1 23 45 67 89
              </InfoRow>
              <InfoRow icon={MapPin} label={t('address')}>
                12 rue des Voyageurs, 75011 Paris
              </InfoRow>
            </dl>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
              <Clock size={17} className="text-brand-teal" />
              {t('openingHours')}
            </h2>

            <dl className="mt-5 space-y-3 text-sm">
              <Hours label={t('mondayFriday')}>9 h – 18 h</Hours>
              <Hours label={t('saturday')}>10 h – 16 h</Hours>
              <Hours label={t('sunday')} muted>
                {t('closed')}
              </Hours>
            </dl>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white text-brand-teal">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wider text-slate-400">{label}</dt>
        <dd className="mt-0.5 truncate text-sm font-medium text-slate-800">{children}</dd>
      </div>
    </div>
  );
}

function Hours({
  label,
  children,
  muted,
}: {
  label: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className={muted ? 'font-medium text-slate-400' : 'font-medium text-slate-800'}>
        {children}
      </dd>
    </div>
  );
}
