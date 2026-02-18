import { Stack } from 'expo-router';
import { colors } from '@/utils/theme';

export default function RootLayout() {
  return (
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
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: 'Historikk',
          headerShown: true,
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
    </Stack>
  );
}
