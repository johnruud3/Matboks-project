import { Stack } from 'expo-router';
import { colors } from '@/utils/theme';
import { CartProvider } from '@/context/CartContext';

export default function RootLayout() {
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
      </Stack>
    </CartProvider>
  );
}
