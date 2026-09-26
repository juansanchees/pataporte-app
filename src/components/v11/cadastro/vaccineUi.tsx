import React from 'react';
import { View } from 'react-native';
import { T } from '@/components/ui';
import { TIER_TAG, type VaccineTier } from '@/domain/vaccines';
import { C } from '@/theme';

export const TIER_COLORS: Record<VaccineTier, { bg: string; fg: string }> = {
  essencial: { bg: C.greenPale, fg: '#2E6B41' },
  recomendada: { bg: C.amberPale, fg: C.goldDark },
  opcional: { bg: C.purplePale, fg: C.purpleInk },
};

export function TierTag({ tier, text }: { tier: VaccineTier; text?: string }) {
  const c = TIER_COLORS[tier];
  return (
    <View style={{ alignSelf: 'center', backgroundColor: c.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
      <T v="eyebrow" style={{ fontSize: 13, color: c.fg, fontWeight: '700', textAlign: 'center' }}>{text ?? TIER_TAG[tier]}</T>
    </View>
  );
}
