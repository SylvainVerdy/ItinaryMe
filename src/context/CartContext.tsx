"use client";

import { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { CartItem, CartState } from '@/types/cart';

type CartAction =
  | { type: 'ADD_ITEM'; item: CartItem }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD'; state: CartState };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const exists = state.items.find((i) => i.id === action.item.id);
      if (exists) return state;
      return { ...state, items: [...state.items, action.item], tripId: action.item.tripId };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case 'CLEAR_CART':
      return { items: [], tripId: null };
    case 'LOAD':
      return action.state;
    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  tripId: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'itinaryme_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], tripId: null });

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) dispatch({ type: 'LOAD', state: JSON.parse(stored) });
    } catch {}
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const total = state.items.reduce((sum, item) => sum + item.price, 0);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        tripId: state.tripId,
        addItem: (item) => dispatch({ type: 'ADD_ITEM', item }),
        removeItem: (id) => dispatch({ type: 'REMOVE_ITEM', id }),
        clearCart: () => dispatch({ type: 'CLEAR_CART' }),
        total,
        itemCount: state.items.length,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
