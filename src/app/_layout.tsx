import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, Nunito_700Bold_Italic } from '@expo-google-fonts/nunito';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { useApp } from '@/store/app';
import { configureNotifications, registerNotificationHandler, type NotificationActionEvent } from '@/services/notifications';
import { identify, track } from '@/services/analytics';
import { StampBurst, StampDateSheet, Toast } from '@/components/overlays';
import { IntroRevealHost } from '@/components/v11/home/IntroReveal';
import { PendingPaywallHost } from '@/components/v11/premium/PendingPaywall';
import { doseRoute } from '@/components/v11/home/routes';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotifications();

const FIRST_OPEN_KEY = 'pataporte.first_open';

/** Toques nas notificações: "Dei"/"Adiar" a store resolve sozinha; o resto vira navegação. */
async function onNotification(e: NotificationActionEvent) {
  if (e.action === 'dei' || e.action === 'adiar15') return;
  const d = e.data;
  // tocou na notificação de remédio → tela da dose (marcar / já tinha dado / pular)
  if (d && (d.kind === 'dose' || d.kind === 'lembrete')) {
    const s = useApp.getState();
    if (d.petId && d.petId !== s.activePetId && s.pets.some((p) => p.id === d.petId)) await s.setActivePet(d.petId);
    if (d.kind === 'dose') {
      const [h, m] = d.time.split(':').map(Number);
      const [y, mo, dd] = d.day.split('-').map(Number);
      const at = new Date(y, (mo ?? 1) - 1, dd ?? 1, h || 0, m || 0).toISOString();
      router.push(doseRoute(d.reminderId, at) as never);
      return;
    }
    router.push('/inicio');
    return;
  }
  const r = await useApp.getState().handleNotificationAction(e); // troca o pet ativo se precisar
  if (r.route) router.push(r.route as never);
}

export default function RootLayout() {
  const [loaded] = useFonts({
    DMSerifDisplay_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, Nunito_700Bold_Italic,
    SpaceMono_400Regular, SpaceMono_700Bold,
  });
  const init = useApp((s) => s.init);
  const uid = useApp((s) => s.user?.uid ?? null);

  useEffect(() => { init(); }, [init]);
  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);

  // métricas: first_open (1 vez por aparelho) e identify(uid) quando entra na conta
  useEffect(() => {
    AsyncStorage.getItem(FIRST_OPEN_KEY).then((v) => {
      if (v) return;
      track('first_open');
      return AsyncStorage.setItem(FIRST_OPEN_KEY, new Date().toISOString());
    }).catch(() => {});
  }, []);
  useEffect(() => { if (uid) identify(uid); }, [uid]);

  // navegação a partir das notificações (só depois que os dados carregaram)
  const booted = useApp((s) => s.booted);
  useEffect(() => {
    if (!booted || !loaded) return;
    return registerNotificationHandler((e) => onNotification(e));
  }, [booted, loaded]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.paper }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper }, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        {/* folhas que sobem de baixo com fundo escurecido: a tela de trás continua visível */}
        <Stack.Screen name="planos" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="planos-comparar" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="lembrete/novo" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="lembrete/dose" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="passaportes" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="emitido" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
      <IntroRevealHost />
      <PendingPaywallHost />
      <StampDateSheet />
      <StampBurst />
      <Toast />
    </SafeAreaProvider>
  );
}
