import React from 'react';
import { Share, View, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg from 'react-native-svg';
import { useActivePet, useApp } from '@/store/app';
import { Page, PageHeader, PetPhoto } from '@/components/passport';
import { Button, T } from '@/components/ui';
import { CircleStamp } from '@/art/Stamp';
import { Emblem, GuillocheG, Leather } from '@/art/patterns';
import { fmtBR } from '@/domain/dates';
import { C } from '@/theme';
import { Redirect, router } from 'expo-router';

export default function Certificado() {
  const pet = useActivePet();
  const cares = useApp((s) => s.data.cares);
  const { width } = useWindowDimensions();
  if (!pet) return <Redirect href="/" />;
  const vaccines = cares.filter((c) => c.category === 'vacina' && c.lastDate);
  const summary = [
    `PATAPORTE · REGISTRO DE VACINAS (NÃO OFICIAL)`,
    `${pet.name} · ${pet.breed} · ${pet.sex} · nasc. ${fmtBR(pet.birthDate)}`,
    `Nº ${pet.passportNumber}`,
    ...vaccines.map((v) => `${v.name}: aplicada ${fmtBR(v.lastDate!)}${v.nextDate ? `, validade ${fmtBR(v.nextDate)}` : ''}`),
  ].join('\n');
  const W = width - 48;
  const share = () => {
    const pw = useApp.getState().paywallFor('compartilhar');
    if (pw) { router.push(`/planos?gatilho=${pw}` as never); return; }
    Share.share({ message: summary }).catch(() => {});
  };

  return (
    <Page seed={24} header={<PageHeader title="Certificado de vacinação" eyebrow="CARTEIRINHA DIGITAL" />}
      footer={<Button label="Compartilhar certificado" icon="share" variant="secondary" onPress={share} />}>
      <View style={{ backgroundColor: C.yellowCard, borderWidth: 2, borderColor: C.yellowLine, borderRadius: 12, padding: 14, overflow: 'hidden' }}>
        <Svg width={W} height={90} style={{ position: 'absolute' }} pointerEvents="none"><GuillocheG w={W} y0={0} band={90} n={10} seed={77} color="#B08A2A" opacity={0.2} /></Svg>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <T v="monoBold" style={{ fontSize: 10, letterSpacing: 1.2, color: '#6B5516' }}>CERTIFICADO DE VACINAÇÃO DO PET</T>
            <T v="mono" style={{ fontSize: 11, letterSpacing: 1, color: '#6B5516' }}>PET VACCINATION CERTIFICATE</T>
          </View>
          <View style={{ width: 34, height: 44, borderRadius: 4, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}><Leather w={34} h={44} color={pet.coverColor} radius={4} /><Emblem size={26} bg={pet.coverColor} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 10 }}>
          <PetPhoto pet={pet} w={56} h={68} holo={false} corners={false} />
          <View>
            <T v="serif" style={{ fontSize: 22 }}>{pet.name}</T>
            <T v="mono" style={{ fontSize: 10, color: C.inkSoft, textTransform: 'uppercase' }}>{`${pet.breed} · ${pet.sex} · ${fmtBR(pet.birthDate)}`}</T>
            <T v="monoBold" style={{ fontSize: 10 }}>{`Nº ${pet.passportNumber}`}</T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', paddingVertical: 4 }}>
          {['VACINA', 'APLICADA', 'VALIDADE', 'VET'].map((h, i) => <T key={h} v="monoBold" style={{ fontSize: 10, letterSpacing: 1, color: '#6B5516', flex: i === 0 ? 1.4 : 1 }}>{h}</T>)}
        </View>
        {vaccines.length === 0 && <T style={{ fontSize: 13, color: C.inkSoft, paddingVertical: 10 }}>Nenhuma vacina carimbada ainda. Carimbe as vacinas na aba Vacinas para elas aparecerem aqui.</T>}
        {vaccines.map((v, i) => (
          <View key={v.id} style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.yellowLine, minHeight: 48 }}>
            <T v="xbold" style={{ flex: 1.4, fontSize: 12.5 }}>{v.name}</T>
            <T v="mono" style={{ flex: 1, fontSize: 10 }}>{fmtBR(v.lastDate!).slice(0, 6) + fmtBR(v.lastDate!).slice(8)}</T>
            <T v="mono" style={{ flex: 1, fontSize: 10 }}>{v.nextDate ? fmtBR(v.nextDate).slice(0, 6) + fmtBR(v.nextDate).slice(8) : '—'}</T>
            <View style={{ flex: 1, alignItems: 'center' }}><CircleStamp top="PATAPORTE" bottom={v.place ? v.place.toUpperCase().slice(0, 12) : 'TUTOR'} main="OK" color={[C.blue, C.green, C.purple][i % 3]} size={40} rotation={-12 + i * 11} seed={140 + i} /></View>
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1.5, borderStyle: 'dashed', borderTopColor: C.yellowLine }}>
          <View style={{ backgroundColor: C.yellowCard, padding: 4, borderWidth: 1, borderColor: C.yellowLine }}>
            <QRCode value={summary.slice(0, 900)} size={108} backgroundColor={C.yellowCard} color={C.ink} />
          </View>
          <T style={{ flex: 1, fontSize: 14.5, lineHeight: 20 }}>Mostre este QR em clínicas, hotéis e pet shops: ao escanear, aparece o resumo das vacinas.</T>
        </View>
      </View>
      <View style={{ backgroundColor: C.amberPale, borderRadius: 12, padding: 12, marginTop: 12 }}>
        <T v="bold" style={{ fontSize: 15, lineHeight: 21, color: C.ink }}>Documento não oficial: registro feito pelo tutor. Não substitui a carteira assinada pelo veterinário nem o passaporte do MAPA.</T>
      </View>
    </Page>
  );
}
