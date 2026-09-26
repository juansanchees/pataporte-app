import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '@/art/Icon';
import Svg, { Path } from 'react-native-svg';
import { GuillocheG, RosetteG } from '@/art/patterns';
import { CircleStamp } from '@/art/Stamp';
import { MRZ, PetPhoto } from './passport';
import { T } from './ui';
import { fmtLong } from '@/domain/dates';
import { mrzFor } from '@/domain/mrz';
import type { Mood, Pet } from '@/domain/types';
import { C } from '@/theme';

/** The passport identification (data) page. */
export function IdPage({ pet, mood, guardian, stamp, full = true, onPhoto }: { pet: Pet; mood: Mood; guardian?: string; stamp?: 'emitido' | 'humor'; full?: boolean; onPhoto?: () => void }) {
  const [w, setW] = useState(340);
  const fields: [string, string][] = [
    ['Nome', pet.name],
    ['Espécie', pet.species === 'dog' ? 'Cão' : 'Gato'],
    ['Raça', pet.breed],
    ['Sexo', pet.sex === 'M' ? 'Macho' : 'Fêmea'],
    ['Nascimento', fmtLong(pet.birthDate)],
    ['Emissão', fmtLong(pet.issuedAt.slice(0, 10))],
  ];
  if (full) fields.push(['Tutor', guardian ?? '—'], ['Castrado', { sim: 'Sim', nao: 'Não', naosei: 'Não sei' }[pet.neutered]]);
  if (full && pet.microchip?.has === 'sim') fields.push(['Microchip', pet.microchip.number || 'Sim']);
  const moodColor = mood === 'feliz' ? C.green : mood === 'neutro' ? C.amber : C.red;
  const signs = pet.details.manchas === 'Sem manchas' ? `Olhos ${pet.details.olhos}, rabo ${pet.details.rabo}` : `Mancha ${pet.details.manchas}, olhos ${pet.details.olhos}`;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, overflow: 'hidden' }}>
      <Svg width={w} height={full ? 380 : 300} style={{ position: 'absolute' }} pointerEvents="none">
        <GuillocheG w={w} y0={40} band={200} n={16} seed={61} color={C.purple} opacity={0.14} />
        <RosetteG cx={w - 80} cy={160} size={76} color={C.aqua} opacity={0.14} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <T v="label" style={{ fontSize: 10 }}>TIPO P · PTP</T>
        <T v="monoBold" style={{ fontSize: 11 }}>Nº {pet.passportNumber}</T>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Pressable disabled={!onPhoto} onPress={onPhoto} accessibilityRole={onPhoto ? 'button' : undefined} accessibilityLabel="Editar foto do passaporte">
            <PetPhoto pet={pet} mood={mood} w={104} h={134} photo />
            {onPhoto && (
              <View style={{ position: 'absolute', right: -6, bottom: -6, width: 32, height: 32, borderRadius: 16, backgroundColor: C.cover, borderWidth: 2, borderColor: C.sheet, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="camera" size={16} color={C.goldPale} />
              </View>
            )}
          </Pressable>
          {full && <View style={{ opacity: 0.28, marginTop: 4 }}><PetPhoto pet={pet} mood={mood} w={38} h={48} holo={false} corners={false} photo /></View>}
        </View>
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', rowGap: 7 }}>
          {fields.map(([k, v]) => (
            <View key={k} style={{ width: '50%', paddingRight: 6 }}>
              <T v="label" style={{ fontSize: 10, letterSpacing: 0.6 }}>{k.toUpperCase()}</T>
              <T v="monoBold" style={{ fontSize: 12.5, textTransform: 'uppercase' }} numberOfLines={2}>{v}</T>
            </View>
          ))}
        </View>
      </View>
      {full && (
        <>
          <View style={{ marginTop: 8 }}>
            <T v="label" style={{ fontSize: 10 }}>SINAIS PARTICULARES</T>
            <T v="monoBold" style={{ fontSize: 12, textTransform: 'uppercase' }}>{signs}</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 }}>
            <View style={{ flex: 1 }}>
              <T v="label" style={{ fontSize: 10 }}>ASSINATURA DO TUTOR</T>
              <Svg width={120} height={34} viewBox="0 0 120 34"><Path d="M4 24c8-14 14-18 16-10s-6 14 2 8 10-16 16-12-4 14 4 10 8-10 14-8 2 8 10 6 12-8 18-6 10 4 16 2" fill="none" stroke={C.blue} strokeWidth={1.8} strokeLinecap="round" /></Svg>
            </View>
            {stamp === 'humor' && <CircleStamp top="HUMOR DO DIA" bottom="PATAPORTE" main={mood === 'triste' ? 'TRISTE' : mood.toUpperCase()} color={moodColor} size={72} rotation={10} seed={91} />}
          </View>
        </>
      )}
      <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, marginTop: 8 }}>
        <MRZ lines={mrzFor(pet)} />
        <T style={{ fontSize: 12.5, color: C.inkSoft, textAlign: 'center', marginTop: 6 }}>Documento do app, não oficial. Para viajar, vale o do MAPA.</T>
      </View>
      {stamp === 'emitido' && (
        <View style={{ position: 'absolute', right: -8, top: 120 }} pointerEvents="none">
          <CircleStamp top="PATAPORTE EMITIDO" bottom="BEM-VINDO A BORDO" main="EMITIDO" sub={fmtLong(pet.issuedAt.slice(0, 10))} color={C.coralInk} size={132} rotation={-16} seed={71} />
        </View>
      )}
    </View>
  );
}
