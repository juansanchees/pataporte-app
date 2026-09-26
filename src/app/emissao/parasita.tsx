import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/store/app';
import { T } from '@/components/ui';
import { Icon } from '@/art/Icon';
import { CadIcon } from '@/art/icons-cadastro';
import { ChapterFrame, QSub, QTitle, VetNote } from '@/components/v11/cadastro/Frame';
import { LastAnswerPicker } from '@/components/v11/cadastro/LastAnswerPicker';
import { useCadastro } from '@/components/v11/cadastro/session';
import { finishChapter, petRef, shortDate } from '@/components/v11/cadastro/flow';
import { DURATION_OPTIONS, nextFromDuration, type ParasiteKind } from '@/domain/parasites';
import { MONTH_NAMES, WEEKDAY_NAMES, fromDay, today } from '@/domain/dates';
import type { LastAnswer, ParasiteDuration } from '@/domain/types';
import { C } from '@/theme';

const META: Record<ParasiteKind, { tag: string; the: string; bg: string; fg: string; icon: 'bug' | 'pill' }> = {
  antipulgas: { tag: 'ANTIPULGAS E CARRAPATOS', the: 'o último antipulgas', bg: C.coralPale, fg: C.coralInk, icon: 'bug' },
  vermifugo: { tag: 'VERMÍFUGO', the: 'o último vermífugo', bg: C.aquaPale, fg: C.aquaInk, icon: 'pill' },
};

function Tag({ kind }: { kind: ParasiteKind }) {
  const m = META[kind];
  return (
    <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: m.bg, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}>
      <CadIcon name={m.icon} size={18} color={m.fg} />
      <T v="eyebrow" style={{ fontSize: 13, color: m.fg, fontWeight: '700' }}>{m.tag}</T>
    </View>
  );
}

/** Capítulo 4 · vermífugo e antipulgas, SEPARADOS: Quando foi? (Dur-Quando) → Quanto tempo protege? (Dur-Duracao) → Próximo (Dur-Resultado). */
export default function Parasita() {
  const { kind: kp, fase } = useLocalSearchParams<{ kind?: string; fase?: string }>();
  const kind: ParasiteKind = kp === 'vermifugo' ? 'vermifugo' : 'antipulgas';
  const d = useApp((s) => s.draft);
  const saved = d.parasites?.[kind];
  const fromCard = useCadastro((s) => !!s.fromCard[kind]);
  const [last, setLast] = useState<LastAnswer | null>(saved?.last ?? null);
  const durKey = `dur:${kind}`;
  const durAnswered = useCadastro((s) => !!s.answered[durKey]);
  const [dur, setDurState] = useState<ParasiteDuration | null>(saved && durAnswered ? saved.duration : null);
  const setDur = (v: ParasiteDuration) => { setDurState(v); useCadastro.getState().answer(durKey, String(v)); };
  const ref = petRef(d);
  const t = today();
  const go = (f: string, k: ParasiteKind = kind) => router.push({ pathname: '/emissao/parasita', params: { kind: k, fase: f } });

  // ---------------------------------------------------------------- quando
  if (fase !== 'duracao' && fase !== 'resultado') {
    const needsDuration = !!last && (last.kind === 'data' || last.kind === 'mes' || last.kind === 'naolembro');
    const next = () => {
      if (!last) return;
      useApp.getState().setDraftParasite(kind, last, saved?.duration ?? 'naosei');
      go(needsDuration ? 'duracao' : 'resultado');
    };
    return (
      <ChapterFrame cap={4} onNext={next} disabled={!last} justify="center" gap={14}>
        <Tag kind={kind} />
        {fromCard ? <T v="eyebrow" style={{ fontSize: 12, color: C.aquaInk, textAlign: 'center' }}>LIDO DA CARTEIRINHA · CONFIRA</T> : null}
        <QTitle>{`Quando ${ref.o} tomou ${META[kind].the}?`}</QTitle>
        {kind === 'antipulgas' ? <T v="eyebrow" style={{ fontSize: 13, textAlign: 'center' }}>Depois: vermífugo</T> : null}
        <LastAnswerPicker scope="mes" value={saved?.last} onChange={setLast} pairLast
          preview={(a) => (a.kind === 'data' || a.kind === 'mes' || a.kind === 'naolembro') ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.goldPale, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
              <Icon name="info" size={18} color={C.goldDark} />
              <T v="bold" style={{ flex: 1, fontSize: 16, color: C.goldDark }}>Agora me diga quanto tempo ele protege.</T>
            </View>
          ) : null} />
      </ChapterFrame>
    );
  }

  // ---------------------------------------------------------------- duração
  if (fase === 'duracao') {
    const next = () => {
      if (!dur || !saved) return;
      useApp.getState().setDraftParasite(kind, saved.last, dur);
      go('resultado');
    };
    const card = (o: (typeof DURATION_OPTIONS)[number], wide?: boolean) => {
      const on = dur === o.value;
      return (
        <Pressable key={String(o.value)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${o.label}, ${o.sub}`} onPress={() => setDur(o.value)}
          style={({ pressed }) => ({ width: wide ? '100%' : '48%', flexGrow: wide ? 0 : 1, minHeight: wide ? 64 : 100, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 10,
            alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2.5 : 1.5, borderColor: on ? C.cover : C.line, backgroundColor: on ? C.aquaPale : '#FFFFFF', opacity: pressed ? 0.85 : 1 })}>
          {on ? <View style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: C.cover, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={14} color="#FFFFFF" sw={3} /></View> : null}
          <T style={{ fontFamily: 'Nunito_900Black', fontSize: wide ? 20 : 26, color: C.ink }}>{o.label}</T>
          <T style={{ fontSize: 16, lineHeight: 19, color: C.inkSoft, textAlign: 'center', marginTop: 2 }}>{o.sub}</T>
        </Pressable>
      );
    };
    return (
      <ChapterFrame cap={4} onNext={next} disabled={!dur} justify="center" gap={14}>
        <Tag kind={kind} />
        <QTitle>Quanto tempo ele protege?</QTitle>
        <QSub>Está escrito na caixa. Se não souber, tudo bem.</QSub>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityRole="radiogroup">
          {DURATION_OPTIONS.filter((o) => o.value !== 'naosei').map((o) => card(o))}
          {DURATION_OPTIONS.filter((o) => o.value === 'naosei').map((o) => card(o, true))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.goldPale, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Icon name="info" size={18} color={C.goldDark} />
          <T v="bold" style={{ flex: 1, fontSize: 16, color: C.goldDark }}>Confira sempre com o veterinário.</T>
        </View>
      </ChapterFrame>
    );
  }

  // ---------------------------------------------------------------- resultado
  if (!saved) return null;
  const r = nextFromDuration(saved.last, saved.duration, t);
  const nd = fromDay(r.next);
  const next = () => (kind === 'antipulgas' ? go('quando', 'vermifugo') : finishChapter(4));
  return (
    <ChapterFrame cap={4} onNext={next} justify="flex-start" gap={0}
      footerTop={kind === 'antipulgas' ? <T v="serif" style={{ fontSize: 22, color: C.ink, marginBottom: 6 }}>Agora o vermífugo</T> : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 18, marginTop: 16 }}
        accessible accessibilityLabel={`Próximo ${kind === 'antipulgas' ? 'antipulgas' : 'vermífugo'}: ${r.labelLong}, ${r.relLabel}`}>
        <View style={{ width: 108, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.line }}>
          <View style={{ backgroundColor: C.coral, height: 34, alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 14, color: '#FFFFFF', letterSpacing: 1.5 }}>{MONTH_NAMES[nd.getMonth()].slice(0, 3).toUpperCase()}</T>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', paddingTop: 8, paddingBottom: 12, alignItems: 'center' }}>
            <T v="serif" style={{ fontSize: 52, lineHeight: 56 }}>{String(nd.getDate())}</T>
            <T style={{ fontSize: 16, color: C.inkSoft }}>{WEEKDAY_NAMES[nd.getDay()]}</T>
          </View>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <T v="eyebrow" style={{ fontSize: 12 }}>{kind === 'antipulgas' ? 'PRÓXIMO ANTIPULGAS' : 'PRÓXIMO VERMÍFUGO'}</T>
          <T v="xbold" style={{ fontSize: 24, lineHeight: 29 }}>{r.label}</T>
          <T style={{ fontSize: 18, color: C.inkSoft }}>{r.relLabel}</T>
        </View>
      </View>

      {r.overdue ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: C.amberPale, borderRadius: 14, padding: 12, marginTop: 14 }}>
          <CadIcon name="warn" size={20} color={C.amber} />
          <T v="bold" style={{ flex: 1, fontSize: 16, lineHeight: 21, color: C.goldDark }}>{last?.kind === 'nunca' || saved.last.kind === 'nunca' ? 'Ainda não tomou: o ideal é dar logo. Pergunte ao veterinário qual usar.' : 'Está na hora: o ideal é dar o quanto antes.'}</T>
        </View>
      ) : null}

      <View style={{ marginTop: 24, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {r.last ? <><View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: C.green }} /><View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: C.green, marginHorizontal: 4 }} /></> : null}
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: C.cover }} />
          <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: C.line, marginHorizontal: 4 }} />
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: C.gold }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {r.last ? <T v="eyebrow" style={{ fontSize: 12, color: C.green, textTransform: 'none' }}>{`Tomou · ${shortDate(r.last)}`}</T> : null}
          <T v="eyebrow" style={{ fontSize: 12, color: C.cover, textTransform: 'none' }}>Hoje</T>
          <T v="eyebrow" style={{ fontSize: 12, color: C.goldDark, textTransform: 'none' }}>{`Próximo · ${shortDate(r.next)}`}</T>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22 }}>
        <Icon name="bell" size={20} color={C.inkSoft} />
        <T style={{ fontSize: 16, color: C.inkSoft }}>Vamos te lembrar 3 dias antes.</T>
      </View>
      <View style={{ marginTop: 16 }}><VetNote text="Não é documento oficial. Confirme com o veterinário." /></View>
    </ChapterFrame>
  );
}
