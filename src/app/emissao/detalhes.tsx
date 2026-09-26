import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/store/app';
import { EmissionPage } from '@/components/emission';
import { ChipRow, FieldLabel, T } from '@/components/ui';
import { PetPhoto } from '@/components/passport';
import { DETAIL_OPTIONS } from '@/domain/catalog';
import type { PetDetails } from '@/domain/types';

const FIELDS: [keyof PetDetails, string][] = [
  ['manchas', 'Manchas'],
  ['olhos', 'Cor dos olhos'],
  ['orelhas', 'Orelhas'],
  ['pelo', 'Pelo'],
  ['rabo', 'Rabo'],
];

export default function Detalhes() {
  const d = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const editing = d.editingPetId !== null;
  const set = (k: keyof PetDetails, v: string) => setDraft({ details: { ...d.details, [k]: v } });

  const next = async () => {
    if (editing) { await useApp.getState().saveEdit(); router.back(); router.back(); return; }
    router.push({ pathname: '/emissao/sobre', params: { q: 'nome' } });
  };

  return (
    <EmissionPage step={4} title="Sinais particulares" onNext={next} final>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 16 }}>
        <PetPhoto pet={{ species: d.species, coat: d.coat, details: d.details, equipped: [] }} w={112} h={138} />
        <View style={{ flex: 1, gap: 6 }}>
          <T v="bold" style={{ fontSize: 15, lineHeight: 21 }}>Toque nas opções abaixo: o avatar muda na hora.</T>
        </View>
      </View>
      {FIELDS.map(([k, label]) => (
        <View key={k} style={{ marginBottom: 14 }}>
          <FieldLabel pt={label} />
          <ChipRow options={[...DETAIL_OPTIONS[k]]} value={d.details[k]} onChange={(v) => set(k, v)} />
        </View>
      ))}
    </EmissionPage>
  );
}
