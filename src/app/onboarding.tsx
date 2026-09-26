import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/store/app';
import { Page } from '@/components/passport';
import { Button, T } from '@/components/ui';
import { CircleStamp, RectStamp, EmptyStamp } from '@/art/Stamp';
import { Avatar, PassportPhoto } from '@/art/Avatar';
import { C } from '@/theme';

const TOBY = { species: 'dog' as const, coat: '#C98A54', patch: true };

function Spread() {
  return (
    <View style={{ width: 300, height: 196, flexDirection: 'row', borderRadius: 10, elevation: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 12 } }}>
      <View style={{ flex: 1, backgroundColor: C.sheet, borderTopLeftRadius: 10, borderBottomLeftRadius: 10, borderWidth: 1, borderColor: C.line, padding: 12, gap: 8 }}>
        <T v="label" style={{ fontSize: 13 }}>PATAPORTE · PTP</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <PassportPhoto w={56} h={70} holo={false} corners={false}><Avatar {...TOBY} size={60} /></PassportPhoto>
          <View style={{ gap: 3 }}>
            <T v="label" style={{ fontSize: 13 }}>NOME</T><T v="monoBold" style={{ fontSize: 13 }}>TOBY</T>
            <T v="label" style={{ fontSize: 13 }}>RAÇA</T><T v="monoBold" style={{ fontSize: 13 }}>GOLDEN</T>
          </View>
        </View>
        <T v="mono" style={{ fontSize: 6, marginTop: 'auto' }}>{'P<PTPTOBY<<GOLDEN<<<<<\nPTP0048217<5PET2103148M'}</T>
      </View>
      <View style={{ width: 8, backgroundColor: 'rgba(42,38,34,0.12)' }} />
      <View style={{ flex: 1, backgroundColor: C.sheet, borderTopRightRadius: 10, borderBottomRightRadius: 10, borderWidth: 1, borderColor: C.line }}>
        <View style={{ position: 'absolute', left: 6, top: 10 }}><CircleStamp top="VACINA EM DIA" bottom="PATAPORTE" main="V10" sub="02 MAR 26" color={C.blue} size={84} rotation={-14} seed={21} /></View>
        <View style={{ position: 'absolute', right: 4, bottom: 12 }}><RectStamp lines={['EMBARQUE', 'ARB', '28 SET']} color={C.coralInk} width={86} height={52} rotation={9} seed={22} bigIndex={1} /></View>
        <View style={{ position: 'absolute', right: 12, top: 16 }}><EmptyStamp size={44} /></View>
      </View>
    </View>
  );
}

function StampArt() {
  return (
    <View style={{ alignItems: 'center', gap: 18 }}>
      <CircleStamp top="CUIDADO FEITO" bottom="+15 MILHAS" main="V10" sub="02 MAR 26" color={C.coralInk} size={170} rotation={12} seed={31} />
      <View style={{ backgroundColor: C.coverDeep, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 }}><T v="bold" style={{ color: C.goldPale, fontSize: 15 }}>+15 milhas · carimbo novo!</T></View>
    </View>
  );
}

function GuideArt() {
  return (
    <View style={{ width: 300, gap: 10 }}>
      <View style={{ alignSelf: 'flex-end', backgroundColor: C.cover, borderRadius: 16, borderBottomRightRadius: 4, padding: 12, maxWidth: '80%' }}><T v="bold" style={{ color: C.goldPale, fontSize: 14 }}>A pata dele está vermelha. É grave?</T></View>
      <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 16, borderBottomLeftRadius: 4, padding: 12, maxWidth: '88%' }}>
        <T v="monoBold" style={{ fontSize: 13, letterSpacing: 1.4, color: C.aquaInk }}>GUIA DE BORDO · IA</T>
        <T style={{ fontSize: 15, marginTop: 4 }}>Parece uma irritação leve. Observe por 48h e me mande outra foto amanhã.</T>
        <View style={{ position: 'absolute', right: -14, bottom: -20 }}><RectStamp lines={['OBSERVAR', '48H']} color={C.amber} width={88} height={46} rotation={-8} seed={41} /></View>
      </View>
    </View>
  );
}

const SLIDES = [
  { art: <Spread />, title: 'Emita o passaporte do seu pet', text: 'Monte um avatar igualzinho a ele e ganhe a página de identificação oficial do Pataporte.' },
  { art: <StampArt />, title: 'Cada cuidado vira um carimbo', text: 'Vacina, vermífugo, remédio, ração: cumpriu, carimbou. Carimbos rendem milhas e sobem a categoria do seu pet.' },
  { art: <GuideArt />, title: 'Um guia de bordo para dúvidas', text: 'Pergunte por texto ou foto. O guia orienta e avisa quando é hora de ir ao veterinário.' },
];

export default function Onboarding() {
  const [i, setI] = useState(0);
  const seeOnboarding = useApp((s) => s.seeOnboarding);
  const finish = async () => { await seeOnboarding(); router.replace('/login'); };
  const s = SLIDES[i];
  return (
    <Page seed={2} scroll={false}
      header={
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12 }}>
          <T v="monoBold" style={{ fontSize: 13, letterSpacing: 3, color: C.cover }}>PATAPORTE</T>
          <Button label="Pular" variant="ghost" small onPress={finish} />
        </View>
      }
      footer={
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 14 }}>
            {SLIDES.map((_, k) => (
              <Pressable key={k} accessibilityLabel={`Página ${k + 1}`} onPress={() => setI(k)} hitSlop={10}
                style={{ width: k === i ? 28 : 10, height: 10, borderRadius: 6, borderWidth: 1.5, borderColor: C.cover, backgroundColor: k <= i ? C.cover : 'transparent' }} />
            ))}
          </View>
          {i < 2 ? <Button label="Virar a página" icon="chevron" onPress={() => setI(i + 1)} /> : <Button label="Emitir meu Pataporte" onPress={finish} />}
        </>
      }
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 34 }}>
        <View style={{ height: 240, alignItems: 'center', justifyContent: 'center' }}>{s.art}</View>
        <View style={{ gap: 10, alignItems: 'center' }}>
          <T v="eyebrow">PÁGINA 0{i + 1} / 03</T>
          <T v="serif" style={{ fontSize: 30, lineHeight: 34, textAlign: 'center' }}>{s.title}</T>
          <T style={{ color: C.inkSoft, textAlign: 'center', lineHeight: 23 }}>{s.text}</T>
        </View>
      </View>
    </Page>
  );
}
