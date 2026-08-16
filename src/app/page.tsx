"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/landing/Hero";
import { Stats } from "@/components/landing/Stats";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { DestinationsShowcase } from "@/components/landing/DestinationsShowcase";
import { Testimonials } from "@/components/landing/Testimonials";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar transparent />

      <main>
        <Hero />
        <Stats />
        <HowItWorks />
        <Features />
        <DestinationsShowcase />
        <Testimonials />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
