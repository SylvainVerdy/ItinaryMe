import { WebAutomationInterface } from '@/components/WebAutomationInterface';

export const metadata = {
  title: 'Automatisation Web avec IA locale',
  description: 'Interface d\'automatisation web utilisant Ollama et DeepSeek pour l\'analyse et l\'automatisation de tâches.',
};

export default function AutomationPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative isolate overflow-hidden bg-brand-ink py-16">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-teal/35 blur-[110px]" />
          <div className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-brand-coral/25 blur-[110px]" />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-50" />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <span className="eyebrow border border-white/15 bg-white/10 text-white/90 backdrop-blur">
            IA locale
          </span>
          <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Automatisation web
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-slate-300">
            Pilotez un navigateur avec Ollama et DeepSeek pour analyser des pages et automatiser
            des tâches de réservation.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <WebAutomationInterface />
      </div>
    </main>
  );
}
