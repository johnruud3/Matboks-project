import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CITY_KEY = 'user_city';
const CITY_TIMESTAMP_KEY = 'user_city_timestamp';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useUserLocation() {
  const [city, setCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCity();
  }, []);

  const loadCity = async () => {
    try {
      const [savedCity, savedTimestamp] = await Promise.all([
        AsyncStorage.getItem(CITY_KEY),
        AsyncStorage.getItem(CITY_TIMESTAMP_KEY),
      ]);

      if (savedCity && savedTimestamp) {
        const age = Date.now() - parseInt(savedTimestamp, 10);
        if (age < CACHE_DURATION_MS) {
          setCity(savedCity);
          setLoading(false);
          return;
        }
      }

      await detectCity();
    } catch {
      setLoading(false);
    }
  };

  const detectCity = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });

      const [geo] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geo?.city) {
        setCity(geo.city);
        await AsyncStorage.setItem(CITY_KEY, geo.city);
        await AsyncStorage.setItem(CITY_TIMESTAMP_KEY, Date.now().toString());
      }
    } catch {
      // GPS unavailable — leave city as null
    } finally {
      setLoading(false);
    }
  };

  const setManualCity = useCallback(async (newCity: string) => {
    setCity(newCity);
    await AsyncStorage.setItem(CITY_KEY, newCity);
    await AsyncStorage.setItem(CITY_TIMESTAMP_KEY, Date.now().toString());
  }, []);

  const refresh = useCallback(async () => {
    await AsyncStorage.multiRemove([CITY_KEY, CITY_TIMESTAMP_KEY]);
    await detectCity();
  }, []);

  return { city, loading, refresh, setManualCity };
}
