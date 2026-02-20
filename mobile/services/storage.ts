import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScanHistoryItem, PriceEvaluation } from '@/types';

const HISTORY_KEY = '@pris_appen_history';
const FAVORITE_STORES_KEY = '@pris_appen_favorite_stores';
const MAX_HISTORY_ITEMS = 100;

export const saveToHistory = async (
  evaluation: PriceEvaluation
): Promise<void> => {
  try {
    const history = await getHistory();
    const newItem: ScanHistoryItem = {
      ...evaluation,
      id: Date.now().toString(),
    };
    
    const updatedHistory = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Failed to save to history:', error);
  }
};

export const getHistory = async (): Promise<ScanHistoryItem[]> => {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get history:', error);
    return [];
  }
};

export const clearHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
};

/** Favorite stores for push notifications (store names, e.g. "KIWI", "Rema 1000") */
export const getFavoriteStores = async (): Promise<string[]> => {
  try {
    const data = await AsyncStorage.getItem(FAVORITE_STORES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get favorite stores:', error);
    return [];
  }
};

export const setFavoriteStores = async (stores: string[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(FAVORITE_STORES_KEY, JSON.stringify(stores));
  } catch (error) {
    console.error('Failed to set favorite stores:', error);
  }
};
