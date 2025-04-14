import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/hooks/useAuth'
import { LanguageProvider } from '@/hooks/useLanguage';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ItinaryMe',
  description: 'Planifiez vos voyages avec ItinaryMe',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} font-sans`}>
        <AuthProvider>
          <LanguageProvider>
              {/* Note : Nous ne mettons pas le Navbar ici car certaines pages 
                  incluront le composant Navbar manuellement. */}
              {children}
              <Toaster />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
