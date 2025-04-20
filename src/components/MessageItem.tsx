import React from 'react';
import { formatRelative } from 'date-fns';
import { fr } from 'date-fns/locale';
import { User, Bot, Search, ExternalLink, Copy, LinkIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Trip } from '@/lib/types';

export interface MessageProps {
  message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
    webSearchUsed?: boolean;
    webSources?: Array<{ name: string; url: string }>;
    isLoading?: boolean;
    linkedToTrip?: boolean;
  };
  isLast?: boolean;
  onLinkToTrip?: () => void;
  tripData?: Trip | null;
  currentTravelId?: string;
}

export const MessageItem: React.FC<MessageProps> = ({ 
  message, 
  isLast, 
  onLinkToTrip,
  tripData,
  currentTravelId
}) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isAssistant = message.role === 'assistant';

  // Fonction pour formater la date relative en français
  const formatTimestamp = (date?: Date) => {
    if (!date) return '';
    return formatRelative(date, new Date(), { locale: fr });
  };

  // Fonction pour copier du texte dans le presse-papiers
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Message système (informations, recherche en cours, etc.)
  if (isSystem) {
    return (
      <div className="flex justify-center my-2 animate-fade-in">
        <div className="inline-flex items-center bg-gray-100/80 text-gray-700 px-3 py-1.5 rounded-full text-sm">
          {message.isLoading && <Search className="w-3.5 h-3.5 mr-1.5 animate-pulse" />}
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${
        isUser ? 'justify-end' : 'justify-start'
      } mb-4 group relative`}
    >
      <div
        className={`flex items-start max-w-[85%] lg:max-w-[75%] ${
          isUser
            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl rounded-tr-sm'
            : 'bg-white border border-gray-200 rounded-2xl rounded-tl-sm'
        } p-3 shadow-sm`}
      >
        <div className="flex-shrink-0 mr-2 mt-0.5">
          {isUser ? (
            <div className="bg-blue-700 w-8 h-8 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-blue-100" />
            </div>
          ) : (
            <div className="bg-green-100 w-8 h-8 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-green-600" />
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="flex justify-between items-start mb-1">
            <div className="font-medium text-sm">
              {isUser ? 'Vous' : 'Assistant'}
              {message.webSearchUsed && (
                <span className="ml-2 inline-flex items-center text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                  <Search className="w-3 h-3 mr-0.5" /> Recherche web
                </span>
              )}
              {message.linkedToTrip && (
                <span className="ml-2 inline-flex items-center text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                  <LinkIcon className="w-3 h-3 mr-0.5" /> Lié au voyage
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
              {formatTimestamp(message.timestamp)}
            </div>
          </div>
          
          <div className={`prose prose-sm ${isUser ? 'prose-invert' : ''} max-w-none break-words`}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
          
          {/* Afficher les sources si disponibles */}
          {isAssistant && message.webSources && message.webSources.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="text-xs font-medium text-gray-500 mb-1.5">Sources:</div>
              <div className="flex flex-wrap gap-2">
                {message.webSources.slice(0, 3).map((source, index) => (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    {source.name.length > 30
                      ? source.name.substring(0, 30) + '...'
                      : source.name}
                  </a>
                ))}
                {message.webSources.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{message.webSources.length - 3} autres
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col ml-2">
        {/* Bouton de copie */}
        <button
          onClick={() => copyToClipboard(message.content)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 mb-1"
          title="Copier le message"
        >
          <Copy className="w-4 h-4 text-gray-400" />
        </button>
          
          {/* Bouton pour lier le message à un voyage */}
          {isUser && onLinkToTrip && currentTravelId && !message.linkedToTrip && (
            <button
              onClick={onLinkToTrip}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100"
              title={tripData ? `Ajouter comme note au voyage: ${tripData.destination}` : "Lier au voyage sélectionné"}
            >
              <LinkIcon className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}; 