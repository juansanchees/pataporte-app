import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/store/app';
import { T, ChipRow, styles as ui } from '@/components/ui';
import { PetPhoto } from '@/components/passport';
import { Icon } from '@/art/Icon';
import { CadIcon } from '@/art/icons-cadastro';
import { ChapterFrame, IconBadge, QSub, QTitle } from '@/components/v11/cadastro/Frame';
import { CardOption, DateBoxes, NameField, Pill, RadioOption } from '@/components/v11/cadastro/Options';
import { useCadastro } from '@/components/v11/cadastro/session';
import { finishChapter, petRef } from '@/components/v11/cadastro/flow';
import { addDays, addMonths, fmtBR, parseBR, today } from '@/domain/dates';
import { breedsFor } from '@/domain/catalog';
import { sizeFor } from '@/domain/breeds';
import type { PetSize } from '@/domain/types';
import { C } from '@/theme';

type Q = 'nome' | 'sexo' | 'nascimento' | 'peso' | 'castrado' | 'porte' | 'parece';

const AGES = [
  { k: 'filhote', label: 'Menos de 4 meses', months: 2 },
  { k: 'jovem', label: '4 a 12 meses', months: 8 },
  { k: 'adulto', label: '1 a 7 anos', months: 36 },
  { k: 'idoso', label: 'Mais de 7 anos', months: 108 },
];

const SIZES: [PetSize, string, string][] = [['pequeno', 'Pequeno', 'até 10 kg'], ['médio', 'Médio', '10 a 25 kg'], ['grande', 'Grande', 'mais de 25 kg']];

/** Capítulo 1 · "Quem é você": nome, sexo, nascimento, peso, castrado, porte (e com que raça parece, se SRD). Uma pergunta por tela. */
export default function Sobre() {
  const { q: qp } = useLocalSearchParams<{ q?: string }>();
  const d = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const answered = useCadastro((s) => s.answered);
  const answer = useCadastro((s) => s.answer);
  const [err, setErr] = useState('');
  const ref = petRef(d);
  const fem = d.sex === 'F';

  const order: Q[] = ['nome', 'sexo', 'nascimento', 'peso', 'castrado', 'porte', ...(d.breed === 'SRD' ? (['parece'] as Q[]) : [])];
  const q: Q = (order as string[]).includes(qp ?? '') ? (qp as Q) : 'nome';
  const idx = order.indexOf(q);
  const next = () => {
    setErr('');
    const n = order[idx + 1];
    if (n) router.push({ pathname: '/emissao/sobre', params: { q: n } });
    else finishChapter(1);
  };

  // ---------------------------------------------------------------- nome
  if (q === 'nome') {
    const ok = d.name.trim().length >= 2;
    return (
      <ChapterFrame cap={1} onNext={() => { setDraft({ name: d.name.trim().replace(/\s+/g, ' ') }); next(); }} disabled={!ok}>
        <View style={{ alignItems: 'center' }}>
          <PetPhoto pet={{ species: d.species, coat: d.coat, details: d.details, equipped: [], photoUri: d.photoUri || undefined }} w={112} h={140} photo={!!d.photoUri} />
        </View>
        <QTitle>{d.species === 'dog' ? 'Qual é o nome do seu cão?' : 'Qual é o nome do seu gato?'}</QTitle>
        <NameField value={d.name} onChange={(v) => setDraft({ name: v })} />
        <QSub>Do jeito que você chama em casa.</QSub>
      </ChapterFrame>
    );
  }

  // ---------------------------------------------------------------- sexo
  if (q === 'sexo') {
    const v = answered.sexo;
    return (
      <ChapterFrame cap={1} onNext={next} disabled={!v}>
        <QTitle>{`${d.name} é macho ou fêmea?`}</QTitle>
        <View style={{ gap: 12 }} accessibilityRole="radiogroup">
          <CardOption label="Macho" on={v === 'M'} onPress={() => { setDraft({ sex: 'M' }); answer('sexo', 'M'); }} icon={<CadIcon name="ball" size={26} color={C.cover} />} />
          <CardOption label="Fêmea" on={v === 'F'} onPress={() => { setDraft({ sex: 'F' }); answer('sexo', 'F'); }} icon={<Icon name="heart" size={26} color={C.coralInk} />} />
        </View>
      </ChapterFrame>
    );
  }

  // ---------------------------------------------------------------- nascimento
  if (q === 'nascimento') {
    const mode = answered.nasc?.startsWith('idade') ? 'idade' : answered.nasc === 'data' || (d.birth && !answered.nasc) ? 'data' : answered.nasc === 'naosei' ? 'naosei' : null;
    const birth = parseBR(d.birth);
    const validDate = !!birth && birth <= today() && Number(today().slice(0, 4)) - Number(birth.slice(0, 4)) <= 30;
    const age = answered.nasc?.split(':')[1];
    const ok = (mode === 'data' && validDate) || (mode === 'idade' && !!age) || mode === 'naosei';
    const typed = d.birth.replace(/\D/g, '').length === 8;
    return (
      <ChapterFrame cap={1} onNext={next} disabled={!ok}>
        <QTitle>{`Quando ${ref.o} nasceu?`}</QTitle>
        <View style={{ gap: 8 }} accessibilityRole="radiogroup">
          <RadioOption label="Sei a data" on={mode === 'data'} onPress={() => { answer('nasc', 'data'); if (answered.nasc?.startsWith('idade') || answered.nasc === 'naosei') setDraft({ birth: '' }); }}>
            <DateBoxes value={d.birth} onChange={(v) => setDraft({ birth: v })} />
            <T style={{ fontSize: 16, color: C.inkSoft, textAlign: 'center' }}>Não sabe o dia? Coloque 01.</T>
            {typed && !validDate ? <T v="bold" style={{ fontSize: 16, color: C.red, textAlign: 'center' }}>Confira a data de nascimento.</T> : null}
          </RadioOption>
          <RadioOption label="Sei mais ou menos a idade" on={mode === 'idade'} onPress={() => answer('nasc', 'idade')}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {AGES.map((a) => (
                <View key={a.k} style={{ width: '48%', flexGrow: 1 }}>
                  <Pill label={a.label} on={age === a.k} onPress={() => { answer('nasc', `idade:${a.k}`); setDraft({ birth: fmtBR(addMonths(today(), -a.months)) }); }} />
                </View>
              ))}
            </View>
          </RadioOption>
          <RadioOption label="Não sei" sub="Vamos considerar 1 ano. Dá para mudar depois." on={mode === 'naosei'} onPress={() => { answer('nasc', 'naosei'); setDraft({ birth: fmtBR(addDays(today(), -365)) }); }} />
        </View>
        <QSub>A idade muda o plano de vacinas (filhote toma mais doses).</QSub>
      </ChapterFrame>
    );
  }

  // ---------------------------------------------------------------- peso
  if (q === 'peso') {
    const unknown = answered.peso === 'naosei';
    const kg = d.weight.trim() ? parseFloat(d.weight.replace(',', '.')) : NaN;
    const valid = Number.isFinite(kg) && kg > 0 && kg <= 150;
    return (
      <ChapterFrame cap={1} onNext={() => { if (unknown) setDraft({ weight: '' }); next(); }} disabled={!unknown && !valid}>
        <IconBadge><Icon name="scale" size={40} color={C.goldDark} /></IconBadge>
        <QTitle>{`Quanto ${ref.o} pesa?`}</QTitle>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <TextInput maxFontSizeMultiplier={1.15} value={unknown ? '' : d.weight} editable={!unknown} onChangeText={(t) => { answer('peso', 'kg'); setDraft({ weight: t.replace(/[^\d,.]/g, '').slice(0, 6) }); }}
            keyboardType="decimal-pad" placeholder="Ex.: 12,5" placeholderTextColor={C.inkFaint} accessibilityLabel="Peso em quilos"
            style={[ui.input, { width: 160, fontSize: 24, textAlign: 'center', minHeight: 64, opacity: unknown ? 0.4 : 1 }]} />
          <T v="xbold" style={{ fontSize: 22 }}>kg</T>
        </View>
        {!unknown && d.weight.trim() && !valid ? <T v="bold" style={{ fontSize: 16, color: C.red, textAlign: 'center' }}>Confira o peso (ex.: 12,5).</T> : null}
        <RadioOption label="Não sei" sub="Tudo bem, dá para pesar depois." on={unknown} onPress={() => answer('peso', unknown ? 'kg' : 'naosei')} />
      </ChapterFrame>
    );
  }

  // ---------------------------------------------------------------- castrado
  if (q === 'castrado') {
    const v = answered.castrado;
    const set = (k: 'sim' | 'nao' | 'naosei') => { setDraft({ neutered: k }); answer('castrado', k); };
    return (
      <ChapterFrame cap={1} onNext={next} disabled={!v}>
        <QTitle>{`${ref.O} é ${fem ? 'castrada' : 'castrado'}?`}</QTitle>
        <View style={{ gap: 12 }} accessibilityRole="radiogroup">
          <CardOption label="Sim" on={v === 'sim'} onPress={() => set('sim')} />
          <CardOption label="Não" on={v === 'nao'} onPress={() => set('nao')} />
          <CardOption label="Não sei" on={v === 'naosei'} onPress={() => set('naosei')} icon={<CadIcon name="question" size={24} color={C.inkSoft} />} />
        </View>
      </ChapterFrame>
    );
  }

  // ---------------------------------------------------------------- porte
  if (q === 'porte') {
    const v = answered.porte;
    const guess = sizeFor(d.species, d.breed, parseFloat(d.weight.replace(',', '.')) || null);
    return (
      <ChapterFrame cap={1} onNext={next} disabled={!v}>
        <QTitle>{`Qual é o tamanho ${ref.do}?`}</QTitle>
        <View style={{ gap: 12 }} accessibilityRole="radiogroup">
          {SIZES.map(([k, label, hint]) => (
            <CardOption key={k} label={label} sub={hint} on={v === k} onPress={() => { setDraft({ size: k }); answer('porte', k); }} />
          ))}
          <CardOption label="Não sei" sub={`Vamos usar ${guess}, pela raça.`} on={v === 'naosei'} onPress={() => { setDraft({ size: guess }); answer('porte', 'naosei'); }} icon={<CadIcon name="question" size={24} color={C.inkSoft} />} />
        </View>
      </ChapterFrame>
    );
  }

  // ---------------------------------------------------------------- parece (SRD)
  const others = breedsFor(d.species).filter((b) => b.name !== 'SRD' && (b.popular || d.ancestry.includes(b.name))).map((b) => b.name);
  const unknown = answered.parece === 'naosei';
  const toggle = (b: string) => {
    answer('parece', 'sim');
    const has = d.ancestry.includes(b);
    setDraft({ ancestry: has ? d.ancestry.filter((x) => x !== b) : [...d.ancestry, b].slice(-2) });
  };
  return (
    <ChapterFrame cap={1} onNext={next} disabled={!unknown && d.ancestry.length === 0} justify="flex-start">
      <QTitle>{`${ref.O} parece com alguma raça?`}</QTitle>
      <QSub>Escolha até 2. Ex.: vira-lata com cara de Pinscher.</QSub>
      <RadioOption label="Não sei / não parece" on={unknown} onPress={() => { answer('parece', unknown ? 'sim' : 'naosei'); setDraft({ ancestry: [] }); }} />
      {err ? <T style={{ color: C.red }}>{err}</T> : null}
      <ChipRow multi options={others} value={d.ancestry} onChange={toggle} />
    </ChapterFrame>
  );
}
