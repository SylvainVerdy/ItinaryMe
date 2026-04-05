"use client";

import { XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-[#f8f5ec] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#e6e0d4] p-8 text-center">
        <div className="flex justify-center mb-4">
          <XCircle className="w-14 h-14 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Paiement annulé</h1>
        <p className="text-gray-500 text-sm mb-6">
          Votre paiement n&apos;a pas été effectué. Votre panier est toujours disponible.
        </p>
        <Button
          variant="outline"
          className="w-full border-[#e6e0d4] text-gray-700 font-semibold py-5 rounded-xl"
          onClick={() => (window.location.href = '/dashboard')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au tableau de bord
        </Button>
      </div>
    </div>
  );
}
