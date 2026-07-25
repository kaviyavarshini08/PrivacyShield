import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { MD3DarkTheme, PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';

const queryClient = new QueryClient();

// Cyber dark theme values
const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#3b82f6', // Cyber Blue
    secondary: '#10b981', // Emerald
    background: '#020617', // Slate 950
    surface: '#0f172a', // Slate 900
    error: '#ef4444', // Red
  },
};

export default function RootLayout() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="upload" />
            <Stack.Screen name="chat" />
          </Stack>
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
