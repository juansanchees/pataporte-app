import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivePet, useApp } from '@/store/app';
import { T } from '@/components/ui';
import { PIcon, TwoPaws, type PremiumIconName } from '@/art/icons-premium';
import { limitsFor } from '@/domain/commerce';
import { art } from '@/domain/words';
import { C } from '@/theme';
import { LegalLinks, PillButton, TextButton } from './common';
import { DevNote, Scrim, SheetHandle } from './PaywallMain';
import { nextMonthFirst, usePaywall, type Gatilho } from './usePaywall';

type Kind = Exclude<Gatilho, 'primeira_vacina'>;

/** Folhas curtas por contexto: Paywall-IA (8c), Paywall-Foto (8d), Paywall-Pet (8e), Paywall-Compartilhar (8f) + gráfico de peso. */
function copyFor(kind: Kind, pet: { name: string; sex?: 'M' | 'F' } | null): { icon: PremiumIconName | 'paws'; title: string; body: string; later: string } {
  const a = art(pet);
  const name = pet?.name ?? '';
  const oPet = name ? `${a.o} ${name}` : 'o seu pet';
  const doPet = name ? `${a.do} ${name}` : 'do seu pet';
  switch (kind) {
    case 'ia_4a_pergunta': {
      const n = limitsFor('economica', true).guideMonthly;
      return { icon: 'chatSpark', title: `Pergunte à vontade sobre ${oPet}`, body: `Você usou as ${n} perguntas grátis deste mês. Na Primeira Classe a IA responde sem limite e lembra do histórico ${name ? `d${a.ele}` : 'dele'}.`, later: `Esperar até ${nextMonthFirst()}` };
    }
    case 'ia_foto':
      return { icon: 'cameraDoc', title: 'Mande a foto da receita ou do exame', body: `A IA lê e explica em palavras simples, considerando a raça e a idade ${doPet}.`, later: 'Agora não' };
    case 'segundo_pet':
      return { icon: 'paws', title: 'Cuide de todos os seus pets num lugar só', body: 'Até 5 pets, cada um com vacinas, remédios e avisos próprios.', later: 'Agora não' };
    case 'compartilhar':
      return { icon: 'share', title: 'Divida os cuidados com a família', body: 'Quem você convidar vê as vacinas e recebe os avisos do remédio. E o passaporte vira QR code e PDF para o veterinário.', later: 'Agora não' };
    case 'grafico_peso':
    default:
      return { icon: 'scaleChart', title: `Veja o peso ${doPet} num gráfico`, body: 'Acompanhe mês a mês se o peso está saudável e mostre ao veterinário na consulta.', later: 'Agora não' };
  }
}

export function PaywallSheet({ kind }: { kind: Kind }) {
  const pet = useActivePet();
  const trialUsed = useApp((s) => !!s.profile?.planState?.trialEndsAt);
  const insets = useSafeAreaInsets();
  const { prices, busy, buy, restoreNow, close } = usePaywall(kind);
  const c = copyFor(kind, pet);
  return (
    <Scrim onClose={close}>
      <View accessibilityViewIsModal style={{ backgroundColor: C.sheet, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 20, paddingBottom: insets.bottom + 16, alignItems: 'stretch' }}>
        <SheetHandle onClose={close} />
        <DevNote />
        {/* canhoto do bilhete */}
        <View accessibilityElementsHidden importantForAccessibility="no" style={{ marginTop: 18, alignSelf: 'center', width: 232, minHeight: 34, borderRadius: 8, backgroundColor: C.goldPale, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', left: -7, top: 10, width: 14, height: 14, borderRadius: 7, backgroundColor: C.sheet }} />
          <View style={{ position: 'absolute', right: -7, top: 10, width: 14, height: 14, borderRadius: 7, backgroundColor: C.sheet }} />
          <T v="monoBold" style={{ fontSize: 12, color: C.goldDark, letterSpacing: 1.5 }}>PRIMEIRA CLASSE · 1A</T>
        </View>
        <View accessibilityElementsHidden importantForAccessibility="no" style={{ marginTop: 18, alignSelf: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: C.goldPale, borderWidth: 2.5, borderColor: C.gold, alignItems: 'center', justifyContent: 'center' }}>
          {c.icon === 'paws' ? <TwoPaws size={34} color={C.goldDark} /> : <PIcon name={c.icon} size={30} color={C.goldDark} />}
        </View>
        <T v="serif" accessibilityRole="header" style={{ marginTop: 16, paddingHorizontal: 8, fontSize: 26, lineHeight: 32, color: C.cover, textAlign: 'center' }}>{c.title}</T>
        <T v="bold" style={{ marginTop: 8, paddingHorizontal: 12, fontSize: 17, lineHeight: 23, color: C.inkSoft, textAlign: 'center' }}>{c.body}</T>
        <View style={{ marginTop: 20 }}>
          <PillButton label={trialUsed ? 'Assinar a Primeira Classe' : 'Testar 7 dias grátis'} loading={busy === 'buy'} onPress={() => buy('annual')} />
        </View>
        <T v="bold" style={{ marginTop: 10, paddingHorizontal: 8, fontSize: 15, lineHeight: 20, color: C.inkSoft, textAlign: 'center' }}>
          {`${trialUsed ? '' : 'Depois '}${prices.annual.priceString} ou ${prices.monthly.priceString}. Renova sozinho. Cancele quando quiser.`}
        </T>
        <TextButton label={c.later} onPress={close} size={16} />
        <LegalLinks onRestore={restoreNow} restoring={busy === 'restore'} />
      </View>
    </Scrim>
  );
}
