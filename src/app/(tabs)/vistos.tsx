import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Svg from 'react-native-svg';
import { useActivePet, useApp } from '@/store/app';
import { Page, PageHeader, VisaSticker } from '@/components/passport';
import { IconButton, SectionTitle, T } from '@/components/ui';
import { CircleStamp, EmptyStamp, RectStamp } from '@/art/Stamp';
import { RosetteG } from '@/art/patterns';
import { levelFor, milesTotals, specialsFor, streakFor } from '@/domain/gamification';
import { fmtBR, today } from '@/domain/dates';
import { C } from '@/theme';
import { useWindowDimensions } from 'react-native';
import { art } from '@/domain/words';

const SPOTS = [[10, 6, -12], [180, 0, 7], [110, 100, 14], [4, 150, -9], [214, 104, -6], [60, 248, 10], [170, 238, -4], [240, 300, 12]];

export default function Vistos() {
  const pet = useActivePet();
  const data = useApp((s) => s.data);
  const { width } = useWindowDimensions();
  const t = today();
  const v = useMemo(() => {
    if (!pet) return null;
    const { total } = milesTotals(data.ledger);
    return { total, lv: levelFor(total), streak: streakFor(data.ledger, data.cares, t), specials: specialsFor(pet, data, t), stamps: data.stamps.filter((s) => s.kind === 'cuidado').length };
  }, [pet, data, t]);
  if (!pet || !v) return null;
  const pageW = width - 48;
  const scale = pageW / 342;
  const unlocked = v.specials.filter((s) => s.unlocked);
  const careStamps = [...data.stamps].filter((s) => s.kind === 'cuidado').sort((a, b) => b.date.localeCompare(a.date));
  const stampW = Math.floor((pageW - 26) / 3);
  const locked = v.specials.filter((s) => !s.unlocked);

  return (
    <Page seed={26} header={<PageHeader title="Carimbos e conquistas" eyebrow={`CONQUISTAS ${art(pet).DO} ${pet.name.toUpperCase()}`} back={false} right={<IconButton icon="map" label="Mapa da jornada" onPress={() => router.push('/mapa')} />} />}>
      <View style={{ gap: 14 }}>
        <VisaSticker level={v.lv.n} name={v.lv.name} miles={v.total} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[[v.stamps, 'CARIMBOS'], [v.streak, 'DIAS SEGUIDOS'], [v.total, 'MILHAS']].map(([n, k]) => (
            <View key={String(k)} style={{ flex: 1, backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 10, alignItems: 'center' }}>
              <T v="serif" style={{ fontSize: 24 }}>{String(n)}</T>
              <T v="bold" style={{ fontSize: 14, color: C.inkSoft, textAlign: 'center' }}>{String(k).charAt(0) + String(k).slice(1).toLowerCase()}</T>
            </View>
          ))}
        </View>
        <View>
          <SectionTitle>{`Carimbos de vacinas e cuidados · ${careStamps.length}`}</SectionTitle>
          <T style={{ fontSize: 14, color: C.inkSoft, marginBottom: 10 }}>{`Cada vacina, vermífugo ou remédio que ${art(pet).o} ${pet.name} toma vira um carimbo aqui, com a data. Toque para ver o cronograma.`}</T>
          <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', rowGap: 6 }}>
            {careStamps.length === 0 && (
              <View style={{ alignItems: 'center', padding: 16, gap: 8, width: '100%' }}>
                <EmptyStamp size={72} label="?" />
                <T style={{ color: C.inkSoft, textAlign: 'center' }}>Nenhum carimbo ainda. Na aba Vacinas, marque quando o pet tomar uma vacina.</T>
              </View>
            )}
            {careStamps.map((st, i) => (
              <Pressable key={st.id} accessibilityRole="button" accessibilityLabel={`${st.top}, ${fmtBR(st.date)}`} disabled={!st.careId}
                onPress={() => st.careId && router.push({ pathname: '/cuidado/[id]', params: { id: st.careId } })}
                style={{ width: stampW, alignItems: 'center', paddingVertical: 4 }}>
                <CircleStamp top={st.top} bottom={fmtBR(st.date)} main={st.main} sub="" color={st.color} size={stampW - 8} rotation={st.rotation} seed={300 + i} />
              </Pressable>
            ))}
          </View>
        </View>
        <SectionTitle>Carimbos especiais</SectionTitle>
        <View style={{ height: 380 * scale, backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 14, overflow: 'hidden' }} accessibilityLabel={`${unlocked.length} carimbos especiais conquistados de ${v.specials.length}`}>
          <Svg width={pageW} height={380 * scale} style={{ position: 'absolute' }}><RosetteG cx={pageW / 2} cy={190 * scale} size={110 * scale} opacity={0.1} /></Svg>
          {v.specials.map((s, i) => {
            const [x, y, rot] = SPOTS[i % SPOTS.length];
            return (
              <View key={s.id} style={{ position: 'absolute', left: x * scale, top: y * scale, alignItems: 'center', width: 110 * scale }}>
                {s.unlocked
                  ? (s.shape === 'circle'
                    ? <CircleStamp top={s.top} bottom={s.bottom} main={s.main} sub={s.sub} color={s.color} size={100 * scale} rotation={rot} seed={200 + i} />
                    : <RectStamp lines={[s.top, s.bottom]} color={s.color} width={128 * scale} height={60 * scale} rotation={rot} seed={200 + i} bigIndex={0} />)
                  : <>
                      <EmptyStamp size={72 * scale} label="?" />
                      <T v="bold" style={{ fontSize: 13, color: C.inkSoft, textAlign: 'center' }}>{s.top.charAt(0) + s.top.slice(1).toLowerCase()}</T>
                    </>}
              </View>
            );
          })}
        </View>
        <View>
          <SectionTitle>Quase lá</SectionTitle>
          {locked.sort((a, b) => b.progress.cur / b.progress.goal - a.progress.cur / a.progress.goal).slice(0, 4).map((s) => (
            <View key={s.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: C.line }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <T v="xbold" style={{ fontSize: 14.5, flex: 1 }}>{`${s.top.charAt(0)}${s.top.slice(1).toLowerCase()} · ${s.requirement}`}</T>
                <T v="bold" style={{ fontSize: 14.5, color: C.inkSoft }}>{`${s.progress.cur}/${s.progress.goal}`}</T>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: C.paper3 }}><View style={{ height: 6, borderRadius: 3, backgroundColor: C.coralInk, width: `${Math.round((s.progress.cur / s.progress.goal) * 100)}%` }} /></View>
            </View>
          ))}
          {locked.length === 0 && <T style={{ color: C.inkSoft }}>Todos os carimbos especiais conquistados!</T>}
        </View>
      </View>
    </Page>
  );
}
