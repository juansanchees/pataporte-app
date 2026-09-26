import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { T } from '@/components/ui';
import { Icon } from '@/art/Icon';
import { BottomCard } from './shared';
import { DURATION_OPTIONS } from '@/domain/parasites';
import type { ParasiteDuration } from '@/domain/types';
import { C } from '@/theme';

/**
 * Dur-Duracao: "Quanto tempo ele protege?" — usada em cuidado/[id].tsx ao registrar uma dose de
 * vermífugo/antipulgas hoje (domain: @/domain/parasites, DURATION_OPTIONS).
 */
export function DurationSheet({ title, onConfirm, onClose, busy }: { title: string; onConfirm: (d: ParasiteDuration) => void; onClose: () => void; busy?: boolean }) {
  const [value, setValue] = useState<ParasiteDuration | null>(null);
  return (
    <BottomCard>
      <View style={{ alignItems: 'center', gap: 4, marginBottom: 6 }}>
        <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 8 }} />
        <T v="serif" style={{ fontSize: 22, textAlign: 'center' }}>{title}</T>
      </View>
      <View style={{ gap: 10 }}>
        {DURATION_OPTIONS.map((o) => {
          const on = value === o.value;
          return (
            <Pressable key={String(o.value)} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setValue(o.value)}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, borderRadius: 14, paddingHorizontal: 16,
                backgroundColor: on ? C.cover : C.sheet, borderWidth: 1.5, borderColor: on ? C.cover : C.line, opacity: pressed ? 0.85 : 1,
              })}>
              <View style={{ flex: 1 }}>
                <T v="xbold" style={{ fontSize: 16.5, color: on ? C.goldPale : C.ink }}>{o.label}</T>
                <T style={{ fontSize: 13, color: on ? C.goldLight : C.inkSoft }}>{o.sub}</T>
              </View>
              {on ? <Icon name="check" size={20} color={C.goldPale} sw={3} /> : null}
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        <PressButton label="Cancelar" tone="secondary" onPress={onClose} disabled={busy} />
        <PressButton label="Registrar" tone="primary" onPress={() => value !== null && onConfirm(value)} disabled={busy || value === null} />
      </View>
    </BottomCard>
  );
}

function PressButton({ label, tone, onPress, disabled }: { label: string; tone: 'primary' | 'secondary'; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} onPress={disabled ? undefined : onPress}
      style={({ pressed }) => ({
        flex: 1, minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
        backgroundColor: tone === 'primary' ? C.cover : 'transparent', borderWidth: tone === 'secondary' ? 2 : 0, borderColor: C.cover,
        opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
      })}>
      <T v="xbold" style={{ color: tone === 'primary' ? C.goldPale : C.cover, fontSize: 16 }}>{label}</T>
    </Pressable>
  );
}
