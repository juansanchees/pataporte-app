import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/store/app';
import { Icon, type IconName } from '@/art/Icon';
import { C, F } from '@/theme';

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

const ITEMS: Record<string, { label: string; icon: IconName }> = {
  inicio: { label: 'Início', icon: 'passport' },
  itinerario: { label: 'Vacinas', icon: 'ticket' },
  guia: { label: 'Guia IA', icon: 'chat' },
  diario: { label: 'Diário', icon: 'camera' },
  vistos: { label: 'Carimbos', icon: 'stamp' },
};

/** Leather bar with gold-foil icons; the active tab becomes a cream "page". */
function LeatherBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.cover, paddingHorizontal: 8, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12), borderTopWidth: 2, borderTopColor: C.goldDark }}>
      {state.routes.map((r, i) => {
        const item = ITEMS[r.name];
        if (!item) return null;
        const on = state.index === i;
        return (
          <Pressable key={r.key} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={item.label}
            onPress={() => { if (!on) navigation.navigate(r.name); }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 54, borderRadius: 12, backgroundColor: on ? C.paper : 'transparent' }}>
            <Icon name={item.icon} size={22} color={on ? C.cover : C.goldLight} sw={on ? 2.3 : 2} />
            <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: F.bodyBold, fontSize: 13, color: on ? C.cover : C.goldLight }} numberOfLines={1} adjustsFontSizeToFit>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const user = useApp((s) => s.user);
  const hasPet = useApp((s) => s.pets.length > 0);
  const booted = useApp((s) => s.booted);
  if (booted && (!user || !hasPet)) return <Redirect href="/" />;
  return (
    <Tabs tabBar={(p) => <LeatherBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.paper } }}>
      <Tabs.Screen name="inicio" />
      <Tabs.Screen name="itinerario" />
      <Tabs.Screen name="guia" />
      <Tabs.Screen name="diario" />
      <Tabs.Screen name="vistos" />
    </Tabs>
  );
}
