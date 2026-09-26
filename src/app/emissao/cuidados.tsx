import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/store/app';
import { T, styles as ui } from '@/components/ui';
import { Icon, type IconName } from '@/art/Icon';
import { CadIcon, type CadIconName } from '@/art/icons-cadastro';
import { ChapterFrame, IconBadge, QCount, QSub, QTitle } from '@/components/v11/cadastro/Frame';
import { CardOption, RadioOption } from '@/components/v11/cadastro/Options';
import { useCadastro } from '@/components/v11/cadastro/session';
import { finishChapter, petRef } from '@/components/v11/cadastro/flow';
import { FOOD_OPTIONS, foodChoice, mealTimesFor } from '@/domain/catalog';
import type { HistoryWhen } from '@/domain/itinerary';
import type { TeethCare } from '@/domain/types';
import { C, F } from '@/theme';

type Q = 'checkup' | 'dentes' | 'comida' | 'refeicoes' | 'horarios' | 'racao' | 'alergia' | 'doenca' | 'remedio';

const CHECKUP: { k: string; label: string; when?: HistoryWhen; answer: 'tomei' | 'nao' | 'naosei' }[] = [
  { k: 'mes', label: 'Este mês', when: 'mes', answer: 'tomei' },
  { k: 'semestre', label: 'De 1 a 6 meses atrás', when: 'semestre', answer: 'tomei' },
  { k: 'ano', label: 'De 6 a 12 meses atrás', when: 'ano', answer: 'tomei' },
  { k: 'mais', label: 'Mais de 1 ano atrás', when: 'mais', answer: 'tomei' },
  { k: 'nunca', label: 'Nunca levei', answer: 'nao' },
];

const TEETH: { k: string; label: string; care: TeethCare }[] = [
  { k: 'semana', label: 'Sim, toda semana', care: 'escova' },
  { k: 'asvezes', label: 'Às vezes', care: 'as_vezes' },
  { k: 'nunca', label: 'Nunca escovei', care: 'nao' },
];

const FOOD_ICON: Record<(typeof FOOD_OPTIONS)[number], IconName> = { Ração: 'bowl', 'Comida caseira': 'heart', 'Os dois': 'sparkle' };

function Ico({ name, color = C.goldDark, size = 40 }: { name: CadIconName | IconName; color?: string; size?: number }) {
  return (name as string) in { tooth: 1, checkup: 1, pill: 1, warn: 1 } ? <CadIcon name={name as CadIconName} size={size} color={color} /> : <Icon name={name as IconName} size={size} color={color} />;
}

/** Capítulo 5 · Outros cuidados: check-up, dentes, comida e saúde. Perguntas simples, uma por tela. */
export default function Cuidados() {
  const { q: qp } = useLocalSearchParams<{ q?: string }>();
  const d = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const answered = useCadastro((s) => s.answered);
  const answer = useCadastro((s) => s.answer);
  const [newTime, setNewTime] = useState('');
  const ref = petRef(d);
  const usesRacao = foodChoice(d.food) !== 'Comida caseira';

  const order: Q[] = ['checkup', 'dentes', 'comida', 'refeicoes', 'horarios', ...(usesRacao ? (['racao'] as Q[]) : []), 'alergia', 'doenca', 'remedio'];
  const q: Q = (order as string[]).includes(qp ?? '') ? (qp as Q) : 'checkup';
  const idx = order.indexOf(q);
  const next = () => {
    const n = order[idx + 1];
    if (n) router.push({ pathname: '/emissao/cuidados', params: { q: n } });
    else finishChapter(5);
  };
  const count = <QCount>{`PERGUNTA ${idx + 1} DE ${order.length}`}</QCount>;
  const head = (icon: CadIconName | IconName, title: string, sub?: string) => (
    <View style={{ gap: 12, alignItems: 'center' }}>
      <IconBadge size={88}><Ico name={icon} /></IconBadge>
      {count}
      <QTitle>{title}</QTitle>
      {sub ? <QSub>{sub}</QSub> : null}
    </View>
  );

  // ---------------------------------------------------------------- check-up
  if (q === 'checkup') {
    const v = answered['c:checkup'];
    const pick = (o: (typeof CHECKUP)[number] | null) => {
      answer('c:checkup', o?.k ?? 'naosei');
      setDraft({ answers: { ...d.answers, CHK: o?.answer ?? 'naosei' }, whens: { ...d.whens, CHK: o?.when } });
    };
    return (
      <ChapterFrame cap={5} onNext={next} disabled={!v}>
        {head('checkup', `Quando ${ref.o} foi ao veterinário para um check-up?`, 'Consulta de rotina, sem estar doente.')}
        <View style={{ gap: 8 }} accessibilityRole="radiogroup">
          {CHECKUP.map((o) => <RadioOption key={o.k} label={o.label} on={v === o.k} onPress={() => pick(o)} />)}
          <RadioOption label="Não sei" on={v === 'naosei'} onPress={() => pick(null)} />
        </View>
      </ChapterFrame>
    );
  }

  // ---------------------------------------------------------------- dentes
  if (q === 'dentes') {
    const v = answered['c:dentes'];
    return (
      <ChapterFrame cap={5} onNext={next} disabled={!v}>
        {head('tooth', `Você escova os dentes ${ref.do}?`)}
        <View style={{ gap: 8 }} accessibilityRole="radiogroup">
          {TEETH.map((o) => <RadioOption key={o.k} label={o.label} on={v === o.k} onPress={() => { answer('c:dentes', o.k); setDraft({ teethCare: o.care }); }} />)}
          <RadioOption label="Não sei" on={v === 'naosei'} onPress={() => { answer('c:dentes', 'naosei'); setDraft({ teethCare: 'nao_sei' }); }} />
        </View>
        {v && v !== 'semana' ? (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: C.goldPale, borderRadius: 14, padding: 12 }}>
            <CadIcon name="bulb" size={20} color={C.goldDark} />
            <T v="bold" style={{ flex: 1, fontSize: 16, lineHeight: 21, color: C.goldDark }}>Dica: escovar 3 vezes por semana, com pasta de pet, evita tártaro e mau hálito.</T>
          </View>
        ) : null}
      </ChapterFrame>
    );
  }

  // ---------------------------------------------------------------- comida
  if (q === 'comida') {
    const v = answered['c:comida'];
    const choice = foodChoice(d.food);
    return (
      <ChapterFrame cap={5} onNext={next} disabled={!v}>
        {head('bowl', `O que ${ref.o} come?`)}
        <View style={{ gap: 12 }} accessibilityRole="radiogroup">
          {FOOD_OPTIONS.map((o) => (
            <CardOption key={o} label={o} on={v === 'sim' && choice === o} onPress={() => { setDraft({ food: o }); answer('c:comida', 'sim'); }}
              icon={<Icon name={FOOD_ICON[o]} size={26} color={v === 'sim' && choice === o ? C.cover : C.inkSoft} />} />
          ))}
          <CardOption label="Não sei" on={v === 'naosei'} onPress={() => { setDraft({ food: 'Ração' }); answer('c:comida', 'naosei'); }} icon={<CadIcon name="question" size={26} color={C.inkSoft} />} />
        </View>
      </ChapterFrame>
    );
  }

  // ---------------------------------------------------------------- refeições
  if (q === 'refeicoes') {
    const v = answered['c:refeicoes'];
    return (
      <ChapterFrame cap={5} onNext={next} disabled={!v}>
        {head('clock', `Quantas vezes por dia ${ref.o} come?`)}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityRole="radiogroup">
          {[1, 2, 3, 4].map((k) => {
            const on = v === String(k);
            return (
              <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${k} ${k === 1 ? 'vez' : 'vezes'} por dia`}
                onPress={() => { setDraft({ mealsPerDay: k, mealTimes: mealTimesFor(k) }); answer('c:refeicoes', String(k)); }}
                style={{ width: '47%', flexGrow: 1, minHeight: 76, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2.5 : 1.5, borderColor: on ? C.cover : C.line, backgroundColor: on ? C.aquaPale : '#FFFFFF' }}>
                <T style={{ fontFamily: F.bodyBlack, fontSize: 28, color: C.ink }}>{`${k}x`}</T>
                <T style={{ fontSize: 16, color: C.inkSoft }}>por dia</T>
              </Pressable>
            );
          })}
        </View>
        <RadioOption label="Não sei" sub="Adultos costumam comer 2 vezes; filhotes, 3 ou 4." on={v === 'naosei'} onPress={() => { setDraft({ mealsPerDay: null }); answer('c:refeicoes', 'naosei'); }} />
      </ChapterFrame>
    );
  }

  // ---------------------------------------------------------------- horários
  if (q === 'horarios') {
    const addTime = () => {
      const m = newTime.trim().match(/^(\d{1,2})(?::?(\d{2}))?$/);
      const h = m ? Number(m[1]) : 99;
      const mi = m ? Number(m[2] ?? '0') : 99;
      if (!m || h > 23 || mi > 59) { useApp.getState().showToast('Horário inválido. Escreva assim: 12:30'); return; }
      const t = `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
      if (!d.mealTimes.includes(t)) setDraft({ mealTimes: [...d.mealTimes, t].sort(), ...(d.mealsPerDay !== null ? { mealsPerDay: d.mealTimes.length + 1 } : {}) });
      setNewTime('');
    };
    const removeTime = (t: string) => {
      if (d.mealTimes.length <= 1) return useApp.getState().showToast('Deixe pelo menos um horário.');
      setDraft({ mealTimes: d.mealTimes.filter((x) => x !== t), ...(d.mealsPerDay !== null ? { mealsPerDay: d.mealTimes.length - 1 } : {}) });
    };
    return (
      <ChapterFrame cap={5} onNext={next}>
        {head('clock', 'Em que horários?', 'O celular avisa na hora da comida. Toque num horário para tirar.')}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {d.mealTimes.map((t) => (
            <Pressable key={t} accessibilityRole="button" accessibilityLabel={`Tirar o horário ${t}`} onPress={() => removeTime(t)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, paddingHorizontal: 16, borderRadius: 14, backgroundColor: C.cover }}>
              <Icon name="clock" size={20} color={C.goldPale} />
              <T v="xbold" style={{ fontSize: 20, color: C.goldPale }}>{t}</T>
              <Icon name="close" size={16} color={C.goldLight} sw={2.6} />
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TextInput maxFontSizeMultiplier={1.15} value={newTime} onChangeText={setNewTime} placeholder="Ex.: 12:00" placeholderTextColor={C.inkFaint} keyboardType="numbers-and-punctuation" onSubmitEditing={addTime} accessibilityLabel="Novo horário"
            style={[ui.input, { flex: 1, fontFamily: F.bodyBold }]} />
          <Pressable accessibilityRole="button" accessibilityLabel="Adicionar horário" onPress={addTime}
            style={{ minHeight: 56, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: C.cover, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="plus" size={20} color={C.cover} sw={2.6} />
            <T v="xbold" style={{ fontSize: 16, color: C.cover }}>Adicionar</T>
          </Pressable>
        </View>
        <QSub>Não sabe? Pode seguir: deixamos horários comuns e você muda depois.</QSub>
      </ChapterFrame>
    );
  }

  // ---------------------------------------------------------------- ração
  if (q === 'racao') {
    const unknown = d.gramsUnknown;
    const g = parseInt(d.grams, 10);
    const meals = d.mealsPerDay || d.mealTimes.length;
    const perMeal = !unknown && g > 0 && meals ? Math.round(g / meals) : null;
    return (
      <ChapterFrame cap={5} onNext={next} disabled={!unknown && !(g > 0)}>
        {head('bowl', 'Quanto de ração por dia?')}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <TextInput maxFontSizeMultiplier={1.15} value={unknown ? '' : d.grams} editable={!unknown} onChangeText={(t) => setDraft({ grams: t.replace(/\D/g, '').slice(0, 4), gramsUnknown: false })} keyboardType="number-pad"
            placeholder="Ex.: 300" placeholderTextColor={C.inkFaint} accessibilityLabel="Gramas de ração por dia"
            style={[ui.input, { width: 150, fontSize: 24, textAlign: 'center', minHeight: 64, opacity: unknown ? 0.4 : 1 }]} />
          <T v="xbold" style={{ fontSize: 20 }}>gramas</T>
        </View>
        {perMeal ? <QSub>{`Dá ${perMeal} g em cada refeição.`}</QSub> : null}
        <RadioOption label="Não sei" sub="Dica: no verso do pacote tem uma tabela pelo peso do pet." on={unknown} onPress={() => setDraft({ gramsUnknown: !unknown, ...(unknown ? {} : { grams: '' }) })} />
      </ChapterFrame>
    );
  }

  // ---------------------------------------------------------------- alergia / doença / remédio
  const cfg = {
    alergia: { field: 'allergies' as const, icon: 'warn' as const, title: `${ref.O} tem alguma alergia?`, ph: 'Qual? Ex.: frango' },
    doenca: { field: 'conditions' as const, icon: 'heart' as const, title: `${ref.O} tem alguma doença?`, ph: 'Qual? Ex.: diabetes' },
    remedio: { field: 'meds' as const, icon: 'pill' as const, title: `${ref.O} toma algum remédio todo dia?`, ph: 'Qual? Ex.: nome e horário' },
  }[q];
  const key = `c:${q}`;
  const v = answered[key] ?? (d[cfg.field].trim() ? 'sim' : undefined);
  const text = d[cfg.field];
  const ok = v === 'nao' || v === 'naosei' || (v === 'sim' && text.trim().length >= 2);
  const set = (k: 'sim' | 'nao' | 'naosei') => { answer(key, k); if (k !== 'sim') setDraft({ [cfg.field]: '' } as never); };
  return (
    <ChapterFrame cap={5} onNext={next} disabled={!ok} nextLabel={idx === order.length - 1 ? 'Terminar o capítulo' : 'Continuar'}>
      {head(cfg.icon, cfg.title)}
      <View style={{ gap: 8 }} accessibilityRole="radiogroup">
        <RadioOption label="Não" on={v === 'nao'} onPress={() => set('nao')} />
        <RadioOption label="Sim" on={v === 'sim'} onPress={() => set('sim')}>
          <TextInput maxFontSizeMultiplier={1.15} value={text} onChangeText={(t) => setDraft({ [cfg.field]: t } as never)} placeholder={cfg.ph} placeholderTextColor={C.inkFaint}
            accessibilityLabel={`${cfg.title} Qual?`} autoFocus={!text} style={ui.input} />
        </RadioOption>
        <RadioOption label="Não sei" on={v === 'naosei'} onPress={() => set('naosei')} />
      </View>
    </ChapterFrame>
  );
}
