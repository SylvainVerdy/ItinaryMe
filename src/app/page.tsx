"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@/lib/resolvers/zod";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Icons (adjust if needed)
import {
  ArrowRightIcon,
  CustomIcon,
  ExpertIcon,
  SeamlessIcon,
} from "@/components/icons";

type FormData = {
  email: string;
  password: string;
};

const formSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [language, setLanguage] = useState("en");
  // State for the "How long?" field.
  const [durationOption, setDurationOption] = useState("1 week");
  const [customDuration, setCustomDuration] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Simulate language detection.
    const detectedCountry = "US";
    const languageMap: { [key: string]: string } = {
      US: "en",
      GB: "en",
      FR: "fr",
    };
    const detectedLanguage = languageMap[detectedCountry] || "en";
    const savedLanguage = Cookies.get("language");
    if (savedLanguage) {
      setLanguage(savedLanguage);
    } else {
      setLanguage(detectedLanguage);
      Cookies.set("language", detectedLanguage, { expires: 365 });
    }
  }, []);

  const changeLanguage = (newLanguage: string) => {
    setLanguage(newLanguage);
    Cookies.set("language", newLanguage, { expires: 365 });
  };

  const translations = {
    en: {
      destinations: "Destinations",
      howItWorks: "How It Works",
      about: "About",
      signIn: "Sign In",
      personalizedTrip: "Your personalized trip, designed for you",
      personalizedTripDescription:
        "Tailored itineraries to match your unique interests, preferences, and travel style.",
      whereDoYouWantToGo: "Where do you want to go?",
      date: "When?",
      howLong: "How long?",
      getStarted: "Get Started",
      customizedItineraries: "Customized Itineraries",
      customizedItinerariesDescription:
        "Receive a day-by-day itinerary crafted to your interests and preferences.",
      expertPlanning: "Expert Planning",
      expertPlanningDescription:
        "Our travel specialists use their knowledge to create your perfect trip.",
      seamlessExperience: "Seamless Experience",
      seamlessExperienceDescription:
        "Enjoy a hassle-free journey with bookings and details arranged for you.",
      footerText: "© 2023 ItinaryMe. All rights reserved.",
    },
    fr: {
      destinations: "Destinations",
      howItWorks: "Fonctionnement",
      about: "À propos",
      signIn: "Se Connecter",
      personalizedTrip: "Votre voyage personnalisé, conçu pour vous",
      personalizedTripDescription:
        "Des itinéraires adaptés à vos intérêts, vos préférences et votre style de voyage.",
      whereDoYouWantToGo: "Où voulez-vous aller ?",
      date: "Quand ?",
      howLong: "Combien de temps ?",
      getStarted: "Commencer",
      customizedItineraries: "Itinéraires personnalisés",
      customizedItinerariesDescription:
        "Recevez un itinéraire détaillé pour répondre à vos intérêts et préférences.",
      expertPlanning: "Planification experte",
      expertPlanningDescription:
        "Nos spécialistes utilisent leurs connaissances pour concevoir votre voyage parfait.",
      seamlessExperience: "Expérience fluide",
      seamlessExperienceDescription:
        "Profitez d'un voyage sans tracas avec des réservations et des détails gérés pour vous.",
      footerText: "© 2023 ItinaryMe. Tous droits réservés.",
    },
  };

  const t = translations[language as keyof typeof translations];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background Image */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/images/background.jpg"
          alt="Background"
          fill
          style={{ objectFit: "cover" }}
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Header */}
      <header className="relative z-20 w-full">
        <nav className="flex justify-between items-center w-full p-4">
          {/* Logo */}
          <a href="#" className="flex items-center">
            <Image
              src="/images/logo/logo.png"
              alt="Logo ItinaryMe"
              width={120}
              height={40}
              className="object-contain"
            />
          </a>
          {/* Navigation Links */}
          <ul className="flex space-x-6 items-center">
            <li>
              <Link href="/destinations" className="text-white hover:text-gray-200">
                {t.destinations}
              </Link>
            </li>
            <li>
              <Link href="/about" className="text-white hover:text-gray-200">
                {t.about}
              </Link>
            </li>
            <li>
              {user ? (
                <Link href="/dashboard" className="text-white hover:text-gray-200">
                  Dashboard
                </Link>
              ) : (
                <Link href="/auth" className="text-white hover:text-gray-200">
                  {t.signIn}
                </Link>
              )}
            </li>
          </ul>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-20 flex-grow bg-black/40 py-12">
        <section className="max-w-screen-xl mx-auto px-4">
          <div className="text-center py-16">
            <h1 className="text-5xl font-bold text-white mb-6">
              {t.personalizedTrip}
            </h1>
            <p className="text-lg text-gray-200 mb-8 max-w-xl mx-auto">
              {t.personalizedTripDescription}
            </p>
            {/* Unified container for fields */}
            <div className="flex w-full max-w-4xl mx-auto rounded-xl overflow-hidden bg-white shadow-md">
              {/* Destination */}
              <Input
                type="text"
                placeholder={t.whereDoYouWantToGo}
                className="flex-1 h-12 border-0 rounded-none focus:ring-0 px-4"
              />

              {/* Start date */}
              <Input
                type="date"
                placeholder="Start"
                className="flex-1 h-12 border-0 rounded-none focus:ring-0 px-4"
              />

              {/* End date */}
              <Input
                type="date"
                placeholder="End"
                className="flex-1 h-12 border-0 rounded-none focus:ring-0 px-4"
              />

              {/* Number of guests */}
              <Input
                type="number"
                min={1}
                placeholder="Guests"
                className="flex-1 h-12 border-0 rounded-none focus:ring-0 px-4"
              />

              {/* CTA */}
              <Button 
                className="h-12 px-6 bg-teal-500 text-white hover:bg-teal-600 rounded-none border-0"
                onClick={() => {
                  // Redirect to dashboard if user is logged in, or auth page if not
                  if (user) {
                    router.push('/dashboard');
                  } else {
                    router.push('/auth');
                  }
                }}
              >
                {t.getStarted}
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-screen-xl mx-auto px-4 mt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <CustomIcon className="h-12 w-12 text-teal-500 bg-white rounded-full p-2 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white">
                {t.customizedItineraries}
              </h3>
              <p className="text-gray-300 mt-2">
                {t.customizedItinerariesDescription}
              </p>
            </div>

            <div className="text-center">
              <ExpertIcon className="h-12 w-12 text-teal-500 bg-white rounded-full p-2 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white">
                {t.expertPlanning}
              </h3>
              <p className="text-gray-300 mt-2">
                {t.expertPlanningDescription}
              </p>
            </div>

            <div className="text-center">
              <SeamlessIcon className="h-12 w-12 text-teal-500 bg-white rounded-full p-2 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white">
                {t.seamlessExperience}
              </h3>
              <p className="text-gray-300 mt-2">
                {t.seamlessExperienceDescription}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-20 text-center py-6 bg-black/40">
        <div className="flex justify-center space-x-6 mb-4">
          <Link href="/about" className="text-white hover:text-gray-200">
            {t.about}
          </Link>
          <Link href="/destinations" className="text-white hover:text-gray-200">
            {t.destinations}
          </Link>
          <Link href="/contact" className="text-white hover:text-gray-200">
            Contact
          </Link>
        </div>
        <p className="text-gray-300">{t.footerText}</p>
      </footer>
    </div>
  );
}
