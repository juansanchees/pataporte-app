import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/store/app';
import { Icon } from '@/art/Icon';
import { CadIcon, type CadIconName } from '@/art/icons-cadastro';
import { ChapterFrame, IconBadge, QCount, QTitle } from '@/components/v11/cadastro/Frame';
import { CardOption } from '@/components/v11/cadastro/Options';
import { useCadastro } from '@/components/v11/cadastro/session';
import { finishChapter, petRef } from '@/components/v11/cadastro/flow';
import type { Species } from '@/domain/types';
import { C } from '@/theme';

interface Opt { id: string; label: string; icon: CadIconName | 'heart' | 'bowl'; tag?: string }
interface PQ { id: string; icon: CadIconName | 'heart' | 'bowl'; title: (o: string) => string; options: (sp: Species) => Opt[] }

/** 4 perguntas simples que viram as marcas de personalidade (temperament) usadas pelo Guia IA. */
const QUESTIONS: PQ[] = [
  { id: 'energia', icon: 'zap', title: (o) => `No dia a dia, ${o} é...`, options: () => [
    { id: 'agitado', label: 'Cheio de energia', icon: 'zap', tag: 'Agitado' },
    { id: 'brincalhao', label: 'Brincalhão', icon: 'ball', tag: 'Brincalhão' },
    { id: 'calmo', label: 'Calmo, gosta de dormir', icon: 'sofa', tag: 'Calmo' },
  ] },
  { id: 'gente', icon: 'party', title: (o) => `Com gente nova, ${o}...`, options: (sp) => [
    { id: 'festa', label: sp === 'dog' ? 'Faz festa' : 'Vem pedir carinho', icon: 'party', tag: 'Sociável' },
    { id: 'timido', label: sp === 'dog' ? 'Fica tímido' : 'Se esconde', icon: 'shy', tag: 'Medroso' },
    { id: 'late', label: sp === 'dog' ? 'Late ou rosna' : 'Bufa ou rosna', icon: 'bark', tag: sp === 'dog' ? 'Late muito' : undefined },
  ] },
  { id: 'sozinho', icon: 'home', title: (o) => `Quando fica sozinho, ${o}...`, options: (sp) => [
    { id: 'tranquilo', label: 'Fica tranquilo', icon: 'home', tag: 'Independente' },
    { id: 'chora', label: sp === 'dog' ? 'Chora ou late' : 'Mia e procura você', icon: 'heart', tag: 'Grudento' },
    { id: 'destroi', label: sp === 'dog' ? 'Destrói coisas' : 'Derruba ou arranha coisas', icon: 'broken', tag: 'Destrói coisas' },
  ] },
  { id: 'comida', icon: 'bowl', title: (o) => `Na hora de comer, ${o}...`, options: () => [
    { id: 'guloso', label: 'Come tudo e pede mais', icon: 'bone', tag: 'Guloso' },
    { id: 'normal', label: 'Come normal', icon: 'bowl' },
    { id: 'enjoado', label: 'É enjoado para comer', icon: 'shy' },
  ] },
];

function Ico({ name, color, size = 26 }: { name: Opt['icon']; color: string; size?: number }) {
  if (name === 'heart' || name === 'bowl') return <Icon name={name} size={size} color={color} />;
  return <CadIcon name={name} size={size} color={color} />;
}

/** Capítulo 2 · Personalidade (Cap-Personalidade): 1 pergunta por tela, cartões grandes, "Não sei" sempre. */
export default function Personalidade() {
  const { q: qp } = useLocalSearchParams<{ q?: string }>();
  const i = Math.min(QUESTIONS.length - 1, Math.max(0, Number(qp) || 0));
  const Q = QUESTIONS[i];
  const d = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const answered = useCadastro((s) => s.answered);
  const answer = useCadastro((s) => s.answer);
  const key = `p:${Q.id}`;
  const v = answered[key];
  const opts = Q.options(d.species);
  const ref = petRef(d);

  const choose = (id: string) => {
    answer(key, id);
    // troca só as marcas desta pergunta, mantendo as outras
    const mine = new Set(opts.map((o) => o.tag).filter(Boolean) as string[]);
    const tag = opts.find((o) => o.id === id)?.tag;
    setDraft({ temperament: [...d.temperament.filter((t) => !mine.has(t)), ...(tag ? [tag] : [])] });
  };

  const next = () => {
    if (i + 1 < QUESTIONS.length) router.push({ pathname: '/emissao/personalidade', params: { q: String(i + 1) } });
    else finishChapter(2);
  };

  return (
    <ChapterFrame cap={2} onNext={next} disabled={!v}>
      <View style={{ gap: 14, alignItems: 'center' }}>
        <IconBadge size={96} bg={C.paper2} border={C.line}><Ico name={Q.icon} color={C.cover} size={44} /></IconBadge>
        <QCount>{`PERGUNTA ${i + 1} DE ${QUESTIONS.length}`}</QCount>
        <QTitle size={30}>{Q.title(ref.o)}</QTitle>
      </View>
      <View style={{ gap: 12 }} accessibilityRole="radiogroup">
        {opts.map((o) => (
          <CardOption key={o.id} label={o.label} on={v === o.id} onPress={() => choose(o.id)} icon={<Ico name={o.icon} color={v === o.id ? C.cover : C.inkSoft} />} />
        ))}
        <CardOption label="Não sei" on={v === 'naosei'} onPress={() => choose('naosei')} icon={<CadIcon name="question" size={26} color={v === 'naosei' ? C.cover : C.inkSoft} />} />
      </View>
    </ChapterFrame>
  );
}
