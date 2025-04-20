'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';

interface DashboardConversationHelperProps {
  className?: string;
}

export const DashboardConversationHelper: React.FC<DashboardConversationHelperProps> = ({ className }) => {
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleStartConversation = () => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    
    // Stocker le message dans localStorage pour le récupérer dans la page de chat
    localStorage.setItem('pendingChatMessage', message);
    
    // Rediriger vers la page de chat
    router.push('/chat');
    
    // La fonction window.initializeConversationWithMessage sera appelée par le composant ChatInterface
  };

  return (
    <div className={`p-4 rounded-lg border border-border/40 bg-background/80 backdrop-blur-sm ${className || ''}`}>
      <h3 className="text-lg font-semibold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
        Démarrer une nouvelle conversation
      </h3>
      
      <p className="text-sm text-muted-foreground mb-4">
        Décrivez votre projet de voyage et l'assistant détectera automatiquement les informations nécessaires.
      </p>
      
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ex: Je souhaite planifier un voyage à Rome avec ma copine du 15 au 20 avril."
        className="min-h-[100px] bg-background/50 border-border/60 focus-visible:ring-primary/30 rounded-lg mb-4"
      />
      
      <Button 
        onClick={handleStartConversation} 
        disabled={isLoading || !message.trim()}
        className="w-full rounded-lg bg-primary hover:bg-primary/90 transition-all duration-200"
      >
        {isLoading ? 'Chargement...' : 'Démarrer la conversation'}
      </Button>
      
      <div className="mt-3 text-xs text-muted-foreground">
        <p>Exemples de ce que vous pouvez demander:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>"Je voudrais organiser un voyage en Italie pour 2 personnes en mai."</li>
          <li>"Planifier un séjour à New York du 10 au 15 août pour ma famille."</li>
          <li>"Je cherche des idées pour un weekend à Paris en couple."</li>
        </ul>
      </div>
    </div>
  );
}; 