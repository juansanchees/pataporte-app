import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/store/app';
import { EmissionPage } from '@/components/emission';
import { ChipRow, FieldLabel, T } from '@/components/ui';
import { Icon } from '@/art/Icon';
import { breedsFor } from '@/domain/catalog';
import { breedProfile, risksFor, sizeFor, TEMPERAMENTS } from '@/domain/breeds';
import type { PetSize } from '@/domain/types';
import { C } from '@/theme';
import { art } from '@/domain/words';

const SIZES: [PetSize, string, string][] = [['pequeno', 'Pequeno', 'até 10 kg'], ['médio', 'Médio', '10 a 25 kg'], ['grande', 'Grande', 'mais de 25 kg']];

/** "Como ele é": porte, raças que puxou e jeito — base para o Guia IA prevenir problemas. */
export default function Perfil() {
  const d = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const editing = d.editingPetId !== null;
  const size = d.size ?? sizeFor(d.species, d.breed, parseFloat(d.weight.replace(',', '.')) || null);
  const profile = breedProfile(d.species, d.breed);
  const isMix = d.breed === 'SRD';
  const risks = risksFor({ species: d.species, breed: d.breed, weightKg: null, ancestry: d.ancestry, size });
  const name = d.name || (d.species === 'dog' ? 'seu cão' : 'seu gato');
  const a = d.name ? art(d) : { do: 'do', no: 'no', o: 'o' };
  const others = breedsFor(d.species).filter((b) => b.name !== 'SRD' && b.name !== d.breed && (b.popular || d.ancestry.includes(b.name))).map((b) => b.name);

  const toggleAnc = (b: string) => {
    const has = d.ancestry.includes(b);
    setDraft({ ancestry: has ? d.ancestry.filter((x) => x !== b) : [...d.ancestry, b].slice(-2) });
  };
  const toggleTemp = (x: string) => setDraft({ temperament: d.temperament.includes(x) ? d.temperament.filter((y) => y !== x) : [...d.temperament, x] });

  const next = async () => {
    if (!d.size) setDraft({ size });
    if (editing) { await useApp.getState().saveEdit(); router.back(); return; }
    router.push('/emissao/dados');
  };

  return (
    <EmissionPage step={5} title="Como é o jeito" onNext={next} final>
      <T style={{ fontSize: 15.5, color: C.inkSoft, lineHeight: 22, marginBottom: 14 }}>
        {`Conte um pouco sobre o jeito e a origem ${a.do} ${name}. Com isso o Guia IA já sabe quais problemas são comuns e te ajuda a prevenir.`}
      </T>

      <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, marginBottom: 16, gap: 4 }}>
        <T style={{ fontSize: 15, color: C.inkSoft }}>Raça</T>
        <T v="serif" style={{ fontSize: 22 }}>{d.breed === 'SRD' ? 'SRD (sem raça definida)' : d.breed}</T>
        {profile ? <T style={{ fontSize: 14.5, lineHeight: 20 }}>{profile.about}</T> : null}
        <Pressable accessibilityRole="button" onPress={() => router.push('/emissao/raca')} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}>
          <T v="bold" style={{ fontSize: 14, color: C.cover, textDecorationLine: 'underline' }}>Trocar a raça</T>
        </Pressable>
      </View>

      <View style={{ marginBottom: 16 }}>
        <FieldLabel pt="Porte" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {SIZES.map(([k, label, hint]) => {
            const on = size === k;
            return (
              <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setDraft({ size: k })}
                style={{ flex: 1, minHeight: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2 : 1.5, borderStyle: on ? 'solid' : 'dashed', borderColor: on ? C.cover : C.inkFaint, backgroundColor: on ? C.cover : 'transparent' }}>
                <T v="bold" style={{ fontSize: 15, color: on ? C.goldPale : C.ink }}>{label}</T>
                <T style={{ fontSize: 14, color: on ? C.goldLight : C.inkSoft }}>{hint}</T>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isMix ? (
        <View style={{ marginBottom: 16 }}>
          <FieldLabel pt="Parece com alguma raça? (até 2)" />
          <ChipRow multi options={others} value={d.ancestry} onChange={toggleAnc} />
          <T style={{ fontSize: 15, color: C.inkSoft, marginTop: 6 }}>Ex.: vira-lata com cara de Pinscher. Se não souber, pode pular.</T>
        </View>
      ) : null}

      <View style={{ marginBottom: 16 }}>
        <FieldLabel pt="Personalidade" />
        <ChipRow multi options={TEMPERAMENTS} value={d.temperament} onChange={toggleTemp} />
      </View>

      <View style={{ backgroundColor: C.yellowCard, borderWidth: 1, borderColor: C.yellowLine, borderRadius: 16, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="shield" size={22} color={C.goldDark} />
          <T v="serif" style={{ fontSize: 20, flex: 1 }}>{`O que prevenir ${a.no} ${name}`}</T>
        </View>
        {risks.map((r) => (
          <View key={r.id} style={{ gap: 2 }}>
            <T v="xbold" style={{ fontSize: 15.5 }}>{r.title}</T>
            <T style={{ fontSize: 14, lineHeight: 20, color: C.inkSoft }}>{r.what}</T>
            <T v="bold" style={{ fontSize: 14, lineHeight: 20, color: C.green }}>{`Prevenção: ${r.prevent[0]}`}</T>
          </View>
        ))}
        <T v="bold" style={{ fontSize: 15, color: C.goldDark }}>O Guia IA usa isso para dar dicas certeiras. Confirme sempre com o veterinário.</T>
      </View>
    </EmissionPage>
  );
}
