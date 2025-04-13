"use client";

import { useState, useEffect, createContext, useContext } from 'react';

// Définir les langues prises en charge
export type Language = 'fr' | 'en' | 'es' | 'de' | 'it';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string; // Fonction de traduction simplifiée
}

// Créer un contexte de langue avec des valeurs par défaut
const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  setLanguage: () => {},
  t: (key: string) => key,
});

// Traductions de base (à développer davantage selon les besoins)
const translations: Record<Language, Record<string, string>> = {
  fr: {
    'home': 'Accueil',
    'destinations': 'Destinations',
    'about': 'À propos',
    'contact': 'Contact',
    'login': 'Se connecter',
    'logout': 'Se déconnecter',
    'search': 'Rechercher',
    'personalizedTrip': 'Votre voyage personnalisé, conçu pour vous',
    'personalizedTripDescription': 'Des itinéraires adaptés à vos intérêts, vos préférences et votre style de voyage.',
    'whereDoYouWantToGo': 'Où voulez-vous aller ?',
    'date': 'Quand ?',
    'howLong': 'Combien de temps ?',
    'getStarted': 'Commencer',
    'customizedItineraries': 'Itinéraires personnalisés',
    'customizedItinerariesDescription': 'Recevez un itinéraire détaillé pour répondre à vos intérêts et préférences.',
    'expertPlanning': 'Planification experte',
    'expertPlanningDescription': "Nos spécialistes utilisent leurs connaissances pour concevoir votre voyage parfait.",
    'seamlessExperience': 'Expérience fluide',
    'seamlessExperienceDescription': "Profitez d'un voyage sans tracas avec des réservations et des détails gérés pour vous.",
    'footerText': '© 2023 ItinaryMe. Tous droits réservés.',
    'dashboard': 'Tableau de bord',
    'guests': 'Voyageurs',
    'myTrips': 'Mes voyages',
    // Ajouter d'autres traductions selon les besoins
  },
  en: {
    'home': 'Home',
    'destinations': 'Destinations',
    'about': 'About',
    'contact': 'Contact',
    'login': 'Login',
    'logout': 'Logout',
    'search': 'Search',
    'personalizedTrip': 'Your personalized trip, designed for you',
    'personalizedTripDescription': 'Tailored itineraries to match your unique interests, preferences, and travel style.',
    'whereDoYouWantToGo': 'Where do you want to go?',
    'date': 'When?',
    'howLong': 'How long?',
    'getStarted': 'Get Started',
    'customizedItineraries': 'Customized Itineraries',
    'customizedItinerariesDescription': 'Receive a day-by-day itinerary crafted to your interests and preferences.',
    'expertPlanning': 'Expert Planning',
    'expertPlanningDescription': 'Our travel specialists use their knowledge to create your perfect trip.',
    'seamlessExperience': 'Seamless Experience',
    'seamlessExperienceDescription': 'Enjoy a hassle-free journey with bookings and details arranged for you.',
    'footerText': '© 2023 ItinaryMe. All rights reserved.',
    'dashboard': 'Dashboard',
    'guests': 'Guests',
    'myTrips': 'My trips',
  },
  es: {
    'home': 'Inicio',
    'destinations': 'Destinos',
    'about': 'Acerca de',
    'contact': 'Contacto',
    'login': 'Iniciar sesión',
    'logout': 'Cerrar sesión',
    'search': 'Buscar',
    'personalizedTrip': 'Su viaje personalizado, diseñado para usted',
    'personalizedTripDescription': 'Itinerarios adaptados a sus intereses, preferencias y estilo de viaje.',
    'whereDoYouWantToGo': '¿Dónde quieres ir?',
    'date': '¿Cuándo?',
    'howLong': '¿Cuánto tiempo?',
    'getStarted': 'Comenzar',
    'customizedItineraries': 'Itinerarios personalizados',
    'customizedItinerariesDescription': 'Reciba un itinerario detallado adaptado a sus intereses y preferencias.',
    'expertPlanning': 'Planificación experta',
    'expertPlanningDescription': 'Nuestros especialistas utilizan sus conocimientos para crear su viaje perfecto.',
    'seamlessExperience': 'Experiencia sin problemas',
    'seamlessExperienceDescription': 'Disfrute de un viaje sin complicaciones con reservas y detalles organizados para usted.',
    'footerText': '© 2023 ItinaryMe. Todos los derechos reservados.',
    'dashboard': 'Panel de control',
    'guests': 'Huéspedes',
    'myTrips': 'Mis viajes',
  },
  de: {
    'home': 'Startseite',
    'destinations': 'Reiseziele',
    'about': 'Über uns',
    'contact': 'Kontakt',
    'login': 'Anmelden',
    'logout': 'Abmelden',
    'search': 'Suchen',
    'personalizedTrip': 'Ihre personalisierte Reise, für Sie entworfen',
    'personalizedTripDescription': 'Maßgeschneiderte Reiserouten, die Ihren Interessen, Vorlieben und Reisestil entsprechen.',
    'whereDoYouWantToGo': 'Wohin möchten Sie reisen?',
    'date': 'Wann?',
    'howLong': 'Wie lange?',
    'getStarted': 'Loslegen',
    'customizedItineraries': 'Maßgeschneiderte Reisepläne',
    'customizedItinerariesDescription': 'Erhalten Sie einen detaillierten Reiseplan, der auf Ihre Interessen und Vorlieben zugeschnitten ist.',
    'expertPlanning': 'Expertenplanung',
    'expertPlanningDescription': 'Unsere Reisespezialisten nutzen ihr Wissen, um Ihre perfekte Reise zu gestalten.',
    'seamlessExperience': 'Nahtloses Erlebnis',
    'seamlessExperienceDescription': 'Genießen Sie eine sorgenfreie Reise mit Buchungen und Details, die für Sie arrangiert werden.',
    'footerText': '© 2023 ItinaryMe. Alle Rechte vorbehalten.',
    'dashboard': 'Dashboard',
    'guests': 'Gäste',
    'myTrips': 'Meine Reisen',
  },
  it: {
    'home': 'Home',
    'destinations': 'Destinazioni',
    'about': 'Chi siamo',
    'contact': 'Contatti',
    'login': 'Accedi',
    'logout': 'Esci',
    'search': 'Cerca',
    'personalizedTrip': 'Il tuo viaggio personalizzato, progettato per te',
    'personalizedTripDescription': 'Itinerari su misura per soddisfare i tuoi interessi, preferenze e stile di viaggio.',
    'whereDoYouWantToGo': 'Dove vuoi andare?',
    'date': 'Quando?',
    'howLong': 'Per quanto tempo?',
    'getStarted': 'Iniziare',
    'customizedItineraries': 'Itinerari personalizzati',
    'customizedItinerariesDescription': 'Ricevi un itinerario dettagliato in base ai tuoi interessi e preferenze.',
    'expertPlanning': 'Pianificazione esperta',
    'expertPlanningDescription': 'I nostri specialisti di viaggio utilizzano le loro conoscenze per creare il tuo viaggio perfetto.',
    'seamlessExperience': 'Esperienza senza intoppi',
    'seamlessExperienceDescription': 'Goditi un viaggio senza stress con prenotazioni e dettagli organizzati per te.',
    'footerText': '© 2023 ItinaryMe. Tutti i diritti riservati.',
    'dashboard': 'Dashboard',
    'guests': 'Ospiti',
    'myTrips': 'I miei viaggi',
  },
};

// Provider qui exposera la langue et les fonctions de traduction
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('fr');
  
  // Détecter la langue du navigateur ou à partir de l'API de géolocalisation
  useEffect(() => {
    async function detectLanguage() {
      try {
        // Appel à une API de géolocalisation (ici on utilise ipapi.co comme exemple)
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        // Mapper le code pays vers une langue prise en charge
        const countryToLang: Record<string, Language> = {
          'FR': 'fr',
          'CA': 'fr', // Canada peut être français ou anglais, on suppose français ici
          'BE': 'fr', // Belgique peut avoir plusieurs langues, on suppose français
          'CH': 'fr', // Suisse peut avoir plusieurs langues, on suppose français
          'US': 'en',
          'GB': 'en',
          'AU': 'en',
          'ES': 'es',
          'MX': 'es',
          'AR': 'es',
          'DE': 'de',
          'AT': 'de',
          'IT': 'it',
          // Ajouter d'autres mappages pays-langue selon les besoins
        };
        
        // Si le pays est reconnu, utiliser la langue correspondante, sinon le français par défaut
        if (data.country_code && countryToLang[data.country_code]) {
          setLanguage(countryToLang[data.country_code]);
        } else {
          // Utiliser la langue du navigateur comme fallback
          const browserLang = navigator.language.split('-')[0];
          if (browserLang === 'fr' || browserLang === 'en' || browserLang === 'es' || browserLang === 'de' || browserLang === 'it') {
            setLanguage(browserLang as Language);
          }
          // Si aucune correspondance, garder le français par défaut
        }
      } catch (error) {
        console.error('Erreur lors de la détection de la langue:', error);
        // Utiliser le français par défaut en cas d'erreur
      }
    }
    
    detectLanguage();
  }, []);
  
  // Fonction simple de traduction
  const t = (key: string): string => {
    return translations[language][key] || key;
  };
  
  const value = {
    language,
    setLanguage,
    t
  };
  
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook personnalisé pour utiliser le contexte de langue
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage doit être utilisé à l'intérieur d'un LanguageProvider");
  }
  return context;
} 