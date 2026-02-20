import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { API_URL } from '@/utils/config';

/** Configure how notifications are shown when app is in foreground */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request permission and return Expo push token, or null if not granted / not a device.
 */
export async function getExpoPushTokenAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const { status: requested } = await Notifications.requestPermissionsAsync();
    status = requested;
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  return tokenData?.data ?? null;
}

/**
 * Register this device's push token and favorite stores with the backend.
 * Call after user saves favorites, or on app launch when token and favorites exist.
 */
export async function registerPushWithBackend(
  expoPushToken: string,
  favoriteStores: string[]
): Promise<void> {
  const res = await fetch(`${API_URL}/api/push/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expoPushToken, favoriteStores }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Register failed: ${res.status}`);
  }
}

/**
 * Set up listener for notification response (user tapped notification).
 * Call from root layout once. Handler receives the notification; use data.screen to navigate.
 */
export function addNotificationResponseListener(
  onResponse: (data: Record<string, unknown>) => void
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = (response.notification.request.content.data || {}) as Record<string, unknown>;
    onResponse(data);
  });
  return () => sub.remove();
}
