import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/store/app';
import { EmissionPage } from '@/components/emission';
import { InfoNote, SectionTitle, T } from '@/components/ui';
import { CircleStamp, EmptyStamp, RectStamp } from '@/art/Stamp';
import { careWords, emissionCareTypes, type CareType } from '@/domain/catalog';
import { WHEN_OPTIONS } from '@/domain/itinerary';
import { Icon } from '@/art/Icon';
import type { HistoryAnswer } from '@/domain/types';
import { C } from '@/theme';
import { art } from '@/domain/words';

const optsFor = (t: CareType): { k: HistoryAnswer; label: string; color: string; bg: string }[] => {
  const w = careWords(t.category);
  return [
    { k: 'tomei', label: w.done, color: C.green, bg: C.greenPale },
    { k: 'nao', label: w.notYet, color: C.amber, bg: C.amberPale },
    { k: 'naosei', label: 'Não sei', color: C.inkSoft, bg: C.paper3 },
  ];
};

function Slot({ a, code, seed, exam }: { a?: HistoryAnswer; code: string; seed: number; exam?: boolean }) {
  if (a === 'tomei') return <CircleStamp top={exam ? 'JÁ FEITO' : 'JÁ APLICADO'} bottom="PATAPORTE" main={code} color={C.blue} size={66} rotation={(seed % 18) - 10} seed={seed} />;
  if (a === 'nao') return <RectStamp lines={['AGENDAR']} color={C.amber} width={72} height={30} rotation={7} seed={seed} bigIndex={-1} />;
  if (a === 'naosei') return <EmptyStamp size={58} label="?" />;
  return <EmptyStamp size={58} />;
}

export default function Historico() {
  const d = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const emit = useApp((s) => s.emitPassport);
  const [busy, setBusy] = useState(false);
  const types = emissionCareTypes(d.species, d.neutered);
  const answered = types.filter((t) => d.answers[t.code]).length;

  const answer = (code: string, k: HistoryAnswer) => setDraft({ answers: { ...d.answers, [code]: d.answers[code] === k ? undefined : k }, whens: k === 'tomei' ? { ...d.whens, [code]: d.whens[code] ?? 'mes' } : d.whens });
  const setWhen = (code: string, w: (typeof WHEN_OPTIONS)[number]['k']) => setDraft({ whens: { ...d.whens, [code]: w } });
  const catIcon = (c: CareType['category']) => (c === 'vacina' ? 'drop' : c === 'exame' ? 'doc' : c === 'outro' ? 'heart' : 'shield') as 'drop';

  const groups: [string, CareType[]][] = [
    ['Vacinas', types.filter((t) => t.category === 'vacina')],
    ['Vermífugos e antiparasitários', types.filter((t) => t.category === 'vermifugo' || t.category === 'antiparasitario')],
    ['Outros cuidados', types.filter((t) => t.category === 'exame' || t.category === 'outro')],
  ];

  const submit = async () => {
    setBusy(true);
    try {
      await emit();
      router.replace('/emitido');
    } catch {
      setBusy(false);
      useApp.getState().showToast('Não foi possível emitir. Verifique a internet e tente de novo.');
    }
  };

  return (
    <EmissionPage step={8} title="Vacinas e cuidados" onNext={submit} nextLabel={busy ? 'Emitindo…' : `Gerar a carteira ${d.name ? `${art(d).do} ${d.name}` : 'do pet'}`} disabled={busy}
      extraFooter={<T v="bold" style={{ fontSize: 15, color: C.inkSoft, textAlign: 'center' }}>{`${answered} de ${types.length} respondidos`}</T>}>
      <T style={{ fontSize: 17, lineHeight: 24, color: C.inkSoft, marginBottom: 12 }}>
        {`Marque o que ${d.name ? `${art(d).o} ${d.name}` : 'o pet'} já fez. Nós calculamos a próxima data e avisamos antes.`}
      </T>
      <View style={{ marginBottom: 12 }}><InfoNote icon="bell" text="Não sabe? Tudo bem. Marque “Não sei” e confirme depois com o veterinário." /></View>
      {groups.filter(([, l]) => l.length).map(([title, list]) => (
        <View key={title} style={{ marginBottom: 8 }}>
          <SectionTitle>{title}</SectionTitle>
          <View style={{ gap: 10 }}>
            {list.map((t, i) => {
              const a = d.answers[t.code];
              return (
                <View key={t.code} style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.cover, alignItems: 'center', justifyContent: 'center' }}><Icon name={catIcon(t.category)} size={18} color={C.goldPale} /></View>
                    <View style={{ flex: 1 }}><T v="xbold" style={{ fontSize: 18, lineHeight: 23 }}>{t.name}</T><T style={{ fontSize: 15, color: C.inkSoft, lineHeight: 20 }}>{t.hint}</T></View>
                    <View style={{ width: 72, alignItems: 'center' }}><Slot a={a} code={t.code} seed={61 + i} exam={t.category === 'exame'} /></View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {optsFor(t).map((o) => {
                      const on = a === o.k;
                      return (
                        <Pressable key={o.k} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${t.name}: ${o.label}`} onPress={() => answer(t.code, o.k)}
                          style={{ flex: 1, minHeight: 60, paddingHorizontal: 4, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 2, borderColor: on ? o.color : C.line, backgroundColor: on ? o.bg : '#FFFFFF' }}>
                          {on ? <Icon name="check" size={16} color={o.color} sw={3} /> : null}
                          <T v="bold" style={{ fontSize: 15.5, lineHeight: 19, textAlign: 'center', color: on ? o.color : C.ink }}>{o.label}</T>
                        </Pressable>
                      );
                    })}
                  </View>
                  {a === 'tomei' && (
                    <View style={{ gap: 6 }}>
                      <T v="xbold" style={{ fontSize: 16.5 }}>{careWords(t.category).when}</T>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {WHEN_OPTIONS.map((w) => {
                          const on = (d.whens[t.code] ?? 'mes') === w.k;
                          return (
                            <Pressable key={w.k} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${t.name}: ${w.label}`} onPress={() => setWhen(t.code, w.k)}
                              style={{ minHeight: 50, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', borderWidth: 2, borderColor: on ? C.green : C.line, backgroundColor: on ? C.greenPale : '#FFFFFF' }}>
                              <T v="bold" style={{ fontSize: 16, color: on ? C.green : C.ink }}>{w.label}</T>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </EmissionPage>
  );
}
