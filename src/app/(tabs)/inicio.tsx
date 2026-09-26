import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useActivePet, useApp } from '@/store/app';
import { T } from '@/components/ui';
import { PaperRings } from '@/art/patterns';
import { HomeIcon, PawFill, type HomeIconName } from '@/art/icons-home';
import { PetRound } from '@/components/v11/home/PetRound';
import { RoutineEditor, WalkSheet } from '@/components/v11/home/HomeSheets';
import { doseRoute, MILES_ROUTE, newReminderRoute } from '@/components/v11/home/routes';
import { agoraItem, nextVaccine, progress, todayItems, vaccinesSummary, type Agora, type TodayItem } from '@/domain/today';
import { careStreak, milesSummary, moodFor } from '@/domain/gamification';
import { ageLabel } from '@/domain/vaccines';
import { fmtKg, weightTrend } from '@/domain/diary';
import { greeting, routineOf } from '@/domain/routine';
import { fromDay, MONTH_NAMES, toDay, WEEKDAY_NAMES } from '@/domain/dates';
import { art } from '@/domain/words';
import { track } from '@/services/analytics';
import { C } from '@/theme';

/**
 * Home oficial (Home-Final + Home-Sequencia + Home-Vazia + AGORA atrasado do Dose-Atrasada).
 * Ordem: saudação · chip do pet / emergência / sino · cartão do pet · 4 bolinhas · AGORA · Próxima vacina · Hoje.
 */
const AGENDA_VACINAS = '/itinerario?filtro=vacinas';

function kindIcon(it: TodayItem): HomeIconName {
  if (it.kind === 'remedio') return 'pill';
  if (it.kind === 'passeio') return 'walk';
  if (it.kind === 'comida') return 'bowl';
  if (it.reminderType === 'banho') return 'bath';
  if (it.reminderType === 'consulta') return 'vet';
  return 'bell';
}

function inLabel(min: number): string {
  if (min < 1) return 'AGORA';
  if (min < 60) return `EM ${min} MIN`;
  const h = Math.round(min / 60);
  return `EM ${h} H`;
}

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(i); }, []);
  return now;
}

export default function Inicio() {
  const pet = useActivePet();
  const data = useApp((s) => s.data);
  const user = useApp((s) => s.profile?.name ?? '');
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const now = useNow();
  const [walkItem, setWalkItem] = useState<TodayItem | null>(null);
  /** passeio extra (nada agendado agora): registra direto, sem lembrete */
  const [extraWalk, setExtraWalk] = useState(false);
  const [editRoutine, setEditRoutine] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const t = toDay(now);

  const v = useMemo(() => {
    if (!pet) return null;
    const items = todayItems({ data }, pet, now);
    const w = weightTrend(data.weights, t);
    return {
      items,
      prog: progress(items),
      agora: agoraItem(items, now),
      nv: nextVaccine(data.cares, t),
      vs: vaccinesSummary(data.cares, t),
      streak: careStreak(data.ledger, t),
      miles: milesSummary(data.ledger, t),
      mood: moodFor(data.cares, t),
      weight: w?.last ?? pet.weightKg ?? null,
      age: pet.birthDate ? ageLabel(pet.birthDate, t) : null,
    };
  }, [pet, data, now, t]);

  if (!pet || !v) return <Redirect href="/" />;
  const a = art(pet);
  const firstName = user.trim().split(' ')[0];

  // ------------------------------------------------------------ ações
  const mark = async (it: TodayItem, minutes?: string) => {
    await useApp.getState().markTodayItem(it, minutes ? { minutes } : undefined);
    if (it.kind === 'remedio') track('dose_marcada', { origem: 'home', status: 'given' });
  };
  const openDose = (it: TodayItem) => {
    if (it.source.type === 'dose') router.push(doseRoute(it.source.reminderId, it.source.at) as never);
  };
  /** Toque em "Dar"/"Feito" ou numa linha pendente da lista. */
  const act = (it: TodayItem) => {
    if (it.kind === 'remedio' && it.status === 'atrasado' && it.source.type === 'dose') return openDose(it);
    if (it.kind === 'passeio' && it.source.type === 'routine') return setWalkItem(it);
    return mark(it);
  };
  const walkShortcut = () => {
    const pend = v.items.find((i) => i.kind === 'passeio' && !i.done);
    if (pend) return act(pend);
    setExtraWalk(true);
  };

  const agoraKey = v.agora?.item.key;
  const rest = v.items.filter((i) => i.key !== agoraKey);
  const pending = rest.filter((i) => !i.done);
  const done = rest.filter((i) => i.done);
  const emptyDay = v.items.length === 0;
  const showMiles = v.miles.lifetime > 0 || v.streak > 0;
  const heroW = width - 40;

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      {/* fundo: degradê suave no topo + anéis de papel */}
      <Svg width={width} height={420} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
        <Defs>
          <LinearGradient id="homeTop" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.goldPale} stopOpacity={1} />
            <Stop offset="1" stopColor={C.paper} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={420} fill="url(#homeTop)" />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, width, height: 380, overflow: 'hidden', opacity: 0.8 }} pointerEvents="none">
        <PaperRings w={width} h={380} cy={204 + insets.top} opacity={0.7} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: 22, top: insets.top + 120, transform: [{ rotate: '-20deg' }] }}><PawFill size={46} color={C.cover} opacity={0.06} /></View>
      <View pointerEvents="none" style={{ position: 'absolute', right: 26, top: insets.top + 250, transform: [{ rotate: '18deg' }] }}><PawFill size={40} color={C.cover} opacity={0.06} /></View>

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* ------------------------------------------------ cabeçalho */}
        <T v="bold" numberOfLines={1} style={{ fontSize: 16, color: C.inkSoft }}>{`${greeting(now.getHours())}${firstName ? `, ${firstName}` : ''}`}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Trocar de pet. Pet atual: ${pet.name}`} onPress={() => router.push('/passaportes')}
            style={({ pressed }) => ({ flexShrink: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderColor: C.cover, borderRadius: 24, backgroundColor: pressed ? C.paper2 : C.sheet, paddingLeft: 3, paddingRight: 12 })}>
            <PetRound pet={pet} size={38} border={2} />
            <T v="xbold" numberOfLines={1} style={{ flexShrink: 1, fontSize: 17, color: C.cover }}>{pet.name}</T>
            <HomeIcon name="down" size={18} color={C.cover} sw={2.6} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Emergência" onPress={() => router.push('/sos')}
            style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: pressed ? C.redPale : C.red, alignItems: 'center', justifyContent: 'center', shadowColor: C.red, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 })}>
            <HomeIcon name="heartPulse" size={24} color={C.white} sw={2.1} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Avisos e ajustes" onPress={() => router.push('/ajustes')}
            style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: pressed ? C.paper2 : C.sheet, alignItems: 'center', justifyContent: 'center' })}>
            <HomeIcon name="bell" size={22} color={C.cover} />
          </Pressable>
        </View>

        {/* ------------------------------------------------ cartão do pet */}
        <View style={{ marginTop: 12, borderRadius: 28, overflow: 'hidden', padding: 14, paddingHorizontal: 16, gap: 12, backgroundColor: '#E7EEE2', shadowColor: C.cover, shadowOpacity: 0.08, shadowRadius: 9, shadowOffset: { width: 0, height: 6 }, elevation: 2 }}>
          <Svg width={heroW} height={400} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
            <Defs>
              <LinearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={C.aquaPale} stopOpacity={1} />
                <Stop offset="1" stopColor={C.paper} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={heroW} height={400} fill="url(#hero)" />
          </Svg>
          <Pressable accessibilityRole="button" accessibilityLabel={`Ficha ${a.do} ${pet.name}`} onPress={() => router.push('/perfil')} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ shadowColor: C.cover, shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 3, borderRadius: 50 }}>
              <PetRound pet={pet} size={showMiles ? 88 : 100} mood={v.mood} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="serif" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 36, lineHeight: 40, color: C.cover }}>{pet.name}</T>
              <T v="bold" numberOfLines={1} style={{ fontSize: 16, lineHeight: 21, color: C.inkSoft }}>{[pet.breed, v.age].filter(Boolean).join(' · ')}</T>
              <View style={{ marginTop: 6, alignSelf: 'flex-start', maxWidth: '100%', minHeight: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.85)', paddingLeft: 6, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ring ratio={v.prog.ratio} />
                <T v="xbold" numberOfLines={1} style={{ flexShrink: 1, fontSize: 15, color: C.ink }}>{v.prog.total ? `${v.prog.label} cuidados feitos` : 'Comece hoje'}</T>
              </View>
            </View>
          </Pressable>

          {showMiles ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View accessible accessibilityLabel={`Sequência: ${v.streak} ${v.streak === 1 ? 'dia' : 'dias'} seguidos cuidando ${a.do} ${pet.name}`}
                style={{ flex: 1, minHeight: 44, borderRadius: 22, backgroundColor: C.goldPale, borderWidth: 1.5, borderColor: C.goldLight, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <HomeIcon name="streak" size={20} color={C.goldDark} sw={2.2} />
                <T v="xbold" numberOfLines={1} style={{ flexShrink: 1, fontSize: 15, color: C.goldDark }}>{v.streak === 1 ? '1 dia seguido' : `${v.streak} dias seguidos`}</T>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`${v.miles.balance} milhas. Ver milhas ${a.do} ${pet.name}`} onPress={() => router.push(MILES_ROUTE as never)}
                style={({ pressed }) => ({ minHeight: 48, borderRadius: 24, backgroundColor: pressed ? '#E3D7EC' : C.purplePale, paddingLeft: 10, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 6 })}>
                <HomeIcon name="plane" size={20} color={C.purple} />
                <T v="xbold" numberOfLines={1} style={{ fontSize: 15, color: C.purple }}>{`${v.miles.balance.toLocaleString('pt-BR')} milhas`}</T>
                <HomeIcon name="chevron" size={16} color={C.purple} sw={2.6} />
              </Pressable>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Stat value={v.weight ? fmtKg(v.weight) : '—'} label="Peso" onPress={() => router.push('/peso')} />
            <Stat value={v.age ?? '—'} label="Idade" />
            <Stat value={v.vs.total ? v.vs.label : '—'} label="Vacinas" onPress={() => router.push(AGENDA_VACINAS as never)} />
          </View>
        </View>

        {/* ------------------------------------------------ 4 bolinhas */}
        <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-around' }}>
          <Bubble label="Vacinas" icon="syringe" bg={C.purplePale} fg={C.purple} onPress={() => router.push(AGENDA_VACINAS as never)} />
          <Bubble label="Remédio" icon="pill" bg={C.amberPale} fg="#7A5204" onPress={() => router.push(newReminderRoute('remedio') as never)} />
          <Bubble label="Passeio" icon="walk" bg={C.greenPale} fg={C.green} onPress={walkShortcut} />
          <Bubble label="Peso" icon="scale" bg={C.aquaPale} fg={C.cover} onPress={() => router.push('/peso')} />
        </View>

        {/* ------------------------------------------------ AGORA */}
        {v.agora ? <AgoraCard ag={v.agora} now={now} onAct={() => act(v.agora!.item)} onOpenDose={() => openDose(v.agora!.item)} /> : null}

        {/* ------------------------------------------------ próxima vacina / primeiro passo */}
        {v.nv ? (
          <NextVaccineCard name={v.nv.name} date={v.nv.date} days={v.nv.daysUntil} late={v.nv.status === 'atrasado'} />
        ) : (
          <View style={{ marginTop: 12, borderRadius: 22, backgroundColor: C.cover, padding: 16, gap: 14, shadowColor: C.cover, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <HomeIcon name="flag" size={24} color={C.goldLight} />
              <T v="serif" style={{ fontSize: 22, lineHeight: 28, color: C.white }}>Seu primeiro passo</T>
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.push(AGENDA_VACINAS as never)}
              style={({ pressed }) => ({ minHeight: 52, borderRadius: 26, backgroundColor: pressed ? C.paper : C.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 })}>
              <HomeIcon name="syringe" size={22} color={C.cover} />
              <T v="xbold" numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, fontSize: 17, color: C.cover }}>Colocar as vacinas na agenda</T>
            </Pressable>
          </View>
        )}

        {/* ------------------------------------------------ Hoje */}
        <View style={{ marginTop: 12, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T v="serif" accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28, color: C.cover }}>Hoje</T>
          <Pressable accessibilityRole="button" accessibilityLabel="Novo lembrete" onPress={() => router.push(newReminderRoute() as never)}
            style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8, paddingRight: 4 }}>
            <HomeIcon name="plus" size={18} color={C.cover} sw={2.6} />
            <T v="xbold" style={{ fontSize: 17, color: C.cover }}>Lembrete</T>
          </Pressable>
        </View>

        {emptyDay ? (
          <View style={{ marginTop: 4, borderWidth: 2, borderStyle: 'dashed', borderColor: '#D9C9A6', borderRadius: 22, backgroundColor: 'rgba(251,246,234,0.7)', paddingVertical: 16, paddingHorizontal: 16, alignItems: 'center' }}>
            <PawFill size={34} color={C.inkFaint} />
            <T v="xbold" style={{ marginTop: 6, fontSize: 18, lineHeight: 24, textAlign: 'center' }}>Nada para hoje ainda</T>
            <T v="bold" style={{ fontSize: 16, lineHeight: 22, color: C.inkSoft, textAlign: 'center' }}>{`Adicione a comida e o passeio ${a.do} ${pet.name}`}</T>
            <View style={{ marginTop: 12, flexDirection: 'row', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <AddChip label="Comida" onPress={() => router.push(newReminderRoute('comida') as never)} />
              <AddChip label="Passeio" onPress={() => router.push(newReminderRoute('passeio') as never)} />
            </View>
          </View>
        ) : (
          <View>
            {pending.map((it, i) => (
              <TodayRow key={it.key} it={it} last={i === pending.length - 1 && !done.length} onPress={() => act(it)} />
            ))}
            {!pending.length && !v.agora ? (
              <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: '#E6D8BA' }}>
                <HomeIcon name="check" size={22} color={C.green} sw={2.6} />
                <T v="bold" style={{ flex: 1, fontSize: 17, color: C.green }}>{`Tudo feito hoje! ${a.O} ${pet.name} agradece.`}</T>
              </View>
            ) : null}
            {done.length ? (
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDone }} accessibilityLabel={`${done.length} ${done.length === 1 ? 'feito' : 'feitos'} hoje. ${showDone ? 'Esconder' : 'Mostrar'}`} onPress={() => setShowDone(!showDone)}
                style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 50, alignItems: 'flex-start' }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.greenPale, alignItems: 'center', justifyContent: 'center' }}><HomeIcon name="check" size={15} color={C.green} sw={2.6} /></View>
                </View>
                <T v="bold" numberOfLines={1} style={{ flex: 1, fontSize: 17, color: C.inkSoft }}>{`${done.length} ${done.length === 1 ? 'feito' : 'feitos'} hoje`}</T>
                <HomeIcon name={showDone ? 'up' : 'down'} size={20} color={C.inkSoft} sw={2.2} />
              </Pressable>
            ) : null}
            {showDone && done.map((it) => (
              <TodayRow key={it.key} it={it} onPress={() => useApp.getState().unmarkTodayItem(it)} />
            ))}
          </View>
        )}
        <Pressable accessibilityRole="button" onPress={() => setEditRoutine(true)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
          <HomeIcon name="edit" size={18} color={C.cover} />
          <T v="bold" style={{ fontSize: 16, color: C.cover }}>Mudar horários do dia</T>
        </Pressable>

        {/* ------------------------------------------------ mais (funções da v1.0 que continuam acessíveis) */}
        <T v="serif" accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28, color: C.cover, marginTop: 18, marginBottom: 6 }}>{`Mais ${a.do} ${pet.name}`}</T>
        <View style={{ backgroundColor: C.sheet, borderRadius: 22, overflow: 'hidden' }}>
          <MoreRow icon="doc" label="Resumo para o veterinário" onPress={() => router.push('/dossie')} />
          <MoreRow icon="suitcase" label="Vou viajar" onPress={() => router.push('/viagem')} />
          <MoreRow icon="shield" label="Saúde da raça" onPress={() => router.push('/raca')} />
          <MoreRow icon="stamp" label="Carimbos e conquistas" onPress={() => router.push('/vistos')} />
          <MoreRow icon="bag" label="Loja de milhas" onPress={() => router.push('/duty-free')} />
          <MoreRow icon="gear" label="Ajustes" onPress={() => router.push('/ajustes')} last />
        </View>
      </ScrollView>

      <WalkSheet visible={!!walkItem} petName={`${a.do} ${pet.name}`} onClose={() => setWalkItem(null)}
        onPick={(m) => { const it = walkItem; setWalkItem(null); if (it) mark(it, m); }} />
      <WalkSheet visible={extraWalk} petName={`${a.do} ${pet.name}`} onClose={() => setExtraWalk(false)}
        onPick={(m) => { setExtraWalk(false); useApp.getState().recordWalk(m); }}
        onReminder={() => { setExtraWalk(false); router.push(newReminderRoute('passeio') as never); }} />
      {editRoutine && <RoutineEditor routine={routineOf(pet)} species={pet.species} onClose={() => setEditRoutine(false)} />}
    </View>
  );
}

// ------------------------------------------------------------------ peças
function Ring({ ratio }: { ratio: number }) {
  const c = 2 * Math.PI * 7.5;
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={7.5} fill="none" stroke={C.greenPale} strokeWidth={3} />
      {ratio > 0 ? <Circle cx={10} cy={10} r={7.5} fill="none" stroke={C.green} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${c * Math.min(1, ratio)} ${c}`} rotation={-90} origin="10, 10" /> : null}
    </Svg>
  );
}

function Stat({ value, label, onPress }: { value: string; label: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={`${label}: ${value === '—' ? 'sem registro' : value}`} disabled={!onPress} onPress={onPress}
      style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 50, borderRadius: 14, backgroundColor: pressed ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', paddingVertical: 4 })}>
      <T v="xbold" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 17, lineHeight: 21, color: C.cover }}>{value}</T>
      <T v="bold" numberOfLines={1} style={{ fontSize: 14, lineHeight: 18, color: C.inkSoft }}>{label}</T>
    </Pressable>
  );
}

function Bubble({ label, icon, bg, fg, onPress }: { label: string; icon: HomeIconName; bg: string; fg: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ width: 78, alignItems: 'center', gap: 6, opacity: pressed ? 0.8 : 1 })}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <HomeIcon name={icon} size={28} color={fg} />
      </View>
      <T v="xbold" numberOfLines={1} style={{ fontSize: 16, lineHeight: 20, color: C.ink }}>{label}</T>
    </Pressable>
  );
}

function AgoraCard({ ag, now, onAct, onOpenDose }: { ag: Agora; now: Date; onAct: () => void; onOpenDose: () => void }) {
  const it = ag.item;
  const late = ag.state === 'atrasado';
  const lateMed = late && it.kind === 'remedio' && it.source.type === 'dose';
  let badge = ag.badge;
  if (!late) {
    if (ag.state === 'agora') badge = 'AGORA';
    else if (it.time) {
      const [h, m] = it.time.split(':').map(Number);
      const diff = h * 60 + m - (now.getHours() * 60 + now.getMinutes());
      badge = `PRÓXIMO · ${inLabel(diff)}`;
    } else badge = 'HOJE';
  }
  const title = `${it.title}${it.time && !late ? ` · ${it.time}` : ''}`;
  const btn = lateMed ? 'Dar agora' : ag.action;
  const btnLabel = `${ag.action === 'Dar' ? 'Dar' : 'Marcar como feito'}: ${it.title}`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${badge.toLowerCase()}. ${title}`} disabled={!lateMed} onPress={onOpenDose}
      style={{
        marginTop: 12, minHeight: 76, borderRadius: 22, paddingVertical: 12, paddingLeft: late ? 12 : 16, paddingRight: 14,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: late ? C.redPale : C.cover, borderLeftWidth: late ? 6 : 0, borderLeftColor: C.red,
        shadowColor: late ? C.red : C.cover, shadowOpacity: late ? 0.14 : 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 4,
      }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: late ? C.white : C.amberPale, alignItems: 'center', justifyContent: 'center' }}>
        <HomeIcon name={kindIcon(it)} size={24} color={late ? C.red : '#7A5204'} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="monoBold" numberOfLines={1} style={{ fontSize: 12, lineHeight: 17, letterSpacing: 1, color: late ? '#8E2A1B' : C.goldLight }}>{badge}</T>
        <T v="xbold" numberOfLines={1} style={{ fontSize: 18, lineHeight: 24, color: late ? C.ink : C.white }}>{title}</T>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={lateMed ? `Dar ${it.title} agora` : btnLabel} onPress={onAct} hitSlop={4}
        style={({ pressed }) => ({ minHeight: 48, minWidth: late ? 96 : 76, borderRadius: 24, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: late ? (pressed ? C.coralInk : C.red) : (pressed ? C.paper : C.white) })}>
        <T v="xbold" numberOfLines={1} style={{ fontSize: 16, color: late ? C.white : C.cover }}>{btn}</T>
      </Pressable>
    </Pressable>
  );
}

function NextVaccineCard({ name, date, days, late }: { name: string; date: string; days: number; late: boolean }) {
  const d = fromDay(date);
  const mon = MONTH_NAMES[d.getMonth()].slice(0, 3).toUpperCase();
  const wd = WEEKDAY_NAMES[d.getDay()];
  const when = late ? `atrasada há ${-days} ${days === -1 ? 'dia' : 'dias'}` : days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`;
  const title = /^vacina/i.test(name) ? name : `Vacina ${name}`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Próxima vacina: ${name}, ${wd} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}, ${when}`} onPress={() => router.push(AGENDA_VACINAS as never)}
      style={({ pressed }) => ({ marginTop: 14, minHeight: 72, borderRadius: 22, backgroundColor: late ? C.redPale : pressed ? '#E6DCEE' : C.purplePale, paddingLeft: 10, paddingRight: 14, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 12 })}>
      <View style={{ width: 52, height: 58, borderRadius: 10, backgroundColor: C.white, overflow: 'hidden', alignItems: 'center', shadowColor: C.purpleInk, shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}>
        <View style={{ height: 18, alignSelf: 'stretch', backgroundColor: late ? C.red : C.purple, alignItems: 'center', justifyContent: 'center' }}>
          <T v="monoBold" style={{ fontSize: 12, lineHeight: 16, color: C.white, letterSpacing: 1 }}>{mon}</T>
        </View>
        <T v="serif" style={{ fontSize: 26, lineHeight: 38, color: late ? C.red : C.purpleInk }}>{String(d.getDate())}</T>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="xbold" numberOfLines={1} style={{ fontSize: 18, lineHeight: 24 }}>{title}</T>
        <T v="bold" numberOfLines={1} style={{ fontSize: 16, lineHeight: 21, color: late ? C.red : C.purpleInk }}>{`${wd} · ${when}`}</T>
      </View>
      <HomeIcon name="chevron" size={22} color={late ? C.red : C.purpleInk} sw={2.4} />
    </Pressable>
  );
}

function TodayRow({ it, onPress, last }: { it: TodayItem; onPress: () => void; last?: boolean }) {
  const late = !it.done && it.status === 'atrasado';
  const label = it.done
    ? `${it.title}${it.time ? ` às ${it.time}` : ''}: ${it.status === 'pulado' ? 'pulado' : 'feito'}. Tocar para desfazer`
    : `${it.title}${it.time ? ` às ${it.time}` : ''}${late ? ', atrasado' : ''}. Tocar para marcar como feito`;
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: it.done }} accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: last ? 0 : 1, borderColor: '#E6D8BA', backgroundColor: pressed ? 'rgba(239,227,200,0.6)' : 'transparent' })}>
      <T v="mono" style={{ width: 52, fontSize: 15, color: late ? C.red : C.inkSoft }}>{it.time ?? '—'}</T>
      <HomeIcon name={kindIcon(it)} size={22} color={it.done ? C.inkFaint : C.cover} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="xbold" numberOfLines={1} style={{ fontSize: 17, color: it.done ? C.inkSoft : C.ink, textDecorationLine: it.done ? 'line-through' : 'none' }}>{it.title}</T>
        {late ? <T v="bold" numberOfLines={1} style={{ fontSize: 15, color: C.red }}>Passou do horário</T> : null}
      </View>
      <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 2.5, borderColor: it.done ? C.green : C.inkFaint, backgroundColor: it.done ? C.green : C.white, alignItems: 'center', justifyContent: 'center' }}>
        {it.done ? <HomeIcon name="check" size={16} color={C.white} sw={3} /> : null}
      </View>
    </Pressable>
  );
}

function AddChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Adicionar ${label.toLowerCase()}`} onPress={onPress}
      style={({ pressed }) => ({ minHeight: 48, borderWidth: 2, borderColor: C.cover, borderRadius: 24, backgroundColor: pressed ? C.paper2 : C.white, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 })}>
      <HomeIcon name="plus" size={16} color={C.cover} sw={2.8} />
      <T v="xbold" style={{ fontSize: 16, color: C.cover }}>{label}</T>
    </Pressable>
  );
}

function MoreRow({ icon, label, onPress, last }: { icon: HomeIconName; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, borderBottomWidth: last ? 0 : 1, borderColor: '#E6D8BA', backgroundColor: pressed ? C.paper2 : 'transparent' })}>
      <HomeIcon name={icon} size={22} color={C.cover} />
      <T v="bold" style={{ flex: 1, fontSize: 17 }}>{label}</T>
      <HomeIcon name="chevron" size={18} color={C.inkSoft} sw={2.4} />
    </Pressable>
  );
}
