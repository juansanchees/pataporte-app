import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/store/app';
import { T } from '@/components/ui';
import { PIcon } from '@/art/icons-premium';
import { TopBar, PillButton } from '@/components/v11/premium/common';
import { DevNote } from '@/components/v11/premium/PaywallMain';
import { usePaywall } from '@/components/v11/premium/usePaywall';
import { C } from '@/theme';

/** Mockup Paywall-Comparar (8b): tabela Econômica 32C × Primeira 1A. */
type Cell = boolean | string;
const ROWS: [string, Cell, Cell][] = [
  ['Pets', '1', 'até 5'],
  ['Registrar vacinas e remédios', true, true],
  ['Aviso no celular antes da vacina', false, true],
  ['Próximo reforço calculado sozinho', false, true],
  ['Alarme de remédio, vermífugo e antipulga', false, true],
  ['Gráfico de peso', false, true],
  ['Perguntas à IA', '3 por mês', 'à vontade'],
  ['IA lê foto de receita e exame', false, true],
  ['Passaporte com QR code e PDF', false, true],
  ['Cartão de emergência', false, true],
  ['Compartilhar com a família', false, true],
  ['Avatar', 'básico', 'acessórios e carimbos'],
];
const COL = 88;

export default function PlanosComparar() {
  const insets = useSafeAreaInsets();
  const trialUsed = useApp((s) => !!s.profile?.planState?.trialEndsAt);
  const { prices, busy, buy } = usePaywall(null, { silent: true });
  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar title="Compare as classes" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
        <DevNote />
        {/* cabeçalhos: mini cartões de embarque */}
        <View accessibilityRole="header" style={{ marginTop: 8, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12 }}>
          <View style={{ flex: 1 }} />
          <View accessibilityLabel="Econômica, assento 32C, grátis" style={{ width: COL - 4, minHeight: 76, marginHorizontal: 2, borderWidth: 2, borderColor: C.line, borderRadius: 12, backgroundColor: C.sheet, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
            <T v="monoBold" style={{ fontSize: 12, color: C.inkSoft }}>ECONÔMICA</T>
            <T v="monoBold" style={{ fontSize: 16, color: C.cover }}>32C</T>
            <T v="xbold" style={{ fontSize: 15 }}>Grátis</T>
          </View>
          <View accessibilityLabel="Primeira Classe, assento 1A, 7 dias grátis" style={{ width: COL - 4, minHeight: 86, marginHorizontal: 2, borderWidth: 2.5, borderBottomWidth: 0, borderColor: C.gold, borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: C.goldPale, alignItems: 'center', justifyContent: 'center' }}>
            <T v="monoBold" style={{ fontSize: 12, color: C.goldDark }}>PRIMEIRA</T>
            <T v="monoBold" style={{ fontSize: 16, color: C.cover }}>1A</T>
            <T v="xbold" style={{ fontSize: 15, color: C.goldDark, textAlign: 'center', lineHeight: 17 }}>{trialUsed ? 'Primeira\nClasse' : '7 dias\ngrátis'}</T>
          </View>
        </View>
        {/* tabela */}
        <View style={{ borderWidth: 1.5, borderColor: C.line, borderRadius: 20, backgroundColor: C.sheet, paddingHorizontal: 12, overflow: 'hidden' }}>
          <View pointerEvents="none" style={{ position: 'absolute', right: 12 + 2, top: 0, bottom: 0, width: COL - 4, backgroundColor: C.goldPale, borderLeftWidth: 2.5, borderRightWidth: 2.5, borderColor: C.gold }} />
          {ROWS.map(([label, eco, pri], i) => (
            <View key={label} accessible accessibilityLabel={`${label}: Econômica ${cellText(eco)}, Primeira ${cellText(pri)}`}
              style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', borderBottomWidth: i < ROWS.length - 1 ? 1 : 0, borderColor: '#E6D8BA' }}>
              <T v="xbold" style={{ flex: 1, fontSize: 15, lineHeight: 19, paddingRight: 8, paddingVertical: 6 }}>{label}</T>
              <View style={{ width: COL, alignItems: 'center', paddingHorizontal: 4 }}><CellView v={eco} /></View>
              <View style={{ width: COL, alignItems: 'center', paddingHorizontal: 4 }}><CellView v={pri} strong /></View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 14, backgroundColor: C.paper, borderTopWidth: 1, borderTopColor: C.line }}>
        <PillButton label={trialUsed ? 'Assinar a Primeira Classe' : 'Testar 7 dias grátis'} icon="arrowRight" loading={busy === 'buy'} onPress={() => buy('annual')} />
        <T v="bold" style={{ marginTop: 6, fontSize: 15, lineHeight: 20, color: C.inkSoft, textAlign: 'center' }}>{`${trialUsed ? '' : 'Depois '}${prices.annual.priceString} ou ${prices.monthly.priceString}. Renova sozinho. Cancele quando quiser.`}</T>
      </View>
    </View>
  );
}

function cellText(v: Cell) {
  return v === true ? 'incluído' : v === false ? 'não incluído' : v;
}

function CellView({ v, strong }: { v: Cell; strong?: boolean }) {
  if (v === true) return <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.greenPale, alignItems: 'center', justifyContent: 'center' }}><PIcon name="check" size={16} color={C.green} sw={3} /></View>;
  if (v === false) return <PIcon name="close" size={16} color={C.inkFaint} sw={2.6} />;
  return <T style={{ fontSize: 15, lineHeight: 18, textAlign: 'center', fontFamily: strong ? 'Nunito_900Black' : 'Nunito_800ExtraBold', color: strong ? C.cover : C.inkSoft }}>{v}</T>;
}
