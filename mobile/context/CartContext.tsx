import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { CartItem } from '@/types';
import * as cartStorage from '@/services/cartStorage';

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  addToCart: (item: Omit<CartItem, 'id' | 'addedAt'>) => Promise<void>;
  removeFromCart: (barcode: string) => Promise<void>;
  clearCart: () => Promise<void>;
  isInCart: (barcode: string) => boolean;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const refreshCart = useCallback(async () => {
    const items = await cartStorage.getCart();
    setCart(items);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => refreshCart(), 400);
    return () => clearTimeout(t);
  }, [refreshCart]);

  const addToCart = useCallback(async (item: Omit<CartItem, 'id' | 'addedAt'>) => {
    await cartStorage.addToCart(item);
    await refreshCart();
  }, [refreshCart]);

  const removeFromCart = useCallback(async (barcode: string) => {
    await cartStorage.removeFromCart(barcode);
    await refreshCart();
  }, [refreshCart]);

  const clearCart = useCallback(async () => {
    await cartStorage.clearCart();
    setCart([]);
  }, []);

  const isInCart = useCallback((barcode: string) => {
    return cart.some((item) => item.barcode === barcode);
  }, [cart]);

  const value: CartContextType = {
    cart,
    cartCount: cart.length,
    addToCart,
    removeFromCart,
    clearCart,
    isInCart,
    refreshCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
