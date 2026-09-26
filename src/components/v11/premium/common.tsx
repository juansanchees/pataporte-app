import React, { useState } from 'react';
import { Linking, Pressable, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/store/app';
import { MAX_SCALE, T } from '@/components/ui';
import { PIcon, PlaneSolid } from '@/art/icons-premium';
import type { SeasonLevelId } from '@/domain/gamification';
import { C, F } from '@/theme';

export const PRIVACY_URL = 'https://pataporte-app.web.app/privacidade';

/** 1240 → "1.240" */
export function fmtMiles(n: number): string {
  // sem toLocaleString: o Hermes nem sempre tem os dados de localidade
  const v = Math.round(n);
  return `${v < 0 ? '-' : ''}${String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace(useApp.getState().pets.length ? '/inicio' : '/');
}

// ------------------------------------------------------------------ barra do topo (mockups Milhas, Mapa, Loja, Ranking)
export function TopBar({ title, right, onBack }: { title: string; right?: React.ReactNode; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={onBack ?? goBack} hitSlop={4}
        style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: C.sheet, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1, shadowColor: C.cover, shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 })}>
        <PIcon name="back" size={22} sw={2.4} />
      </Pressable>
      <T v="serif" accessibilityRole="header" numberOfLines={1} style={{ flex: 1, fontSize: 25, lineHeight: 31, color: C.cover }}>{title}</T>
      {right}
    </View>
  );
}

/** Pílula lilás "1.240 milhas" (saldo gastável). */
export function BalancePill({ balance }: { balance: number }) {
  return (
    <View accessibilityLabel={`Saldo: ${fmtMiles(balance)} milhas`} style={{ minHeight: 34, borderRadius: 17, backgroundColor: C.purplePale, paddingLeft: 9, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <PlaneSolid size={16} color={C.purple} />
      <T v="xbold" style={{ fontSize: 15, color: C.purpleInk }} numberOfLines={1}>{`${fmtMiles(balance)} milhas`}</T>
    </View>
  );
}

// ------------------------------------------------------------------ níveis da temporada
export const LEVEL_TONE: Record<SeasonLevelId, { bg: string; fg: string; ring: string }> = {
  bronze: { bg: '#F1DCCB', fg: '#8A4B24', ring: '#C99A74' },
  prata: { bg: '#E7E9EC', fg: '#4A5361', ring: '#9AA3AF' },
  ouro: { bg: C.goldPale, fg: C.goldDark, ring: C.gold },
  diamante: { bg: '#DDEFF6', fg: '#1D5E78', ring: '#6FB3CC' },
};

export function LevelTag({ level, name }: { level: SeasonLevelId; name: string }) {
  const t = LEVEL_TONE[level];
  return (
    <View style={{ minHeight: 24, borderRadius: 12, backgroundColor: t.bg, paddingHorizontal: 8, justifyContent: 'center' }}>
      <T v="monoBold" style={{ fontSize: 12, letterSpacing: 0.5, color: t.fg }}>{name.toUpperCase()}</T>
    </View>
  );
}

// ------------------------------------------------------------------ links legais do paywall
export function LegalLinks({ onRestore, restoring }: { onRestore: () => void; restoring?: boolean }) {
  const link = (label: string, onPress: () => void) => (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} style={{ minHeight: 48, paddingHorizontal: 8, justifyContent: 'center' }}>
      <T v="xbold" style={{ fontSize: 15, color: C.inkSoft, textDecorationLine: 'underline' }}>{label}</T>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
      {link(restoring ? 'Restaurando…' : 'Restaurar compra', onRestore)}
      <T style={{ color: C.inkSoft }} accessibilityElementsHidden importantForAccessibility="no">·</T>
      {link('Termos', () => router.push('/termos' as never))}
      <T style={{ color: C.inkSoft }} accessibilityElementsHidden importantForAccessibility="no">·</T>
      {link('Privacidade', () => { Linking.openURL(PRIVACY_URL).catch(() => {}); })}
    </View>
  );
}

// ------------------------------------------------------------------ "Sua cidade" (ranking por cidade; texto, sem GPS)
export function CityField({ style, onSaved, compact }: { style?: StyleProp<ViewStyle>; onSaved?: (city: string) => void; compact?: boolean }) {
  const saved = useApp((s) => s.profile?.city ?? '');
  const [val, setVal] = useState(saved);
  const [busy, setBusy] = useState(false);
  const dirty = val.trim() !== saved && val.trim().length >= 2;
  const save = async () => {
    if (!dirty) return;
    setBusy(true);
    try {
      await useApp.getState().setCity(val);
      useApp.getState().showToast('Cidade salva.');
      onSaved?.(val.trim());
    } finally { setBusy(false); }
  };
  return (
    <View style={[{ gap: 8 }, style]}>
      <T v="xbold" style={{ fontSize: 17 }}>Sua cidade</T>
      {!compact && <T style={{ fontSize: 15, color: C.inkSoft }}>Usada só no ranking por cidade. Aparece o nome do pet e a cidade, nunca o seu nome.</T>}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput maxFontSizeMultiplier={MAX_SCALE} value={val} onChangeText={setVal} placeholder="Ex.: Saquarema" placeholderTextColor={C.inkFaint}
          accessibilityLabel="Sua cidade" autoCapitalize="words" autoCorrect={false} returnKeyType="done" onSubmitEditing={save} maxLength={40}
          style={{ flex: 1, minHeight: 52, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: C.inkFaint, borderRadius: 12, paddingHorizontal: 14, fontFamily: F.bodyBold, fontSize: 17, color: C.ink }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Salvar cidade" accessibilityState={{ disabled: !dirty || busy }} onPress={save}
          style={({ pressed }) => ({ minHeight: 52, minWidth: 88, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: dirty ? C.cover : C.paper3, opacity: pressed ? 0.85 : 1 })}>
          <T v="xbold" style={{ fontSize: 16, color: dirty ? C.goldPale : C.inkSoft }}>{busy ? '…' : saved && !dirty ? 'Salva' : 'Salvar'}</T>
        </Pressable>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ botão grande em pílula (CTA dos mockups v1.1)
export function PillButton({ label, onPress, disabled, loading, icon, tone = 'cover', accessibilityLabel }: {
  label: string; onPress?: () => void; disabled?: boolean; loading?: boolean; icon?: 'arrowRight' | 'plane' | 'none'; tone?: 'cover' | 'muted'; accessibilityLabel?: string;
}) {
  const muted = tone === 'muted' || disabled;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => ({
        minHeight: 60, borderRadius: 30, backgroundColor: muted ? C.paper2 : C.cover, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20,
        shadowColor: C.cover, shadowOpacity: muted ? 0 : 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: muted ? 0 : 4,
        opacity: loading ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
      {icon === 'plane' && !muted ? <PlaneSolid size={20} color={C.goldLight} /> : null}
      <T v="bold" numberOfLines={2} style={{ fontFamily: F.bodyBlack, fontSize: 19, color: muted ? C.inkSoft : '#FFFFFF', textAlign: 'center', flexShrink: 1 }}>{loading ? 'Aguarde…' : label}</T>
      {icon === 'arrowRight' && !muted ? <PIcon name="arrowRight" size={20} color={C.goldLight} sw={2.6} /> : null}
    </Pressable>
  );
}

/** Botão de texto sublinhado ("Continuar na Econômica", "Agora não"). */
export function TextButton({ label, onPress, size = 17 }: { label: string; onPress: () => void; size?: number }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
      <T v="xbold" style={{ fontSize: size, color: C.cover, textDecorationLine: 'underline' }}>{label}</T>
    </Pressable>
  );
}
