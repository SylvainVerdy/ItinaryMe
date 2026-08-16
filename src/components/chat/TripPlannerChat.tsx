'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, User, Plane, Hotel, Ticket, Zap, CheckCircle, ExternalLink } from 'lucide-react';
import { TripChatMessage, TripContext } from '@/types/chat-message';
import FlightResultCard from './FlightResultCard';
import HotelResultCard from './HotelResultCard';
import ActivityResultCard from './ActivityResultCard';
import { CartDrawer } from '../cart/CartDrawer';
import { ChatCapabilities, ALL_CAPABILITIES, CapabilityId } from './ChatCapabilities';
import { cn } from '@/lib/utils';

interface Props {
  tripContext: TripContext;
}

const SUGGESTIONS = [
  'Meilleurs restaurants à proximité',
  'Réserver une table au meilleur restaurant',
  'Trouve-moi des vols depuis Paris',
  'Cherche un hôtel pour mon séjour',
  'Que faire et visiter sur place ?',
];

function renderText(text: string) {
  return text.split('\n').map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={j}>{part.slice(2, -2)}</strong>
        : <span key={j}>{part}</span>
    );
    return (
      <span key={i}>
        {parts}
        {i < arr.length - 1 && <br />}
      </span>
    );
  });
}

/** Pastille avatar, partagée par les bulles et l'indicateur d'activité. */
function Avatar({ isUser }: { isUser?: boolean }) {
  return (
    <span
      className={cn(
        'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white',
        isUser
          ? 'bg-gradient-to-br from-brand-coral to-brand-sun'
          : 'bg-gradient-to-br from-brand-teal to-brand-lagoon',
      )}
    >
      {isUser ? <User size={15} /> : <Sparkles size={15} />}
    </span>
  );
}

function MessageBubble({ msg, tripId }: { msg: TripChatMessage; tripId: string }) {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <Avatar isUser={isUser} />

      <div className={cn('flex max-w-[85%] flex-col gap-3', isUser ? 'items-end' : 'items-start')}>
        {!isUser && msg.steps && msg.steps.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
            {msg.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle size={12} className="flex-shrink-0 text-emerald-500" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        )}

        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-[15px] leading-relaxed',
            isUser
              ? 'rounded-tr-sm bg-brand-ink text-white'
              : 'rounded-tl-sm border border-slate-200 bg-white text-slate-800',
          )}
        >
          {renderText(msg.text)}
        </div>

        {msg.cards?.map((card, ci) => (
          <div key={ci} className="w-full max-w-[600px]">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {card.type === 'flights' && (
                <>
                  <Plane size={13} /> {card.results.length} vol
                  {card.results.length > 1 ? 's' : ''} trouvé{card.results.length > 1 ? 's' : ''}
                </>
              )}
              {card.type === 'hotels' && (
                <>
                  <Hotel size={13} /> {card.results.length} hôtel
                  {card.results.length > 1 ? 's' : ''} trouvé{card.results.length > 1 ? 's' : ''}
                </>
              )}
              {card.type === 'activities' && (
                <>
                  <Ticket size={13} /> {card.results.length} activité
                  {card.results.length > 1 ? 's' : ''} trouvée{card.results.length > 1 ? 's' : ''}
                </>
              )}
            </div>
            {card.type === 'flights' && (
              <div className="flex flex-col gap-3">
                {card.results.map((o) => <FlightResultCard key={o.offerId} offer={o} tripId={tripId} />)}
              </div>
            )}
            {card.type === 'hotels' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {card.results.map((o) => <HotelResultCard key={o.rateId} offer={o} tripId={tripId} />)}
              </div>
            )}
            {card.type === 'activities' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {card.results.map((o) => <ActivityResultCard key={o.activityId} offer={o} tripId={tripId} />)}
              </div>
            )}
          </div>
        ))}

        {!isUser && msg.sources && msg.sources.length > 0 && (
          <div className="w-full max-w-[600px]">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Sources
            </p>
            <div className="flex flex-wrap gap-1.5">
              {msg.sources.map((src, i) => {
                const isBooking = src.title.startsWith('Réserver ·');
                let label = src.url;
                try { label = new URL(src.url).hostname.replace('www.', ''); } catch { /* keep raw */ }
                if (isBooking) label = src.title.replace('Réserver · ', '');
                return (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={src.title}
                    className={cn(
                      'inline-flex max-w-[240px] items-center gap-1 truncate rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                      isBooking
                        ? 'border-transparent bg-gradient-to-r from-brand-coral to-brand-sun font-semibold text-white hover:brightness-110'
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-brand-teal hover:text-brand-teal',
                    )}
                  >
                    <ExternalLink size={9} className="flex-shrink-0" />
                    <span className="truncate">{label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentSteps({ steps }: { steps: string[] }) {
  return (
    <div className="flex gap-3">
      <Avatar />
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-col gap-1.5">
          {steps.map((step, i) => {
            const isCurrent = i === steps.length - 1;
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2 text-sm transition-all',
                  isCurrent ? 'text-slate-700' : 'text-slate-400',
                )}
              >
                {isCurrent
                  ? <Loader2 size={13} className="flex-shrink-0 animate-spin text-brand-teal" />
                  : <CheckCircle size={12} className="flex-shrink-0 text-emerald-500" />
                }
                <span>{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function TripPlannerChat({ tripContext }: Props) {
  const welcome: TripChatMessage = {
    id: 'welcome',
    role: 'assistant',
    text: `Bonjour ! Je suis votre assistant IA pour **${tripContext.destination}** (${new Date(tripContext.startDate + 'T12:00:00').toLocaleDateString('fr-FR')} – ${new Date(tripContext.endDate + 'T12:00:00').toLocaleDateString('fr-FR')}, ${tripContext.travelers} pers.).\n\nJe peux **rechercher sur le web**, chercher des **vols et hôtels**, et trouver des **liens de réservation** pour restaurants et activités. Dites-moi simplement "Réserver au [nom du restaurant]" et je vous trouve le lien directement. Que souhaitez-vous ?`,
    createdAt: new Date(),
  };

  const [messages, setMessages]     = useState<TripChatMessage[]>([welcome]);
  const [input, setInput]           = useState('');
  const [capabilities, setCapabilities] = useState<CapabilityId[]>(ALL_CAPABILITIES);
  const [loading, setLoading]       = useState(false);
  const [statusSteps, setSteps]     = useState<string[]>([]);
  const loadingRef                  = useRef(false);
  const bottomRef                   = useRef<HTMLDivElement>(null);
  const inputRef                    = useRef<HTMLInputElement>(null);
  const messagesRef                 = useRef<TripChatMessage[]>([welcome]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setSteps(['💬 Analyse de votre demande...']);
    setInput('');

    // Progressive status hints while waiting for the (potentially slow) agent
    const thinkingTimer = setTimeout(() => setSteps(['🤔 En train de réfléchir...']), 3000);
    const searchTimer   = setTimeout(() => setSteps((p) => [...p, '🔍 Recherche en cours...']), 10000);

    const userMsg: TripChatMessage = { id: `u-${Date.now()}`, role: 'user', text: trimmed, createdAt: new Date() };
    const history = messagesRef.current.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: trimmed, tripContext, history, capabilities }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      const msg: TripChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.text || 'Voici les résultats.',
        cards:   data.cards?.length   ? data.cards   : undefined,
        steps:   data.steps?.length   ? data.steps   : undefined,
        sources: data.sources?.length ? data.sources : undefined,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, msg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `e-${Date.now()}`,
        role: 'assistant',
        text: "Erreur de connexion. Vérifiez qu'Ollama est démarré.",
        createdAt: new Date(),
      }]);
    } finally {
      clearTimeout(thinkingTimer);
      clearTimeout(searchTimer);
      loadingRef.current = false;
      setLoading(false);
      setSteps([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <div className="flex h-[560px] flex-col">
      {/* Bandeau agent */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
          <Zap size={11} />
          Agent IA · Qwen3.5
        </span>
        <span className="hidden text-xs text-slate-400 sm:inline">
          Web · Vols · Hôtels · Réservations
        </span>

        {/* Panier consultable sans quitter la conversation */}
        <div className="ml-auto text-slate-600">
          <CartDrawer />
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} tripId={tripContext.tripId} />
        ))}
        {loading && <AgentSteps steps={statusSteps} />}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && !loading && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs text-slate-600 transition-colors hover:border-brand-teal hover:text-brand-teal"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Saisie */}
      <div className="border-t border-slate-100 px-5 py-4">
        <ChatCapabilities active={capabilities} onChange={setCapabilities} className="mb-3" />
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-brand-teal/60 focus-within:bg-white">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Ex : réserver une table au Noma pour 2 le 20 avril…"
            disabled={loading}
            className="w-full bg-transparent py-3.5 pl-4 pr-14 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            aria-label="Envoyer"
            className={cn(
              'absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition',
              loading || !input.trim()
                ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                : 'bg-gradient-to-r from-brand-coral to-brand-sun text-white hover:brightness-110',
            )}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
