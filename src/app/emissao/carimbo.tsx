import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/store/app';
import { T } from '@/components/ui';
import { CircleStamp } from '@/art/Stamp';
import { ChapterFrame } from '@/components/v11/cadastro/Frame';
import { useCadastro } from '@/components/v11/cadastro/session';
import { draftPet, petRef, stampDate, startChapter } from '@/components/v11/cadastro/flow';
import { track } from '@/services/analytics';
import { ageLabel } from '@/domain/vaccines';
import { nextFromDuration } from '@/domain/parasites';
import { diffDays, fmtDayMonth, parseBR, today } from '@/domain/dates';
import { foodLabel } from '@/domain/catalog';
import { C } from '@/theme';

type Line = { color: string; name: string; info: string };

const STAMP_WORD = ['QUEM É VOCÊ', 'PERSONALIDADE', 'VACINAS', 'PARASITAS', 'CUIDADOS'];
const TITLES = (nome: string) => [`${nome} registrado!`, 'Personalidade carimbada!', 'Vacinas carimbadas!', 'Proteção carimbada!', 'Tudo pronto!'];

/** Cap-Carimbo: carimbo animado "Capítulo X concluído" + resumo. No capítulo 5, emite o passaporte. */
export default function Carimbo() {
  const { cap: cp } = useLocalSearchParams<{ cap?: string }>();
  const cap = Math.min(5, Math.max(1, Number(cp) || 1));
  const d = useApp((s) => s.draft);
  const emit = useApp((s) => s.emitPassport);
  const answered = useCadastro((s) => s.answered);
  const [busy, setBusy] = useState(false);
  const drop = useState(() => new Animated.Value(0))[0];
  const ring = useState(() => new Animated.Value(0))[0];
  const t = today();
  const ref = petRef(d);
  const name = d.name.trim() || 'Seu pet';

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then((reduce) => {
      if (!alive) return;
      if (reduce) { drop.setValue(1); ring.setValue(1); return; }
      Animated.sequence([
        Animated.delay(150),
        Animated.timing(drop, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(1.8)), useNativeDriver: true }),
        Animated.timing(ring, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
      setTimeout(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); }, 520);
    });
    return () => { alive = false; };
  }, [drop, ring]);

  // ---------------------------------------------------------------- resumo por capítulo
  const lines: Line[] = [];
  let sub = '';
  if (cap === 1) {
    const birth = parseBR(d.birth);
    lines.push({ color: C.green, name: 'Raça', info: d.breed === 'SRD' ? 'SRD (sem raça definida)' : d.breed });
    if (birth) lines.push({ color: C.green, name: 'Idade', info: ageLabel(birth, t) });
    lines.push({ color: d.weight ? C.green : C.inkFaint, name: 'Peso', info: d.weight ? `${d.weight} kg` : 'pesar depois' });
    sub = `A página de identificação ${ref.do} está pronta.`;
  } else if (cap === 2) {
    const tags = d.temperament.length ? d.temperament : ['Jeito único'];
    tags.slice(0, 4).forEach((x) => lines.push({ color: C.purple, name: x, info: '' }));
    sub = 'O Guia IA vai usar isso para dar dicas certeiras.';
  } else if (cap === 3) {
    const plan = useApp.getState().vaccinePlanNow();
    let thisMonth = 0;
    for (const it of plan?.items ?? []) {
      const due = it.nextDate ? diffDays(t, it.nextDate) : null;
      if (it.status === 'faltando' && due !== null && due <= 31) thisMonth++;
      lines.push(it.status === 'em_dia'
        ? { color: C.green, name: it.vaccine.short, info: 'em dia' }
        : it.status === 'opcional'
          ? { color: C.purple, name: it.vaccine.short, info: 'opcional' }
          : { color: due !== null && due <= 31 ? C.amber : C.red, name: it.vaccine.short, info: it.nextDate ? `próxima ${fmtDayMonth(it.nextDate)}` : 'falta tomar' });
    }
    sub = thisMonth ? `${ref.O} tem ${thisMonth} ${thisMonth === 1 ? 'vacina' : 'vacinas'} para este mês. Vai tudo para a agenda.` : 'Vai tudo para a agenda, com aviso antes.';
  } else if (cap === 4) {
    for (const [k, label] of [['antipulgas', 'Antipulgas'], ['vermifugo', 'Vermífugo']] as const) {
      const p = d.parasites?.[k];
      if (!p) continue;
      const r = nextFromDuration(p.last, p.duration, t);
      lines.push({ color: r.overdue ? C.amber : C.green, name: label, info: r.overdue ? 'dar o quanto antes' : `próximo ${r.label}` });
    }
    sub = 'Anotamos as próximas datas na agenda.';
  } else {
    lines.push({ color: C.green, name: 'Comida', info: foodLabel(d.food).toLowerCase() });
    lines.push({ color: C.green, name: 'Horários', info: d.mealTimes.join(' · ') });
    lines.push({ color: answered['c:checkup'] && answered['c:checkup'] !== 'naosei' && answered['c:checkup'] !== 'nunca' ? C.green : C.amber, name: 'Check-up', info: answered['c:checkup'] === 'mais' || answered['c:checkup'] === 'nunca' ? 'marcar consulta' : 'anotado' });
    sub = `Agora é só emitir o passaporte ${ref.do}.`;
  }

  const onNext = async () => {
    if (cap < 5) { startChapter(cap + 1); return; }
    setBusy(true);
    try {
      const pet = draftPet(d);
      await emit();
      track('cadastro_concluido', { especie: pet.species, vacinas: Object.keys(d.vaccineAnswers ?? {}).length });
      useCadastro.getState().reset();
      router.replace('/emitido');
    } catch {
      setBusy(false);
      useApp.getState().showToast('Não foi possível emitir. Verifique a internet e tente de novo.');
    }
  };

  const scale = drop.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] });
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.5] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.6, 0] });

  return (
    <ChapterFrame cap={cap} done back={false} onNext={onNext} loading={busy} justify="flex-start" padH={20}
      nextLabel={cap < 5 ? `Ir para o capítulo ${cap + 1}` : busy ? 'Emitindo…' : `Emitir o passaporte ${ref.do}`}>
      <View style={{ flexGrow: 1, backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingHorizontal: 20, paddingTop: 26, paddingBottom: 20, alignItems: 'center', overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 70, left: 20, right: 20, height: 1, backgroundColor: C.paper2 }} />
        <View style={{ position: 'absolute', top: 90, left: 20, right: 20, height: 1, backgroundColor: C.paper2 }} />
        <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View pointerEvents="none" style={{ position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 4, borderColor: C.gold, opacity: ringOpacity, transform: [{ scale: ringScale }] }} />
          <Animated.View style={{ opacity: drop, transform: [{ scale }] }}>
            <CircleStamp top={`CAPÍTULO ${cap}`} bottom="CONCLUÍDO" main={STAMP_WORD[cap - 1]} sub={stampDate(t)} color={C.green} size={176} rotation={-10} seed={40 + cap} />
          </Animated.View>
        </View>
        <T v="serif" accessibilityRole="header" style={{ fontSize: 30, lineHeight: 36, color: C.cover, textAlign: 'center', marginTop: 16 }}>{TITLES(name)[cap - 1]}</T>
        <T style={{ fontSize: 18, lineHeight: 25, color: C.inkSoft, textAlign: 'center', marginTop: 8 }}>{sub}</T>
        <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 18 }} accessible accessibilityLabel={lines.map((l) => `${l.name} ${l.info}`).join('. ')}>
          {lines.map((l, k) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: l.color }} />
              <T v="bold" style={{ flex: 1, fontSize: 16.5 }}>{l.name}{l.info ? <T style={{ fontSize: 16.5, color: C.inkSoft }}>{` · ${l.info}`}</T> : null}</T>
            </View>
          ))}
        </View>
      </View>
    </ChapterFrame>
  );
}
