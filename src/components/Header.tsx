"use client";

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LogoutButton } from './LogoutButton';

export function Header() {
  const { user } = useAuth();

  return (
    <header className="w-full p-4 bg-white shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-gray-800">
          ItinaryMe
        </Link>
        <div className="hidden md:flex items-center space-x-8">
          <Link href="/about" className="text-gray-600 hover:text-blue-600">
            À propos
          </Link>
          <Link href="/destinations" className="text-gray-600 hover:text-blue-600">
            Destinations
          </Link>
          {user && (
            <Link href="/dashboard" className="text-gray-600 hover:text-blue-600">
              Mes voyages
            </Link>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <span className="text-sm text-gray-600 hidden md:inline">
                {user.email}
              </span>
              <Link 
                href="/dashboard" 
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Dashboard
              </Link>
              <LogoutButton className="text-sm px-3 py-1" />
            </>
          ) : (
            <Link 
              href="/login" 
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Connexion
            </Link>
          )}
        </div>
      </div>
    </header>
  );
} 