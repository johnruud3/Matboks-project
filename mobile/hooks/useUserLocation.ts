import { useState, useEffect, useCallback } from 'react';
import { Linking, AppState, type AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CITY_KEY = 'user_city';
const PLACE_KEY = 'user_place';
const CITY_TIMESTAMP_KEY = 'user_city_timestamp';
const MANUAL_OVERRIDE_KEY = 'user_location_manual';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

/** Get neighbourhood/suburb from OSM Nominatim (more precise than native for areas like Nøstet) */
async function getPlaceFromNominatim(lat: number, lon: number): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'json',
      addressdetails: '1',
    });
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': 'PrisApp/1.0 (location)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.address;
    if (!addr) return null;
    const neighbourhood = addr.neighbourhood?.trim();
    const suburb = addr.suburb?.trim();
    const cityDistrict = addr.city_district?.trim();
    return neighbourhood || suburb || cityDistrict || null;
  } catch {
    return null;
  }
}

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export function useUserLocation() {
  const [city, setCity] = useState<string | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus | null>(null);
  const [isManualOverride, setIsManualOverride] = useState(false);

  const locationLabel = city
    ? (place?.trim() ? `${city}, ${place.trim()}` : city)
    : null;

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  useEffect(() => {
    loadCity();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        Location.getForegroundPermissionsAsync().then(({ status }) => {
          setPermissionStatus(status as LocationPermissionStatus);
          if (status === 'granted') {
            loadCity();
          }
        });
      }
    });
    return () => sub.remove();
  }, []);

  const loadCity = async () => {
    try {
      const [savedCity, savedPlace, savedTimestamp, savedManual] = await Promise.all([
        AsyncStorage.getItem(CITY_KEY),
        AsyncStorage.getItem(PLACE_KEY),
        AsyncStorage.getItem(CITY_TIMESTAMP_KEY),
        AsyncStorage.getItem(MANUAL_OVERRIDE_KEY),
      ]);

      if (savedCity && savedTimestamp) {
        const age = Date.now() - parseInt(savedTimestamp, 10);
        if (age < CACHE_DURATION_MS) {
          setCity(savedCity);
          setPlace(savedPlace || null);
          setIsManualOverride(savedManual === 'true');
          setPermissionStatus('granted');
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
      setPermissionStatus(status as LocationPermissionStatus);
      if (status !== 'granted') {
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;

      const [geo, nominatimPlace] = await Promise.all([
        Location.reverseGeocodeAsync({ latitude: lat, longitude: lon }).then(([g]) => g),
        getPlaceFromNominatim(lat, lon),
      ]);

      if (geo?.city) {
        const typedGeo = geo as { district?: string | null; subregion?: string | null };
        const district = typedGeo.district?.trim() || null;
        const subregion = typedGeo.subregion?.trim() || null;
        const nativePlace = district || subregion;
        const placeName = nominatimPlace || nativePlace;
        setCity(geo.city);
        setPlace(placeName);
        setIsManualOverride(false);
        await AsyncStorage.setItem(CITY_KEY, geo.city);
        await AsyncStorage.setItem(PLACE_KEY, placeName ?? '');
        await AsyncStorage.setItem(CITY_TIMESTAMP_KEY, Date.now().toString());
        await AsyncStorage.removeItem(MANUAL_OVERRIDE_KEY);
      }
    } catch {
      // GPS unavailable — leave city/place as null
    } finally {
      setLoading(false);
    }
  };

  const setManualLocation = useCallback(async (newCity: string, newPlace?: string) => {
    const placeVal = newPlace?.trim() || null;
    setCity(newCity.trim() || null);
    setPlace(placeVal);
    setIsManualOverride(true);
    await AsyncStorage.setItem(CITY_KEY, newCity.trim() || '');
    await AsyncStorage.setItem(PLACE_KEY, placeVal ?? '');
    await AsyncStorage.setItem(CITY_TIMESTAMP_KEY, Date.now().toString());
    await AsyncStorage.setItem(MANUAL_OVERRIDE_KEY, 'true');
  }, []);

  /** Accepts a single string (e.g. "Bergen, Nøstet") and splits into city + place */
  const setManualCity = useCallback(async (full: string) => {
    const trimmed = full.trim();
    if (!trimmed) {
      setCity(null);
      setPlace(null);
      setIsManualOverride(false);
      await AsyncStorage.multiRemove([CITY_KEY, PLACE_KEY, CITY_TIMESTAMP_KEY, MANUAL_OVERRIDE_KEY]);
      return;
    }
    const commaIdx = trimmed.indexOf(',');
    const cityPart = commaIdx >= 0 ? trimmed.slice(0, commaIdx).trim() : trimmed;
    const placePart = commaIdx >= 0 ? trimmed.slice(commaIdx + 1).trim() : '';
    await setManualLocation(cityPart, placePart || undefined);
  }, [setManualLocation]);

  const refresh = useCallback(async () => {
    await AsyncStorage.multiRemove([CITY_KEY, PLACE_KEY, CITY_TIMESTAMP_KEY, MANUAL_OVERRIDE_KEY]);
    setIsManualOverride(false);
    await detectCity();
  }, []);

  return {
    /** City only (e.g. Bergen) for "By" field */
    city,
    /** District/place (e.g. Nøstet) for "Sted" field */
    place,
    /** Combined for display (e.g. "Bergen, Nøstet") */
    locationLabel,
    loading,
    /** 'denied' = user said no → use openSettings() to let them re-enable */
    permissionStatus,
    /** true = user chose a place manually (e.g. Oslo), not from GPS */
    isManualOverride,
    /** Opens device Settings to this app's page so user can enable location */
    openSettings,
    /** Re-detect from GPS and clear manual override */
    refresh,
    setManualCity,
    setManualLocation,
  };
}
