"use client";

import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className = '' }: LogoutButtonProps) {
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
    >
      {isLoading ? (t('logout') + '...') : t('logout')}
    </button>
  );
} 