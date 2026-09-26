import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/store/app';
import { EmissionPage } from '@/components/emission';
import { T } from '@/components/ui';
import { RectStamp } from '@/art/Stamp';
import { Avatar, PassportPhoto } from '@/art/Avatar';
import { breedsFor } from '@/domain/catalog';
import { C } from '@/theme';
import type { Species } from '@/domain/types';

export default function Especie() {
  const species = useApp((s) => s.draft.species);
  const setDraft = useApp((s) => s.setDraft);

  const pick = (sp: Species) => {
    if (sp === species) return;
    const b = breedsFor(sp)[0];
    setDraft({ species: sp, breed: b.name, coat: b.coats[0].hex, coatName: b.coats[0].name, details: { ...useApp.getState().draft.details, orelhas: sp === 'cat' ? 'Em pé' : 'Caídas' } });
  };

  const card = (sp: Species, pt: string, en: string) => {
    const on = species === sp;
    return (
      <Pressable key={sp} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => pick(sp)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 14, minHeight: 150, borderRadius: 16, borderWidth: on ? 2 : 1.5, borderStyle: on ? 'solid' : 'dashed', borderColor: on ? C.cover : C.inkFaint, backgroundColor: on ? C.sheet : 'rgba(255,255,255,0.35)' }}>
        <PassportPhoto w={96} h={120} holo={false}>
          <Avatar species={sp} coat={sp === 'dog' ? '#C98A54' : '#8C7E6E'} mood={on ? 'feliz' : 'neutro'} size={100} patch={sp === 'dog'} />
        </PassportPhoto>
        <View style={{ gap: 4, flex: 1 }}>
          <T v="label">{en}</T>
          <T v="serif" style={{ fontSize: 28 }}>{pt}</T>
          <T style={{ fontSize: 14.5, color: C.inkSoft }}>Todas as raças, inclusive SRD</T>
        </View>
        {on && <View style={{ position: 'absolute', right: 8, top: 8 }}><RectStamp lines={['SELECIONADO']} color={C.coralInk} width={104} height={30} rotation={8} seed={51} bigIndex={-1} /></View>}
      </Pressable>
    );
  };

  return (
    <EmissionPage step={1} title="Quem é o seu pet?" onNext={() => router.push('/emissao/raca')}>
      <T style={{ color: C.inkSoft, marginBottom: 14 }}>Escolha a espécie para começar a emissão do passaporte.</T>
      <View style={{ gap: 14 }}>
        {card('dog', 'Cachorro', 'CÃO · DOG')}
        {card('cat', 'Gato', 'GATO · CAT')}
      </View>
    </EmissionPage>
  );
}
