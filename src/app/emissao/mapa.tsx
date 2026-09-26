import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/store/app';
import { T } from '@/components/ui';
import { Icon } from '@/art/Icon';
import { CadIcon, type CadIconName } from '@/art/icons-cadastro';
import { BigButton, CHAPTERS, ChapterFrame, QSub, QTitle } from '@/components/v11/cadastro/Frame';
import { useCadastro } from '@/components/v11/cadastro/session';
import { petRef, startVaccines } from '@/components/v11/cadastro/flow';
import { C } from '@/theme';

const ICONS: CadIconName[] = ['home', 'party', 'syringe', 'bug', 'checkup'];

/** Cap-Mapa: os 5 capítulos, o atual em dourado. No capítulo 3 oferece a foto da carteirinha. */
export default function Mapa() {
  const { cap: capParam } = useLocalSearchParams<{ cap?: string }>();
  const cap = Math.min(5, Math.max(1, Number(capParam) || 1));
  const d = useApp((s) => s.draft);
  const done = useCadastro((s) => s.done);
  const ref = petRef(d);

  const go = () => {
    if (cap === 1) {
      useCadastro.getState().set({ mapSeen: true });
      router.replace('/emissao/foto');
      return;
    }
    if (cap === 3) return startVaccines();
    router.back();
  };

  return (
    <ChapterFrame cap={cap} back={cap !== 1} onNext={go} nextLabel={cap === 1 ? 'Começar capítulo 1' : `Continuar capítulo ${cap}`}
      secondary={cap === 3 ? (
        <View style={{ gap: 4, marginTop: 4 }}>
          <BigButton variant="outline" label="Tirar foto da carteirinha" icon={<Icon name="camera" size={20} color={C.cover} />} onPress={() => router.push({ pathname: '/carteirinha', params: { origem: 'cadastro' } })} />
          <T style={{ fontSize: 16, color: C.inkSoft, textAlign: 'center' }}>A IA lê as vacinas e você só confere.</T>
        </View>
      ) : undefined}>
      <View style={{ gap: 8, alignItems: 'center' }}>
        <QTitle size={30}>{`Vamos montar o passaporte ${ref.do}`}</QTitle>
        <QSub>5 capítulos rápidos. Uma pergunta por vez.</QSub>
      </View>
      <View style={{ gap: 12 }}>
        {CHAPTERS.map((c, i) => {
          const isDone = done.includes(c.n) || c.n < cap;
          const now = c.n === cap;
          return (
            <View key={c.n} accessible accessibilityLabel={`Capítulo ${c.n}: ${c.name}. ${isDone ? 'Carimbado' : now ? 'Agora' : 'Depois'}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, padding: 14, borderRadius: 16, borderWidth: now ? 2.5 : 2,
                borderColor: now ? C.gold : C.line, backgroundColor: now ? C.goldPale : C.sheet }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: isDone ? C.greenPale : now ? C.goldLight : C.paper2 }}>
                {isDone ? <Icon name="check" size={22} color={C.green} sw={2.8} /> : <CadIcon name={ICONS[i]} size={22} color={now ? C.coverDeep : C.inkSoft} />}
              </View>
              <View style={{ flex: 1 }}>
                <T v="xbold" style={{ fontSize: 19, lineHeight: 24, color: now ? C.cover : isDone ? C.ink : C.inkSoft }}>{c.name}</T>
                <T v={isDone ? 'body' : 'eyebrow'} style={{ fontSize: isDone ? 15 : 12, color: now ? C.goldDark : C.inkSoft }}>{isDone ? c.sub : c.n === 1 ? 'FOTO, NOME, NASCIMENTO' : '1 MIN'}</T>
              </View>
              {isDone ? <T v="eyebrow" style={{ fontSize: 12, color: C.green }}>CARIMBADO</T> : now ? <T v="eyebrow" style={{ fontSize: 12, color: C.goldDark, fontWeight: '700' }}>AGORA</T> : null}
            </View>
          );
        })}
      </View>
    </ChapterFrame>
  );
}
