import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem } from '@/types';

const CART_KEY = '@pris_appen_cart';

export const addToCart = async (item: Omit<CartItem, 'id' | 'addedAt'>): Promise<CartItem> => {
  try {
    const cart = await getCart();
    
    const existingIndex = cart.findIndex((i) => i.barcode === item.barcode);
    if (existingIndex >= 0) {
      cart[existingIndex] = {
        ...cart[existingIndex],
        ...item,
        addedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
      return cart[existingIndex];
    }
    
    const newItem: CartItem = {
      ...item,
      id: Date.now().toString(),
      addedAt: new Date().toISOString(),
    };
    
    const updatedCart = [newItem, ...cart];
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(updatedCart));
    return newItem;
  } catch (error) {
    console.error('Failed to add to cart:', error);
    throw error;
  }
};

export const removeFromCart = async (barcode: string): Promise<void> => {
  try {
    const cart = await getCart();
    const updatedCart = cart.filter((item) => item.barcode !== barcode);
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(updatedCart));
  } catch (error) {
    console.error('Failed to remove from cart:', error);
    throw error;
  }
};

export const getCart = async (): Promise<CartItem[]> => {
  try {
    const data = await AsyncStorage.getItem(CART_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get cart:', error);
    return [];
  }
};

export const clearCart = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CART_KEY);
  } catch (error) {
    console.error('Failed to clear cart:', error);
    throw error;
  }
};

export const isInCart = async (barcode: string): Promise<boolean> => {
  try {
    const cart = await getCart();
    return cart.some((item) => item.barcode === barcode);
  } catch (error) {
    console.error('Failed to check cart:', error);
    return false;
  }
};
