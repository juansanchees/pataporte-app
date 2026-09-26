import React from 'react';
import { View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useActivePet, useApp } from '@/store/app';
import { MilesBar, Page, PageHeader, PetAvatar } from '@/components/passport';
import { Button, SectionTitle, T } from '@/components/ui';
import { Icon } from '@/art/Icon';
import { HOW_TO_EARN, LEVELS, levelFor, milesTotals, nextLevel } from '@/domain/gamification';
import { accessoriesFor, itemById, PAID_PLANS } from '@/domain/commerce';
import { art } from '@/domain/words';
import { C } from '@/theme';

/** Como funcionam as milhas e os níveis: o que ganha, como sobe e o que cada nível dá. */
export default function Mapa() {
  const pet = useActivePet();
  const ledger = useApp((s) => s.data.ledger);
  const plan = useApp((s) => s.profile?.plan ?? 'economica');
  if (!pet) return <Redirect href="/" />;
  const { total, balance } = milesTotals(ledger);
  const cur = levelFor(total);
  const nx = nextLevel(total);

  return (
    <Page seed={27} header={<PageHeader title="Milhas e níveis" eyebrow={`A JORNADA ${art(pet).DO} ${pet.name.toUpperCase()}`} />}
      footer={<Button label="Ir para o Duty Free" icon="bag" onPress={() => router.push('/duty-free')} />}>
      <View style={{ gap: 16 }}>
        <View style={{ backgroundColor: C.cover, borderRadius: 16, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 76, height: 88, borderRadius: 10, backgroundColor: C.photo, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
              <PetAvatar pet={pet} size={84} />
            </View>
            <View style={{ flex: 1 }}>
              <T v="bold" style={{ color: C.goldLight, fontSize: 14.5 }}>{`NÍVEL ${cur.n} DE ${LEVELS.length}`}</T>
              <T v="serif" style={{ color: C.goldPale, fontSize: 26, lineHeight: 30 }}>{cur.name}</T>
              <T style={{ color: C.goldPale, fontSize: 14 }}>{`${total} milhas ganhas · ${balance} para gastar`}</T>
            </View>
          </View>
          <MilesBar dark cur={total - cur.min} total={(nx?.min ?? cur.min + 1) - cur.min} label={nx ? `Faltam ${nx.min - total} milhas para ${nx.name}` : 'Nível máximo alcançado!'} />
        </View>

        <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, gap: 8 }}>
          <T v="xbold" style={{ fontSize: 17 }}>Como funciona</T>
          {[
            ['1', `Cada cuidado com ${art(pet).o} ${pet.name} vale milhas: vacinas, rotina do dia, diário, peso e perguntas ao Guia.`],
            ['2', 'As milhas somadas fazem o pet subir de nível. Cada nível novo dá um presente para o avatar.'],
            ['3', 'As milhas também podem ser trocadas no Duty Free por acessórios. Gastar não faz perder nível.'],
          ].map(([n, t]) => (
            <View key={n} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.cover, alignItems: 'center', justifyContent: 'center' }}><T v="xbold" style={{ color: C.goldPale, fontSize: 14.5 }}>{n}</T></View>
              <T style={{ flex: 1, fontSize: 15, lineHeight: 21 }}>{t}</T>
            </View>
          ))}
        </View>

        <View>
          <SectionTitle>Como ganhar milhas</SectionTitle>
          <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 14 }}>
            {HOW_TO_EARN.map(([what, n], i) => (
              <View key={what} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, borderTopWidth: i ? 1 : 0, borderStyle: 'dashed', borderColor: C.line }}>
                <T style={{ flex: 1, fontSize: 14.5, lineHeight: 20 }}>{what}</T>
                <View style={{ backgroundColor: C.aquaPale, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}><T v="monoBold" style={{ color: C.aquaInk, fontSize: 14.5 }}>{plan === 'economica' ? n : `${n} ×2`}</T></View>
              </View>
            ))}
          </View>
          {!PAID_PLANS ? null : plan === 'economica' ? <T style={{ fontSize: 15, color: C.inkSoft, marginTop: 6 }}>Na Primeira Classe todas as milhas valem em dobro.</T> : <T v="bold" style={{ fontSize: 15, color: C.green, marginTop: 6 }}>Sua classe ganha milhas em dobro.</T>}
        </View>

        <View>
          <SectionTitle>Os níveis e os presentes</SectionTitle>
          <View style={{ gap: 10 }}>
            {LEVELS.map((l) => {
              const done = total >= l.min;
              const now = l.n === cur.n;
              const reward = l.reward ? itemById(l.reward) : undefined;
              return (
                <View key={l.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: now ? C.purplePale : C.sheet, borderWidth: now ? 2 : 1, borderColor: now ? C.purple : C.line, borderRadius: 14, padding: 12, opacity: done || now ? 1 : 0.85 }}>
                  <View style={{ width: 54, height: 62, borderRadius: 8, backgroundColor: done ? C.photo : C.paper2, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
                    {reward ? <PetAvatar pet={pet} size={60} acc={accessoriesFor([reward.id])} /> : <PetAvatar pet={pet} size={60} acc={[]} />}
                    {!done && <View style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }}><Icon name="lock" size={12} color={C.inkSoft} /></View>}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <T v="xbold" style={{ fontSize: 16 }}>{`${l.n}. ${l.name}`}</T>
                      {now ? <View style={{ backgroundColor: C.coralInk, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><T v="bold" style={{ color: '#fff', fontSize: 13 }}>Você está aqui</T></View> : null}
                    </View>
                    <T style={{ fontSize: 15, color: C.inkSoft }}>{l.min === 0 ? 'Início' : `A partir de ${l.min} milhas`}</T>
                    <T v="bold" style={{ fontSize: 14, lineHeight: 19, color: done ? C.green : C.ink }}>{done && reward ? `Conquistado: ${reward.name}` : l.perk}</T>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Page>
  );
}
