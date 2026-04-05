'use client';

import { Hotel, Star, ShoppingCart, CheckCircle, RefreshCcw } from 'lucide-react';
import { StayOffer } from '@/services/duffel-stays';
import { useCart } from '@/context/CartContext';
import { useState } from 'react';

interface Props {
  offer: StayOffer;
  tripId: string;
}

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={11}
          className={i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}
        />
      ))}
    </div>
  );
}

export default function HotelResultCard({ offer, tripId }: Props) {
  const { addItem, items } = useCart();
  const [added, setAdded] = useState(false);

  const alreadyInCart = items.some((i) => i.id === offer.rateId);

  const handleAdd = () => {
    if (alreadyInCart || added) return;
    addItem({
      id: offer.rateId,
      type: 'hotel',
      name: offer.hotelName,
      price: offer.price,
      currency: offer.currency,
      location: offer.address,
      tripId,
      rateId: offer.rateId,
      checkIn: offer.checkInDate,
      checkOut: offer.checkOutDate,
      nights: offer.nights,
      image: offer.photoUrl,
    });
    setAdded(true);
  };

  const isAdded = alreadyInCart || added;
  const pricePerNight = offer.nights > 0 ? Math.round(offer.price / offer.nights) : offer.price;

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Photo */}
      {offer.photoUrl ? (
        <img src={offer.photoUrl} alt={offer.hotelName} className="w-full h-28 object-cover" />
      ) : (
        <div className="w-full h-28 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
          <Hotel size={28} className="text-purple-300" />
        </div>
      )}

      <div className="p-3">
        {/* Name + stars */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="font-medium text-sm text-gray-900 leading-tight line-clamp-2">{offer.hotelName}</div>
        </div>
        <StarRating rating={offer.starRating} />

        {/* Room + board */}
        <div className="mt-1 text-xs text-gray-500 line-clamp-1">{offer.roomName}</div>
        <div className="text-xs text-gray-400">
          {offer.boardType} · {offer.nights} nuit{offer.nights > 1 ? 's' : ''}
          {offer.refundable && (
            <span className="ml-1 text-green-600 flex items-center gap-0.5 inline-flex">
              <RefreshCcw size={10} /> Remboursable
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mt-2 flex items-end justify-between">
          <div>
            <div className="text-base font-bold text-gray-900">
              {pricePerNight.toLocaleString('fr-FR')} {offer.currency}
              <span className="text-xs font-normal text-gray-400">/nuit</span>
            </div>
            <div className="text-xs text-gray-400">
              Total: {offer.price.toLocaleString('fr-FR')} {offer.currency}
            </div>
          </div>
        </div>

        {/* Add to cart */}
        <button
          onClick={handleAdd}
          disabled={isAdded}
          className={`mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors ${
            isAdded
              ? 'bg-green-50 text-green-700 cursor-default'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isAdded ? (
            <><CheckCircle size={13} /> Ajouté au panier</>
          ) : (
            <><ShoppingCart size={13} /> Ajouter au panier</>
          )}
        </button>
      </div>
    </div>
  );
}
