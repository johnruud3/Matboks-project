import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { colors } from '@/utils/theme';
import { CartProvider } from '@/context/CartContext';
import {
  addNotificationResponseListener,
  getExpoPushTokenAsync,
  registerPushWithBackend,
} from '@/services/pushNotifications';
import { getFavoriteStores } from '@/services/storage';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = addNotificationResponseListener((data) => {
      if (data?.screen === 'favorite-deals') {
        router.push('/favorite-deals');
      }
    });
    return unsubscribe;
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getExpoPushTokenAsync();
      if (cancelled || !token) return;
      const favorites = await getFavoriteStores();
      if (favorites.length === 0) return;
      try {
        await registerPushWithBackend(token, favorites);
      } catch (_) {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <CartProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: colors.white,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: colors.deepBg,
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Pris-Appen',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="scanner"
          options={{
            title: 'Skann strekkode',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="result"
          options={{
            title: 'Prisvurdering',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="community"
          options={{
            title: 'Fellesskapspriser',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="product-detail"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="receipt-scanner"
          options={{
            title: 'Skann kvittering',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="cart"
          options={{
            title: 'Handleliste',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="favorite-deals"
          options={{
            title: 'Tilbud fra favorittbutikker',
            headerShown: false,
          }}
        />
      </Stack>
    </CartProvider>
  );
}
