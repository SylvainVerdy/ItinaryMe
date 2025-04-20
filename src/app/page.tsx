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
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/hooks/useLanguage";
import { Navbar } from "@/components/Navbar";

// Icons (adjust if needed)
import {
  ArrowRightIcon,
  CustomIcon,
  ExpertIcon,
  SeamlessIcon,
} from "@/components/icons";

// Polyfill pour async_hooks requis par OpenTelemetry
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.process = window.process || {};
  // @ts-ignore
  window.process.env = window.process.env || {};
  // @ts-ignore
  window.process.env.GENKIT_TELEMETRY_DISABLED = 'true';
  // @ts-ignore
  window.process.hrtime = () => [0, 0];
  // @ts-ignore
  window.asyncHooks = { createHook: () => ({ enable: () => {}, disable: () => {} }) };
}

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
  // State for the "How long?" field.
  const [durationOption, setDurationOption] = useState("1 week");
  const [customDuration, setCustomDuration] = useState("");
  const { t } = useLanguage();

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background Image */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <Image
          src="/images/background.jpg"
          alt="Background"
          fill
          style={{ objectFit: "cover" }}
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Header with new Navbar */}
      <header className="w-full">
        <Navbar transparent={true} />
      </header>

      {/* Main Content */}
      <main className="flex-grow bg-black/40 pt-20 mt-4">
        <section className="max-w-screen-xl mx-auto px-4">
          <div className="text-center py-16">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {t('personalizedTrip')}
            </h1>
            <p className="text-lg text-gray-200 mb-8 max-w-xl mx-auto">
              {t('personalizedTripDescription')}
            </p>
            {/* Unified container for fields */}
            <div className="flex flex-col md:flex-row w-full max-w-4xl mx-auto rounded-xl overflow-hidden bg-white shadow-md">
              {/* Destination */}
              <Input
                type="text"
                placeholder={t('whereDoYouWantToGo')}
                className="flex-1 h-12 border-0 md:rounded-none focus:ring-0 px-4"
              />

              {/* Start date */}
              <Input
                type="date"
                placeholder={t('date')}
                className="flex-1 h-12 border-0 md:rounded-none focus:ring-0 px-4"
              />

              {/* End date */}
              <Input
                type="date"
                placeholder={t('date')}
                className="flex-1 h-12 border-0 md:rounded-none focus:ring-0 px-4"
              />

              {/* Number of guests */}
              <Input
                type="number"
                min={1}
                placeholder={t('guests')}
                className="flex-1 h-12 border-0 md:rounded-none focus:ring-0 px-4"
              />

              {/* CTA */}
              <Button 
                className="h-12 px-6 bg-teal-500 text-white hover:bg-teal-600 md:rounded-none rounded-b-xl border-0"
                onClick={() => {
                  // Redirect to dashboard if user is logged in, or auth page if not
                  if (user) {
                    router.push('/dashboard');
                  } else {
                    router.push('/auth');
                  }
                }}
              >
                {t('getStarted')}
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
                {t('customizedItineraries')}
              </h3>
              <p className="text-gray-300 mt-2">
                {t('customizedItinerariesDescription')}
              </p>
            </div>
            <div className="text-center">
              <ExpertIcon className="h-12 w-12 text-teal-500 bg-white rounded-full p-2 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white">
                {t('expertPlanning')}
              </h3>
              <p className="text-gray-300 mt-2">
                {t('expertPlanningDescription')}
              </p>
            </div>
            <div className="text-center">
              <SeamlessIcon className="h-12 w-12 text-teal-500 bg-white rounded-full p-2 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white">
                {t('seamlessExperience')}
              </h3>
              <p className="text-gray-300 mt-2">
                {t('seamlessExperienceDescription')}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-20 text-center p-6 text-white bg-black/60">
        <p>{t('footerText')}</p>
      </footer>
    </div>
  );
}
