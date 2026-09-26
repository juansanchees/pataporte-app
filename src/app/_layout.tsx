import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, Nunito_700Bold_Italic } from '@expo-google-fonts/nunito';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { useApp } from '@/store/app';
import { configureNotifications } from '@/services/notifications';
import { StampBurst, StampDateSheet, Toast } from '@/components/overlays';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotifications();

export default function RootLayout() {
  const [loaded] = useFonts({
    DMSerifDisplay_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, Nunito_700Bold_Italic,
    SpaceMono_400Regular, SpaceMono_700Bold,
  });
  const init = useApp((s) => s.init);

  useEffect(() => { init(); }, [init]);
  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.cover }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper }, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="planos" options={{ presentation: 'modal' }} />
        <Stack.Screen name="passaportes" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="emitido" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
      <StampDateSheet />
      <StampBurst />
      <Toast />
    </SafeAreaProvider>
  );
}
