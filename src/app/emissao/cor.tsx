import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/store/app';
import { EmissionPage } from '@/components/emission';
import { InfoNote, SectionTitle, T } from '@/components/ui';
import { PetPhoto } from '@/components/passport';
import { coatsFor } from '@/domain/catalog';
import { C } from '@/theme';

export default function Cor() {
  const d = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const coats = coatsFor(d.species, d.breed);
  return (
    <EmissionPage step={3} title="Qual a cor?" onNext={() => router.push('/emissao/detalhes')}>
      <View style={{ alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <PetPhoto pet={{ species: d.species, coat: d.coat, details: d.details, equipped: [] }} w={170} h={206} />
        <T v="eyebrow">FOTO 3×4 · PRÉVIA AO VIVO</T>
      </View>
      <SectionTitle>{`Cores do ${d.breed}`}</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 14 }}>
        {coats.map((c) => {
          const on = c.hex === d.coat && c.name === d.coatName;
          return (
            <Pressable key={c.name} accessibilityRole="radio" accessibilityLabel={c.name} accessibilityState={{ selected: on }} onPress={() => setDraft({ coat: c.hex, coatName: c.name })}
              style={{ alignItems: 'center', gap: 8, width: 72 }}>
              <View style={{ width: 62, height: 62, borderRadius: 31, borderWidth: on ? 3 : 0, borderColor: C.cover, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: on ? 50 : 56, height: on ? 50 : 56, borderRadius: 28, backgroundColor: c.hex, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' }} />
              </View>
              <T v="monoBold" style={{ fontSize: 13, textAlign: 'center', textTransform: 'uppercase', color: on ? C.ink : C.inkSoft }}>{c.name}</T>
            </Pressable>
          );
        })}
      </View>
      <InfoNote text="Mostramos só as pelagens que existem nessa raça." />
    </EmissionPage>
  );
}
