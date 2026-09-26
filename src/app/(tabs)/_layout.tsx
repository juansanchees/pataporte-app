import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, Text, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/store/app';
import { HomeIcon, type HomeIconName } from '@/art/icons-home';
import { C, F } from '@/theme';

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Abas visíveis, nesta ordem. "vistos" continua existindo como rota, mas fora da barra. */
const ITEMS: Record<string, { label: string; icon: HomeIconName }> = {
  inicio: { label: 'Início', icon: 'home' },
  itinerario: { label: 'Agenda', icon: 'agenda' },
  diario: { label: 'Diário', icon: 'diary' },
  guia: { label: 'Guia IA', icon: 'guide' },
};

/** Barra flutuante em pílula (Home-Final): fundo tinta, 64px, 16px acima da borda; aba ativa = pílula dourada com texto. */
const BAR_HEIGHT = 64;
const BAR_GAP = 16;

function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return open;
}

function PillBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardOpen();
  if (keyboard) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: BAR_GAP + insets.bottom, alignItems: 'center' }}>
      <View accessibilityRole="tablist"
        style={{ width: '100%', maxWidth: 430, paddingHorizontal: 20 }}>
        <View style={{ height: BAR_HEIGHT, borderRadius: 32, backgroundColor: C.cover, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, shadowColor: C.cover, shadowOpacity: 0.28, shadowRadius: 13, shadowOffset: { width: 0, height: 10 }, elevation: 10 }}>
          {state.routes.map((r, i) => {
            const item = ITEMS[r.name];
            if (!item) return null;
            const on = state.index === i;
            const press = () => {
              const ev = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
              if (!on && !ev.defaultPrevented) navigation.navigate(r.name, r.params);
            };
            return (
              <Pressable key={r.key} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={item.label} onPress={press}
                style={({ pressed }) => ({
                  height: 48, minWidth: 56, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  paddingLeft: on ? 14 : 0, paddingRight: on ? 18 : 0,
                  backgroundColor: on ? C.gold : pressed ? 'rgba(246,238,220,0.12)' : 'transparent',
                  flexShrink: on ? 0 : 1,
                })}>
                <HomeIcon name={item.icon} size={on ? 22 : 24} color={on ? C.cover : C.paper} sw={on ? 2.2 : 2} />
                {on ? <Text maxFontSizeMultiplier={1.1} numberOfLines={1} style={{ fontFamily: F.bodyXBold, fontSize: 15, color: C.cover }}>{item.label}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const user = useApp((s) => s.user);
  const hasPet = useApp((s) => s.pets.length > 0);
  const booted = useApp((s) => s.booted);
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardOpen();
  if (booted && (!user || !hasPet)) return <Redirect href="/" />;
  // espaço reservado embaixo de TODAS as abas para o conteúdo não ficar atrás da barra flutuante
  const pad = keyboard ? 0 : BAR_HEIGHT + BAR_GAP + insets.bottom + 8;
  return (
    <Tabs tabBar={(p) => <PillBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.paper, paddingBottom: pad } }}>
      <Tabs.Screen name="inicio" />
      <Tabs.Screen name="itinerario" />
      <Tabs.Screen name="diario" />
      <Tabs.Screen name="guia" />
      <Tabs.Screen name="vistos" options={{ href: null }} />
    </Tabs>
  );
}
