import React from 'react';
import { View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useActivePet, useApp } from '@/store/app';
import { Page, VisaSticker } from '@/components/passport';
import { IdPage } from '@/components/IdPage';
import { Button, T } from '@/components/ui';
import { C } from '@/theme';
import { art } from '@/domain/words';
import { levelFor, milesTotals } from '@/domain/gamification';

export default function Emitido() {
  const pet = useActivePet();
  const ledger = useApp((s) => s.data.ledger);
  if (!pet) return <Redirect href="/" />;
  const { total } = milesTotals(ledger);
  const lv = levelFor(total);
  const next = () => router.replace('/inicio');
  return (
    <Page seed={12} footer={<Button label="Abrir meu Pataporte" onPress={next} />}
      header={<View style={{ alignItems: 'center', paddingTop: 22, paddingBottom: 8 }}><T v="eyebrow">PÁGINA DE IDENTIFICAÇÃO</T><T v="serif" style={{ fontSize: 34 }} accessibilityRole="header">Passaporte emitido!</T></View>}>
      <View style={{ gap: 16, alignItems: 'stretch' }}>
        <IdPage pet={pet} mood="feliz" stamp="emitido" full={false} />
        <View style={{ backgroundColor: C.aquaPale, borderRadius: 14, padding: 16, gap: 6 }}>
          <T v="xbold" style={{ fontSize: 17, color: C.aquaInk }}>Como ganhar milhas</T>
          <T style={{ fontSize: 16, lineHeight: 23 }}>{`Cada cuidado com ${art(pet).o} ${pet.name} vale milhas: dar a comida, passear, vacinar. Com milhas você sobe de nível e ganha prêmios para o avatar.`}</T>
        </View>
        <VisaSticker level={lv.n} name={lv.name} miles={total} />
      </View>
    </Page>
  );
}
