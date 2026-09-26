import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivePet, useApp } from '@/store/app';
import { T } from '@/components/ui';
import { ItemArt, PIcon, PlaneSolid } from '@/art/icons-premium';
import { EmptyTravelStamp, TravelStamp } from '@/art/Stamp';
import { DESTINATIONS, destinationById, mapProgress, milesTotals, type DestinationId } from '@/domain/gamification';
import { itemById } from '@/domain/commerce';
import { art } from '@/domain/words';
import { BalancePill, PillButton, TopBar, fmtMiles } from '@/components/v11/premium/common';
import { WorldMap, type MapPoint } from '@/components/v11/premium/WorldMap';
import { C } from '@/theme';

/** Mockup Mapa-Viagem: destinos liberados pelas milhas ACUMULADAS; viajar não gasta milhas. */
export default function MapaViagem() {
  const pet = useActivePet();
  const ledger = useApp((s) => s.data.ledger);
  const stamps = useApp((s) => s.data.stamps);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!pet) return <Redirect href="/" />;

  const { total: lifetime, balance } = milesTotals(ledger);
  const mp = mapProgress(lifetime);
  const at = (destinationById(pet.at ?? 'rio')?.id ?? 'rio') as DestinationId;
  const visited = new Map(stamps.filter((s) => s.kind === 'viagem' && s.destination).map((s) => [s.destination as string, s]));
  const points: MapPoint[] = mp.destinations.map((d) => ({ id: d.id, name: d.name, min: d.min, unlocked: d.unlocked, visited: visited.has(d.id) }));
  const next = mp.next;
  // destino liberado que ainda não deu carimbo (inclui a cidade atual — o Rio no começo)
  const toVisit = mp.destinations.find((d) => d.unlocked && !visited.has(d.id)) ?? null;
  const a = art(pet);
  const mapW = Math.min(width - 40, 520);

  const pick = async (id: DestinationId) => {
    const d = destinationById(id)!;
    if (id === at && visited.has(id)) { useApp.getState().showToast(`${a.O} ${pet.name} está em ${d.name}.`); return; }
    if (lifetime < d.min) { useApp.getState().showToast(`${d.name} libera com ${fmtMiles(d.min)} milhas acumuladas. Faltam ${fmtMiles(d.min - lifetime)}.`); return; }
    const first = !visited.has(id);
    const r = await useApp.getState().travelTo(id);
    if (r === 'ok' && !first) useApp.getState().showToast(`Chegamos em ${d.name}!`);
  };

  const nextOutfit = next ? itemById(next.outfit) : undefined;
  const pct = next ? Math.min(1, lifetime / next.min) : 1;

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar title={`Viagens ${a.do} ${pet.name}`} right={<BalancePill balance={balance} />} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: insets.bottom + 24, alignItems: 'stretch' }} showsVerticalScrollIndicator={false}>
        <View style={{ alignSelf: 'center' }}>
          <WorldMap width={mapW} points={points} at={at} next={next?.id ?? null} pet={pet} onPick={pick} />
          <View pointerEvents="none" style={{ position: 'absolute', left: 12, top: 12, minHeight: 26, borderRadius: 13, backgroundColor: C.sheet, paddingHorizontal: 10, justifyContent: 'center' }}>
            <T v="monoBold" style={{ fontSize: 12, color: C.inkSoft }}>{`${mp.unlockedCount} DE ${mp.total} DESTINOS`}</T>
          </View>
        </View>

        {toVisit && (
          <View style={{ marginTop: 12 }}>
            <PillButton label={toVisit.id === at ? `Pegar o carimbo de ${toVisit.name}` : `Viajar para ${toVisit.name}`} icon="plane" onPress={() => pick(toVisit.id)} />
          </View>
        )}

        {/* PRÓXIMO DESTINO */}
        <View accessibilityLabel="Próximo destino" style={{ marginTop: 12, borderRadius: 20, backgroundColor: C.sheet, padding: 16, shadowColor: C.cover, shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}>
          {next ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <T v="monoBold" style={{ fontSize: 12, color: C.goldDark }}>PRÓXIMO DESTINO</T>
                  <T v="serif" numberOfLines={1} style={{ fontSize: 26, lineHeight: 30, color: C.cover }}>{next.name}</T>
                </View>
                <View style={{ minHeight: 28, borderRadius: 14, backgroundColor: C.goldPale, paddingHorizontal: 10, justifyContent: 'center' }}>
                  <T v="monoBold" style={{ fontSize: 13, color: C.goldDark }}>{`${fmtMiles(next.min)} MI`}</T>
                </View>
              </View>
              <T v="bold" style={{ marginTop: 4, fontSize: 16, color: C.inkSoft }}>{`Chega lá com ${fmtMiles(next.min)} milhas acumuladas`}</T>
              <T v="monoBold" style={{ marginTop: 10, fontSize: 12, color: C.inkSoft }}>DESBLOQUEIA</T>
              <View style={{ marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <View style={{ minHeight: 34, borderRadius: 17, backgroundColor: C.purplePale, paddingLeft: 8, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <PIcon name="stamp" size={18} color={C.purple} />
                  <T v="xbold" style={{ fontSize: 15, color: C.purpleInk }}>{`Carimbo de ${next.name}`}</T>
                </View>
                {nextOutfit && (
                  <View style={{ minHeight: 34, borderRadius: 17, backgroundColor: C.goldPale, paddingLeft: 6, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ItemArt id={nextOutfit.id} size={22} />
                    <T v="xbold" style={{ fontSize: 15, color: C.goldDark }}>{nextOutfit.name}</T>
                  </View>
                )}
              </View>
              <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <T v="bold" style={{ fontSize: 15, color: C.inkSoft }}>{`${fmtMiles(lifetime)} de ${fmtMiles(next.min)} milhas acumuladas`}</T>
                <T v="xbold" style={{ fontSize: 15, color: C.cover }}>{`faltam ${fmtMiles(mp.remaining)} milhas`}</T>
              </View>
              <View accessibilityRole="progressbar" accessibilityLabel={`Progresso até ${next.name}`} accessibilityValue={{ min: 0, max: next.min, now: lifetime }}
                style={{ marginTop: 6, height: 8, borderRadius: 4, backgroundColor: C.paper2, overflow: 'hidden' }}>
                <View style={{ width: `${Math.round(pct * 100)}%`, height: 8, borderRadius: 4, backgroundColor: C.gold }} />
              </View>
            </>
          ) : (
            <>
              <T v="monoBold" style={{ fontSize: 12, color: C.goldDark }}>VOLTA AO MUNDO</T>
              <T v="serif" style={{ fontSize: 24, lineHeight: 30, color: C.cover }}>Todos os destinos liberados!</T>
              <T v="bold" style={{ marginTop: 4, fontSize: 16, color: C.inkSoft }}>{`${fmtMiles(lifetime)} milhas acumuladas. Novos destinos chegam em breve.`}</T>
            </>
          )}
          <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <PlaneSolid size={16} color={C.inkSoft} />
            <T v="bold" style={{ flexShrink: 1, fontSize: 15, lineHeight: 20, color: C.inkSoft, textAlign: 'center' }}>{`Viajar não gasta milhas: é só continuar cuidando ${a.do} ${pet.name}.`}</T>
          </View>
        </View>

        {/* CARIMBOS */}
        <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T v="serif" accessibilityRole="header" style={{ fontSize: 21, color: C.cover }}>Carimbos</T>
          <T v="monoBold" style={{ fontSize: 13, color: C.inkSoft }}>{`${visited.size} DE ${DESTINATIONS.length}`}</T>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 8 }} style={{ marginTop: 4 }}>
          {DESTINATIONS.map((d, i) => {
            const st = visited.get(d.id);
            if (st) {
              return <TravelStamp key={d.id} lines={d.stampLines} year={(st.date ?? '').slice(0, 4)} color={d.stamp.color} shape={d.stamp.shape === 'rect' ? 'rect' : i === 0 ? 'oval' : 'circle'} rotation={[-6, 4, -3, 5, -4][i % 5]} />;
            }
            return <EmptyTravelStamp key={d.id} lines={d.id === next?.id ? [...d.stampLines, 'EM BREVE'] : d.stampLines} />;
          })}
        </ScrollView>
      </ScrollView>
    </View>
  );
}
