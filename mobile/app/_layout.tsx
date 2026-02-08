import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Pris-Appen',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="scanner" 
        options={{ 
          title: 'Skann strekkode',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="result" 
        options={{ 
          title: 'Prisvurdering',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="history" 
        options={{ 
          title: 'Historikk',
          headerShown: true 
        }} 
      />
    </Stack>
  );
}
