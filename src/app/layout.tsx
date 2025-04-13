import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { LanguageProvider } from '@/hooks/useLanguage';
import { Navbar } from '@/components/Navbar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ItinaryMe - Votre Assistant de Voyage Personnel',
  description: 'Planifiez votre voyage idéal avec notre assistant IA personnalisé',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <LanguageProvider>
            {/* Le Navbar n'est pas ajouté ici car la homepage et certaines pages 
                ont leur propre design de navigation. Les pages personnalisées 
                incluront le composant Navbar manuellement. */}
            {children}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
