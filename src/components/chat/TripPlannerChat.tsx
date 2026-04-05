'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Plane, Hotel, Zap, CheckCircle, ExternalLink } from 'lucide-react';
import { TripChatMessage, TripContext } from '@/types/chat-message';
import FlightResultCard from './FlightResultCard';
import HotelResultCard from './HotelResultCard';

interface Props {
  tripContext: TripContext;
}

const SUGGESTIONS = [
  'Meilleurs restaurants à proximité',
  'Trouve-moi des vols depuis Paris',
  'Cherche un hôtel pour mon séjour',
  'Que faire et visiter sur place ?',
  'Conseils pratiques pour ce voyage',
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

function MessageBubble({ msg, tripId }: { msg: TripChatMessage; tripId: string }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-600' : 'bg-gray-100'}`}>
        {isUser ? <User size={15} className="text-white" /> : <Bot size={15} className="text-gray-600" />}
      </div>
      <div className={`flex flex-col gap-3 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser && msg.steps && msg.steps.length > 0 && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-500 flex flex-col gap-1">
            {msg.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <CheckCircle size={11} className="text-green-500 flex-shrink-0" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        )}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isUser ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'}`}>
          {renderText(msg.text)}
        </div>
        {msg.cards?.map((card, ci) => (
          <div key={ci} className="w-full max-w-[600px]">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {card.type === 'flights' && <><Plane size={13} /> {card.results.length} vol{card.results.length > 1 ? 's' : ''} trouvé{card.results.length > 1 ? 's' : ''}</>}
              {card.type === 'hotels' && <><Hotel size={13} /> {card.results.length} hôtel{card.results.length > 1 ? 's' : ''} trouvé{card.results.length > 1 ? 's' : ''}</>}
            </div>
            {card.type === 'flights' && (
              <div className="flex flex-col gap-3">
                {card.results.map((o) => <FlightResultCard key={o.offerId} offer={o} tripId={tripId} />)}
              </div>
            )}
            {card.type === 'hotels' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {card.results.map((o) => <HotelResultCard key={o.rateId} offer={o} tripId={tripId} />)}
              </div>
            )}
          </div>
        ))}
        {!isUser && msg.sources && msg.sources.length > 0 && (
          <div className="w-full max-w-[600px]">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Sources</p>
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
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border transition-colors max-w-[240px] truncate ${
                      isBooking
                        ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 font-medium'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300'
                    }`}
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
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={15} className="text-gray-600" />
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-[85%]">
        <div className="flex flex-col gap-1.5">
          {steps.map((step, i) => {
            const isCurrent = i === steps.length - 1;
            return (
              <div key={i} className={`flex items-center gap-2 text-sm transition-all ${isCurrent ? 'text-gray-700' : 'text-gray-400'}`}>
                {isCurrent
                  ? <Loader2 size={12} className="animate-spin text-blue-500 flex-shrink-0" />
                  : <span className="text-green-500 flex-shrink-0 text-xs">✓</span>
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
    text: `Bonjour ! Je suis votre assistant IA pour **${tripContext.destination}** (${new Date(tripContext.startDate + 'T12:00:00').toLocaleDateString('fr-FR')} – ${new Date(tripContext.endDate + 'T12:00:00').toLocaleDateString('fr-FR')}, ${tripContext.travelers} pers.).\n\nJe peux **rechercher sur le web**, chercher des **vols et hôtels** en temps réel. Que souhaitez-vous ?`,
    createdAt: new Date(),
  };

  const [messages, setMessages]     = useState<TripChatMessage[]>([welcome]);
  const [input, setInput]           = useState('');
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
        body: JSON.stringify({ userMessage: trimmed, tripContext, history }),
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
    <div className="flex flex-col" style={{ height: '560px' }}>
      {/* Agent badge */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 border border-purple-100 rounded-full px-2.5 py-1">
          <Zap size={11} />
          Agent IA · Qwen3.5 · Web + Vols + Hôtels
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1" style={{ minHeight: 0 }}>
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} tripId={tripContext.tripId} />
        ))}
        {loading && <AgentSteps steps={statusSteps} />}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && !loading && (
        <div className="flex flex-wrap gap-2 py-3 border-t border-gray-100">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => sendMessage(s)}
              className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder="Ex: Meilleurs restaurants à Tokyo près de Shinjuku..."
          disabled={loading}
          className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
        />
        <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
          className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
          {loading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
        </button>
      </div>
    </div>
  );
}
