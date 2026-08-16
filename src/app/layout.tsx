import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter, Sora } from 'next/font/google'
import { AuthProvider } from '@/hooks/useAuth'
import { LanguageProvider } from '@/hooks/useLanguage';
import { Toaster } from '@/components/ui/toaster';
import { CartProvider } from '@/context/CartContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://itinaryme.app'),
  title: {
    default: 'ItinaryMe — Votre agent de voyage IA',
    template: '%s · ItinaryMe',
  },
  description:
    "Décrivez votre voyage, notre IA compose l'itinéraire, compare les vols et les hôtels, et vous réservez en un clic.",
  openGraph: {
    title: 'ItinaryMe — Votre agent de voyage IA',
    description:
      "Décrivez votre voyage, notre IA compose l'itinéraire, compare les vols et les hôtels, et vous réservez en un clic.",
    type: 'website',
    siteName: 'ItinaryMe',
  },
}

export const viewport: Viewport = {
  themeColor: '#0b1120',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${sora.variable} font-sans`}>
        <AuthProvider>
          <LanguageProvider>
            <CartProvider>
              {/* Note : Nous ne mettons pas le Navbar ici car certaines pages
                  incluront le composant Navbar manuellement. */}
              {children}
              <Toaster />
            </CartProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
