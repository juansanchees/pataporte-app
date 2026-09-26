import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivePet, useApp } from '@/store/app';
import { T } from '@/components/ui';
import { PIcon, PawSolid } from '@/art/icons-premium';
import { milesSummary, seasonLevel, seasonName } from '@/domain/gamification';
import { today } from '@/domain/dates';
import { CityField, LevelTag, TopBar, fmtMiles } from '@/components/v11/premium/common';
import {
  breedLabel, buildEntry, fetchRanking, mockRanking, publishEntry, rankingOnline, seasonDaysLeft,
  type RankingEntry, type RankingResult, type RankingScope,
} from '@/services/ranking';
import { C } from '@/theme';

/** Mockup Ranking: Cidade | Raça, temporada do mês, pódio, lista e a linha "você" fixa. */
const AV_BG = [C.aquaPale, C.purplePale, C.greenPale, C.goldPale];
const LIST_MAX = 10;

type Status = 'loading' | 'ok' | 'offline' | 'nocity';

export default function Ranking() {
  const pet = useActivePet();
  const user = useApp((s) => s.user);
  const city = useApp((s) => s.profile?.city ?? '');
  const ledger = useApp((s) => s.data.ledger);
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<RankingScope>('cidade');
  // resultado guardado com a chave do pedido (escopo + pontuação + tentativa): "carregando" é derivado, sem setState no efeito
  const [got, setGot] = useState<{ key: string; res: RankingResult | null; offline: boolean } | null>(null);
  const [tick, setTick] = useState(0);

  const t = today();
  const season = milesSummary(ledger, t).season;
  const mine: RankingEntry | null = pet && user && city ? buildEntry(user.uid, pet, city, season, t) : null;
  const reqKey = mine ? `${scope}|${mine.id}|${mine.cityKey}|${mine.breedKey}|${mine.seasonMiles}|${mine.petName}|${tick}` : '';

  useEffect(() => {
    if (!mine) return;
    let alive = true;
    const done = (res: RankingResult | null, offline: boolean) => { if (alive) setGot({ key: reqKey, res, offline }); };
    (async () => {
      if (!rankingOnline()) {
        // modo local (sem Firebase): dados de exemplo só em desenvolvimento
        await Promise.resolve();
        done(__DEV__ ? mockRanking(scope, mine) : null, !__DEV__);
        return;
      }
      try {
        await publishEntry(mine).catch(() => {});
        const key = scope === 'cidade' ? mine.cityKey : mine.breedKey;
        done(await fetchRanking(scope, key, mine.season, mine), false);
      } catch {
        done(null, true);
      }
    })();
    return () => { alive = false; };
  }, [reqKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const fresh = got && got.key === reqKey ? got : null;
  const status: Status = !mine ? 'nocity' : !fresh ? 'loading' : fresh.offline ? 'offline' : 'ok';
  // mantém a lista anterior na tela enquanto recarrega (troca de aba)
  const res = fresh?.res ?? (got && !got.offline ? got.res : null);

  if (!pet) return <Redirect href="/" />;
  const breed = breedLabel(pet.breed);
  const entries = res?.entries ?? [];
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3, LIST_MAX);
  const myRank = res?.myRank ?? null;
  const meInList = !!mine && entries.slice(0, LIST_MAX).some((e) => e.id === mine.id);

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar title="Ranking da semana" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {/* Cidade | Raça */}
        <View accessibilityRole="tablist" style={{ minHeight: 48, borderRadius: 24, backgroundColor: C.paper2, flexDirection: 'row' }}>
          {([['cidade', city || 'Cidade'], ['raca', breed]] as [RankingScope, string][]).map(([id, label]) => {
            const on = scope === id;
            return (
              <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`Ranking por ${id === 'cidade' ? 'cidade' : 'raça'}: ${label}`} onPress={() => setScope(id)}
                style={{ flex: 1, minHeight: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8, backgroundColor: on ? C.cover : 'transparent' }}>
                {id === 'cidade' ? <PIcon name="pin" size={18} color={on ? C.goldLight : C.cover} sw={2.2} /> : <PawSolid size={16} color={on ? C.goldLight : C.cover} />}
                <T v="xbold" numberOfLines={1} style={{ flexShrink: 1, fontSize: 16, color: on ? '#FFFFFF' : C.cover }}>{label}</T>
              </Pressable>
            );
          })}
        </View>
        <T v="monoBold" numberOfLines={1} style={{ marginTop: 12, fontSize: 13, color: C.inkSoft, textAlign: 'center' }}>
          {`${seasonName(t).toUpperCase()} · termina em ${seasonDaysLeft(t)} ${seasonDaysLeft(t) === 1 ? 'dia' : 'dias'}`}
        </T>

        {status === 'nocity' ? (
          <View style={{ marginTop: 18, borderRadius: 18, backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, padding: 16, gap: 10 }}>
            <T v="serif" style={{ fontSize: 22, color: C.cover }}>Em que cidade vocês moram?</T>
            <CityField compact onSaved={() => setTick((x) => x + 1)} />
            <T v="bold" style={{ fontSize: 15, color: C.inkSoft }}>{`O ranking mostra só o nome ${pet.sex === 'F' ? 'da' : 'do'} ${pet.name} e a cidade. Nunca o seu nome.`}</T>
          </View>
        ) : status === 'offline' ? (
          <View style={{ marginTop: 18, borderRadius: 18, backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, padding: 18, alignItems: 'center', gap: 10 }}>
            <PIcon name="globePlane" size={40} color={C.cover} />
            <T v="serif" style={{ fontSize: 22, color: C.cover, textAlign: 'center' }}>Ranking disponível com internet</T>
            <T v="bold" style={{ fontSize: 16, color: C.inkSoft, textAlign: 'center' }}>Conecte o celular e tente de novo para ver quem mais cuidou nesta temporada.</T>
            <Pressable accessibilityRole="button" onPress={() => setTick((x) => x + 1)} style={{ minHeight: 48, borderRadius: 24, paddingHorizontal: 20, justifyContent: 'center', backgroundColor: C.cover }}>
              <T v="xbold" style={{ color: '#FFFFFF', fontSize: 16 }}>Tentar de novo</T>
            </Pressable>
          </View>
        ) : status === 'loading' && !res ? (
          <View style={{ marginTop: 40, alignItems: 'center' }}><ActivityIndicator color={C.cover} size="large" /></View>
        ) : (
          <>
            {res?.source === 'mock' && (
              <View style={{ marginTop: 10, borderRadius: 10, backgroundColor: C.amberPale, padding: 8 }}>
                <T v="bold" style={{ fontSize: 15, color: C.amber, textAlign: 'center' }}>Modo de teste (sem Firebase): dados de exemplo.</T>
              </View>
            )}
            {/* PÓDIO */}
            {podium.length > 0 && (
              <View accessibilityLabel="Pódio" style={{ marginTop: 14, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
                {[1, 0, 2].map((i) => podium[i] ? <PodiumCol key={i} e={podium[i]} place={i + 1} me={podium[i].id === mine?.id} /> : <View key={i} style={{ flex: 1 }} />)}
              </View>
            )}
            {/* LISTA */}
            {rest.length > 0 && (
              <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12 }}>
                {rest.map((e, i) => <RowItem key={e.id} e={e} rank={i + 4} scope={scope} me={e.id === mine?.id} last={i === rest.length - 1} bg={AV_BG[i % AV_BG.length]} />)}
              </View>
            )}
            {entries.length <= 1 && (
              <T v="bold" style={{ marginTop: 14, fontSize: 16, color: C.inkSoft, textAlign: 'center' }}>
                {scope === 'cidade' ? `Por enquanto só ${pet.sex === 'F' ? 'a' : 'o'} ${pet.name} em ${city}. Chame os amigos!` : `Por enquanto só ${pet.sex === 'F' ? 'a' : 'o'} ${pet.name} nesta raça.`}
              </T>
            )}
          </>
        )}
      </ScrollView>

      {/* VOCÊ (fixo) + nota de privacidade */}
      <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: insets.bottom + 12, backgroundColor: C.paper, gap: 10 }}>
        {status === 'ok' && mine && myRank && !meInList && (
          <>
            <View accessibilityElementsHidden importantForAccessibility="no" style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              {[0, 1, 2].map((i) => <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#B09A70' }} />)}
            </View>
            <YouRow e={mine} rank={myRank} />
          </>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 }}>
          <PIcon name="lock" size={18} color={C.inkSoft} />
          <T v="bold" style={{ flex: 1, fontSize: 15, lineHeight: 20, color: C.inkSoft }}>O ranking mostra só o nome do pet e a cidade.</T>
        </View>
      </View>
    </View>
  );
}

function PodiumCol({ e, place, me }: { e: RankingEntry; place: number; me: boolean }) {
  const first = place === 1;
  const ring = place === 1 ? C.gold : place === 2 ? '#9AA3AF' : '#C99A74';
  const baseBg = place === 1 ? C.goldLight : place === 2 ? '#E7E9EC' : '#F1DCCB';
  const numColor = place === 1 ? C.cover : place === 2 ? '#4A5361' : '#8A4B24';
  const av = first ? 72 : 60;
  return (
    <View accessible accessibilityLabel={`${place}º lugar: ${e.petName}${me ? ' (você)' : ''}, ${fmtMiles(e.seasonMiles)} milhas`} style={{ flex: 1, alignItems: 'center' }}>
      {first && <PIcon name="crown" size={24} color={C.goldDark} fill={C.goldLight} />}
      <View style={{ padding: first ? 3 : 2, borderRadius: av, backgroundColor: ring }}>
        <View style={{ width: av, height: av, borderRadius: av / 2, backgroundColor: first ? C.purplePale : place === 2 ? C.aquaPale : C.greenPale, borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
          <PawSolid size={first ? 34 : 28} color={C.cover} />
        </View>
      </View>
      <T v="xbold" numberOfLines={1} style={{ marginTop: 6, fontSize: first ? 17 : 16, color: me ? C.cover : C.ink }}>{me ? `${e.petName} (você)` : e.petName}</T>
      <T v="monoBold" style={{ fontSize: 13, color: first ? C.goldDark : C.inkSoft }}>{fmtMiles(e.seasonMiles)}</T>
      <View style={{ marginTop: 8, width: '100%', height: first ? 88 : place === 2 ? 64 : 48, borderTopLeftRadius: 14, borderTopRightRadius: 14, backgroundColor: baseBg, alignItems: 'center', paddingTop: 6 }}>
        <T v="serif" style={{ fontSize: first ? 36 : place === 2 ? 30 : 28, lineHeight: first ? 42 : 36, color: numColor }}>{String(place)}</T>
      </View>
    </View>
  );
}

function RowItem({ e, rank, scope, me, last, bg }: { e: RankingEntry; rank: number; scope: RankingScope; me: boolean; last: boolean; bg: string }) {
  const lv = seasonLevel(e.seasonMiles);
  return (
    <View accessible accessibilityLabel={`${rank}º: ${e.petName}${me ? ' (você)' : ''}, ${scope === 'cidade' ? e.breed : e.city}, nível ${lv.name}, ${fmtMiles(e.seasonMiles)} milhas`}
      style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: last ? 0 : 1, borderColor: '#E6D8BA', backgroundColor: me ? C.aquaPale : 'transparent', marginHorizontal: me ? -12 : 0, paddingHorizontal: me ? 12 : 0 }}>
      <T v="monoBold" style={{ width: 26, fontSize: 15, color: C.inkSoft }}>{String(rank)}</T>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><PawSolid size={20} color={C.cover} /></View>
      <View style={{ flex: 1 }}>
        <T v="xbold" numberOfLines={1} style={{ fontSize: 16 }}>{me ? `${e.petName} (você)` : e.petName}</T>
        <T v="bold" numberOfLines={1} style={{ fontSize: 15, color: C.inkSoft }}>{`${e.city} · ${e.breed}`}</T>
      </View>
      <LevelTag level={lv.id} name={lv.name} />
      <T v="monoBold" style={{ minWidth: 52, textAlign: 'right', fontSize: 15, color: C.cover }}>{fmtMiles(e.seasonMiles)}</T>
    </View>
  );
}

function YouRow({ e, rank }: { e: RankingEntry; rank: number }) {
  const lv = seasonLevel(e.seasonMiles);
  return (
    <View accessible accessibilityLabel={`Sua posição: ${rank}º, ${e.petName}, nível ${lv.name}, ${fmtMiles(e.seasonMiles)} milhas`}
      style={{ minHeight: 60, borderRadius: 18, backgroundColor: C.aquaPale, borderWidth: 2, borderColor: C.cover, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: C.cover, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 3 }}>
      <T v="monoBold" style={{ width: 30, fontSize: 15, color: C.cover }}>{String(rank)}</T>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}><PawSolid size={20} color={C.cover} /></View>
      <View style={{ flex: 1 }}>
        <T numberOfLines={1} style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: C.cover }}>{e.petName}</T>
        <T v="xbold" style={{ fontSize: 15, color: C.cover }}>você</T>
      </View>
      <LevelTag level={lv.id} name={lv.name} />
      <T v="monoBold" style={{ minWidth: 52, textAlign: 'right', fontSize: 15, color: C.cover }}>{fmtMiles(e.seasonMiles)}</T>
    </View>
  );
}
