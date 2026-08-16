"use client";

import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Loader } from 'lucide-react';

interface LogoutButtonProps {
  className?: string;
  variant?: 'icon' | 'text' | 'minimal';
  onClick?: () => Promise<void>;
}

export function LogoutButton({ 
  className = '',
  variant = 'text',
  onClick
}: LogoutButtonProps) {
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      if (onClick) {
        await onClick();
      } else {
        await signOut();
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className={cn(
          'p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors',
          isLoading && 'opacity-70 cursor-not-allowed',
          className,
        )}
        title={t('logout')}
      >
        {isLoading ? <Loader size={18} className="animate-spin" /> : <LogOut size={18} />}
      </button>
    );
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className={cn(
          'flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors',
          isLoading && 'opacity-70 cursor-not-allowed',
          className,
        )}
        title={t('logout')}
      >
        {isLoading ? (
          <Loader size={14} className="animate-spin" />
        ) : (
          <LogOut size={14} />
        )}
        <span>{t('logout')}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-white border border-slate-200 text-gray-700 hover:bg-slate-50 transition-colors',
        isLoading && 'opacity-70 cursor-not-allowed',
        className,
      )}
    >
      {isLoading ? (
        <Loader size={16} className="animate-spin" />
      ) : (
        <LogOut size={16} />
      )}
      <span>{t('logout')}</span>
    </button>
  );
} 