import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { T } from '@/components/ui';
import { LembreteIcon, type LembreteIconName } from '@/art/icons-lembrete';
import type { ReminderType } from '@/domain/types';
import { C } from '@/theme';

/**
 * v1.1 — pedaços compartilhados da área de lembretes/remédios (Lembrete-Novo, Lembrete-Remedio,
 * Remedio-Madrugada, Dose-Atrasada). Ver /tmp/.../design-v11/project/*.dc.html.
 */

export const TYPE_ICON: Record<ReminderType, LembreteIconName> = {
  remedio: 'pill', passeio: 'walk', banho: 'bath', consulta: 'stethoscope', comida: 'food', outro: 'dots',
};

/** Cartão "sheet" no rodapé da tela, como os bottom sheets dos mockups (fundo escuro atrás). */
export function BottomCard({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(11,35,40,0.55)', justifyContent: 'flex-end' }}>
      {/* tocar no fundo escuro fecha (como os outros sheets) */}
      <Pressable style={{ flex: 1 }} onPress={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))} accessibilityRole="button" accessibilityLabel="Fechar" />
      <View style={{ backgroundColor: C.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 22 + insets.bottom, gap: 14, maxHeight: '92%' }}>
        {children}
      </View>
    </View>
  );
}

/** Cartão de opção grande (usado em "O que vamos lembrar?"). */
export function TypeOption({ type, label, onPress }: { type: ReminderType; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => ({
        width: '48%', flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 96, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 12,
        backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: C.line, opacity: pressed ? 0.75 : 1,
      })}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.aquaPale, alignItems: 'center', justifyContent: 'center' }}>
        <LembreteIcon name={TYPE_ICON[type]} size={22} color={C.aquaInk} />
      </View>
      <T v="xbold" style={{ fontSize: 17, textAlign: 'center' }}>{label}</T>
    </Pressable>
  );
}

export const WEEKDAYS: { n: number; short: string; long: string }[] = [
  { n: 0, short: 'DOM', long: 'domingo' }, { n: 1, short: 'SEG', long: 'segunda' }, { n: 2, short: 'TER', long: 'terça' },
  { n: 3, short: 'QUA', long: 'quarta' }, { n: 4, short: 'QUI', long: 'quinta' }, { n: 5, short: 'SEX', long: 'sexta' }, { n: 6, short: 'SAB', long: 'sábado' },
];

/** Seletor de dias da semana (chips redondos DOM..SAB). */
export function WeekdayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'space-between' }}>
      {WEEKDAYS.map((w) => {
        const on = value.includes(w.n);
        return (
          <Pressable key={w.n} accessibilityRole="button" accessibilityLabel={w.long} accessibilityState={{ selected: on }}
            onPress={() => onChange(on ? value.filter((x) => x !== w.n) : [...value, w.n])}
            style={({ pressed }) => ({
              width: 44, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
              backgroundColor: on ? C.cover : C.sheet, borderWidth: 1.5, borderColor: on ? C.cover : C.line, opacity: pressed ? 0.8 : 1,
            })}>
            <T v="monoBold" style={{ fontSize: 11.5, color: on ? C.goldPale : C.inkSoft }}>{w.short}</T>
          </Pressable>
        );
      })}
    </View>
  );
}
