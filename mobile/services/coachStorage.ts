import AsyncStorage from '@react-native-async-storage/async-storage';

const COACH_GOALS_KEY = '@matboks_coach_goals';
const COACH_SEEN_ONBOARDING_KEY = '@matboks_coach_seen_onboarding';
const COACH_ACCESS_KEY = '@matboks_coach_has_access';
const COACH_LOG_PREFIX = '@matboks_coach_log_';
const COACH_SAVED_MEALS_KEY = '@matboks_coach_saved_meals';
const COACH_TIPS_CACHE_KEY = '@matboks_coach_tips_cache';

export type CoachGoalType = 'lose_weight' | 'maintain' | 'gain_weight' | 'build_muscle';

export type CoachGender = 'male' | 'female' | 'other';

export interface CoachGoals {
  goalType: CoachGoalType;
  targetWeightKg?: number;
  timeframeWeeks?: number;
  /** Høyde i cm */
  heightCm?: number;
  /** Nåværende vekt i kg */
  weightKg?: number;
  /** Alder (valgfritt) */
  age?: number;
  /** Kjønn for bedre kaloriestimat (valgfritt) */
  gender?: CoachGender;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface CoachLogEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
  date: string; // YYYY-MM-DD
  createdAt: number;
  source?: 'manual' | 'barcode' | 'photo';
  barcode?: string;
  /** When the user logged this (e.g. Frokost, Middag). */
  mealType?: MealType;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getCoachGoals(): Promise<CoachGoals | null> {
  try {
    const data = await AsyncStorage.getItem(COACH_GOALS_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setCoachGoals(goals: CoachGoals): Promise<void> {
  await AsyncStorage.setItem(COACH_GOALS_KEY, JSON.stringify(goals));
}

export async function getHasSeenOnboarding(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(COACH_SEEN_ONBOARDING_KEY);
    return v === '1';
  } catch {
    return false;
  }
}

export async function setHasSeenOnboarding(): Promise<void> {
  await AsyncStorage.setItem(COACH_SEEN_ONBOARDING_KEY, '1');
}

/** For paywall: true = user has access (e.g. paid). Set to true for testing. */
export async function getHasCoachAccess(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(COACH_ACCESS_KEY);
    return v === '1';
  } catch {
    return false;
  }
}

export async function setHasCoachAccess(hasAccess: boolean): Promise<void> {
  await AsyncStorage.setItem(COACH_ACCESS_KEY, hasAccess ? '1' : '0');
}

export function getTodayKey(): string {
  return todayKey();
}

/** Cached daily tips: one fetch per day. Returns null if cache is missing or stale. */
export async function getTipsCache(): Promise<{ date: string; text: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(COACH_TIPS_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { date?: string; text?: string };
    const date = typeof data.date === 'string' ? data.date : '';
    const text = typeof data.text === 'string' ? data.text : '';
    if (date !== todayKey() || !text) return null;
    return { date, text };
  } catch {
    return null;
  }
}

export async function setTipsCache(text: string): Promise<void> {
  await AsyncStorage.setItem(
    COACH_TIPS_CACHE_KEY,
    JSON.stringify({ date: todayKey(), text })
  );
}

export async function getTodayLog(): Promise<CoachLogEntry[]> {
  return getLogForDate(todayKey());
}

/** Get log entries for a specific date (YYYY-MM-DD). */
export async function getLogForDate(date: string): Promise<CoachLogEntry[]> {
  try {
    const key = COACH_LOG_PREFIX + date;
    const data = await AsyncStorage.getItem(key);
    const list = data ? JSON.parse(data) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Get list of dates that have logged entries, newest first (e.g. last 60 days). */
export async function getAvailableLogDates(): Promise<string[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const prefix = COACH_LOG_PREFIX;
    const dates = allKeys
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort((a, b) => b.localeCompare(a));
    return dates.slice(0, 60);
  } catch {
    return [];
  }
}

export async function addLogEntry(entry: Omit<CoachLogEntry, 'id' | 'date' | 'createdAt'>): Promise<void> {
  const date = todayKey();
  const newEntry: CoachLogEntry = {
    ...entry,
    id: `${date}-${Date.now()}`,
    date,
    createdAt: Date.now(),
  };
  const log = await getTodayLog();
  const key = COACH_LOG_PREFIX + date;
  await AsyncStorage.setItem(key, JSON.stringify([...log, newEntry]));
}

export async function removeLogEntry(id: string): Promise<void> {
  const log = await getTodayLog();
  const next = log.filter((e) => e.id !== id);
  const key = COACH_LOG_PREFIX + todayKey();
  await AsyncStorage.setItem(key, JSON.stringify(next));
}

// —— Lagrede måltider (oppskrifter fra coach) ——

export interface SavedMeal {
  id: string;
  name: string;
  steps: string[];
  /** Estimated kcal (from AI when recipe was saved). */
  calories?: number;
  /** Estimated protein in grams. */
  protein?: number;
  /** Estimated fat in grams. */
  fat?: number;
  createdAt: number;
}

export async function getSavedMeals(): Promise<SavedMeal[]> {
  try {
    const data = await AsyncStorage.getItem(COACH_SAVED_MEALS_KEY);
    const list = data ? JSON.parse(data) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function addSavedMeal(meal: Omit<SavedMeal, 'id' | 'createdAt'>): Promise<SavedMeal> {
  const list = await getSavedMeals();
  const newMeal: SavedMeal = {
    ...meal,
    id: `meal-${Date.now()}`,
    createdAt: Date.now(),
  };
  list.push(newMeal);
  await AsyncStorage.setItem(COACH_SAVED_MEALS_KEY, JSON.stringify(list));
  return newMeal;
}

export async function removeSavedMeal(id: string): Promise<void> {
  const list = await getSavedMeals();
  await AsyncStorage.setItem(COACH_SAVED_MEALS_KEY, JSON.stringify(list.filter((m) => m.id !== id)));
}
