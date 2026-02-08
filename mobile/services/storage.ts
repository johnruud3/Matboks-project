import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScanHistoryItem, PriceEvaluation } from '@/types';

const HISTORY_KEY = '@pris_appen_history';
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
