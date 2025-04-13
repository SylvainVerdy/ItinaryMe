"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { LogoutButton } from './LogoutButton';

export function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="bg-white shadow-md w-full p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/logo/logo.png"
            alt="Logo ItinaryMe"
            width={120}
            height={40}
            className="object-contain"
          />
        </Link>
        
        <div className="hidden md:flex items-center space-x-8">
          <Link href="/destinations" className="text-gray-600 hover:text-blue-600">
            Destinations
          </Link>
          <Link href="/about" className="text-gray-600 hover:text-blue-600">
            À propos
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
              href="/auth" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Se connecter
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
} 