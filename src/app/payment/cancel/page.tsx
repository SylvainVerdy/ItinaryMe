"use client";

import Link from 'next/link';
import { ArrowLeft, ShoppingBag, XCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { PrimaryButton, SecondaryButton } from '@/components/layout/PageShell';

export default function PaymentCancelPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <Link href="/" className="mb-10" aria-label="ItinaryMe">
        <Logo />
      </Link>

      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center sm:p-10">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <XCircle size={30} />
        </span>

        <h1 className="mt-6 font-display text-2xl font-bold text-slate-900">Paiement annulé</h1>
        <p className="mt-3 leading-relaxed text-slate-500">
          Votre paiement n&apos;a pas été effectué. Aucun montant n&apos;a été débité et votre
          panier est toujours disponible.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <PrimaryButton href="/dashboard" className="w-full">
            <ShoppingBag size={16} />
            Reprendre ma réservation
          </PrimaryButton>
          <SecondaryButton href="/" className="w-full">
            <ArrowLeft size={16} />
            Retour à l&apos;accueil
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}
