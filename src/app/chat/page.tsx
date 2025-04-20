'use client';

import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ChatPage() {
  const searchParams = useSearchParams();
  const initialMessage = searchParams.get('message');
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // Détecter si la fonction est disponible et l'appeler avec le message initial
    if (initialMessage && typeof window !== 'undefined') {
      // Attendre que le composant soit entièrement monté
      setTimeout(() => {
        // @ts-ignore
        if (window.initializeConversationWithMessage) {
          // @ts-ignore
          window.initializeConversationWithMessage(initialMessage);
        } else {
          console.warn("La fonction initializeConversationWithMessage n'est pas disponible");
          
          // Fallback: stocker le message dans localStorage
          localStorage.setItem('pendingChatMessage', initialMessage);
        }
        setIsLoaded(true);
      }, 500);
    } else {
      setIsLoaded(true);
    }
  }, [initialMessage]);
  
  if (!isLoaded && initialMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f5ec]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return <ChatInterface />;
} 