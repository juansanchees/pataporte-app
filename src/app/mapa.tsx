import React, { useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivePet, useApp } from '@/store/app';
import { T } from '@/components/ui';
import { PIcon, PawSolid, type PremiumIconName } from '@/art/icons-premium';
import { EARN_TABLE, REDEEM_COST, canRedeemMonth, milesSummary, seasonLevel, seasonName, type MilesReason } from '@/domain/gamification';
import { PAID_PLANS } from '@/domain/commerce';
import { fmtExtenso, today } from '@/domain/dates';
import { art } from '@/domain/words';
import { confirmAsk } from '@/services/confirm';
import { LEVEL_TONE, TopBar, fmtMiles } from '@/components/v11/premium/common';
import { C } from '@/theme';

/** Mockup Milhas: hub das milhas (saldo, temporada, nível, atalhos, como ganhar e trocar). */
const EARN_ICON: Record<MilesReason, { icon: PremiumIconName; color: string }> = {
  vacina: { icon: 'syringe', color: C.purple },
  remedio: { icon: 'pill', color: C.goldDark },
  passeio: { icon: 'walk', color: '#2E6B41' },
  foto_dia: { icon: 'camera', color: C.cover },
  sequencia: { icon: 'calendarCheck', color: C.goldDark },
  indicacao: { icon: 'friendPlus', color: C.purple },
};

const TILES: { label: string; icon: PremiumIconName; bg: string; color: string; go: 'mapa' | 'loja' | 'ranking' | 'trocar' }[] = [
  { label: 'Viajar no mapa', icon: 'globePlane', bg: C.aquaPale, color: C.cover, go: 'mapa' },
  { label: 'Loja do avatar', icon: 'bag', bg: C.purplePale, color: C.purple, go: 'loja' },
  { label: 'Ranking', icon: 'podium', bg: C.goldPale, color: C.goldDark, go: 'ranking' },
  { label: 'Trocar milhas', icon: 'ticket', bg: C.greenPale, color: '#2E6B41', go: 'trocar' },
];

export default function Milhas() {
  const pet = useActivePet();
  const ledger = useApp((s) => s.data.ledger);
  const profile = useApp((s) => s.profile);
  const plan = useApp((s) => s.plan());
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const redeemY = useRef(0);
  if (!pet) return <Redirect href="/" />;

  const t = today();
  const m = milesSummary(ledger, t);
  const lv = seasonLevel(m.season);
  const tone = LEVEL_TONE[lv.id];
  const pct = lv.next ? Math.min(1, m.season / lv.next.min) : 1;
  const check = canRedeemMonth(profile?.redemptions, new Date(), m.balance);
  // Com a cobrança desligada todo mundo já tem tudo: a troca só fica ativa para testes (__DEV__).
  const redeemOpen = PAID_PLANS || __DEV__;

  const go = (g: (typeof TILES)[number]['go']) => {
    if (g === 'mapa') router.push('/milhas/mapa' as never);
    else if (g === 'loja') router.push('/duty-free');
    else if (g === 'ranking') router.push('/milhas/ranking' as never);
    else scroll.current?.scrollTo({ y: redeemY.current - 12, animated: true });
  };

  const redeem = async () => {
    if (!check.ok) return;
    const ok = await confirmAsk('Trocar 2.000 milhas?', `Você ganha 1 mês de Primeira Classe. Seu saldo fica em ${fmtMiles(m.balance - REDEEM_COST)} milhas. Dá para trocar 1 vez por ano.`, 'Trocar');
    if (!ok) return;
    const r = await useApp.getState().redeemMonth();
    if (!r.ok) useApp.getState().showToast(r.reason === 'limite' ? 'Você já trocou milhas este ano.' : 'Saldo insuficiente.');
  };

  const redeemBtn = !redeemOpen ? { label: 'Em breve', on: false, a11y: 'Troca disponível em breve' }
    : check.ok ? { label: 'Trocar', on: true, a11y: 'Trocar 2.000 milhas por 1 mês de Primeira Classe' }
    : check.reason === 'limite' ? { label: 'Já trocou', on: false, a11y: 'Você já trocou este ano' }
    : { label: `Faltam ${fmtMiles(check.missing ?? 0)}`, on: false, a11y: `Trocar: faltam ${fmtMiles(check.missing ?? 0)} milhas` };
  const redeemSub = check.reason === 'limite' && check.availableAt ? `Próxima troca a partir de ${fmtExtenso(check.availableAt.slice(0, 10))}` : '1 vez por ano';

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar title={`Milhas ${art(pet).do} ${pet.name}`} />
      <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {/* SALDO */}
        <View style={{ borderRadius: 24, backgroundColor: C.cover, padding: 18, paddingTop: 14, overflow: 'hidden', shadowColor: C.cover, shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: 4 }}>
          <View pointerEvents="none" style={{ position: 'absolute', right: -18, bottom: -22, opacity: 0.08, transform: [{ rotate: '-18deg' }] }}><PawSolid size={120} color={C.goldPale} /></View>
          <View style={{ paddingRight: 80 }}>
            <T v="monoBold" numberOfLines={1} style={{ fontSize: 12, color: C.goldLight }}>{`SALDO · ${seasonName(t).toUpperCase()}`}</T>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }} accessible accessibilityLabel={`Saldo: ${fmtMiles(m.balance)} milhas para gastar`}>
              <T v="serif" style={{ fontSize: 48, lineHeight: 54, color: '#FFFFFF' }}>{fmtMiles(m.balance)}</T>
              <T v="xbold" style={{ fontSize: 18, color: C.goldPale }}>milhas</T>
            </View>
          </View>
          <View accessible accessibilityLabel={`Nível ${lv.name} na temporada`} style={{ position: 'absolute', right: 16, top: 14, width: 68, height: 68, borderRadius: 34, backgroundColor: tone.bg, borderWidth: 3, borderColor: tone.ring, alignItems: 'center', justifyContent: 'center' }}>
            <PIcon name="crown" size={22} color={tone.fg} />
            <T v="monoBold" style={{ fontSize: 12, lineHeight: 14, color: tone.fg }}>{lv.name.toUpperCase()}</T>
          </View>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: lv.next?.min ?? m.season, now: m.season }} style={{ marginTop: 10, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(pct * 100)}%`, height: 8, borderRadius: 4, backgroundColor: C.gold }} />
          </View>
          <T v="bold" style={{ marginTop: 6, fontSize: 16, color: '#FFFFFF' }}>
            {lv.next ? <>faltam <T style={{ fontFamily: 'Nunito_900Black', color: C.goldLight, fontSize: 16 }}>{fmtMiles(lv.toNext)}</T> para {lv.next.name}</> : 'Nível máximo da temporada!'}
          </T>
          <T v="bold" style={{ marginTop: 2, fontSize: 15, color: C.goldLight }}>{`${fmtMiles(m.season)} milhas ganhas neste mês · ${fmtMiles(m.lifetime)} na vida`}</T>
          {plan === 'primeira' && <T v="bold" style={{ marginTop: 2, fontSize: 15, color: C.goldLight }}>Primeira Classe: suas milhas valem em dobro</T>}
        </View>

        {/* ATALHOS */}
        <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {TILES.map((tile) => (
            <Pressable key={tile.go} accessibilityRole="button" accessibilityLabel={tile.label} onPress={() => go(tile.go)}
              style={({ pressed }) => ({ flexBasis: '47%', flexGrow: 1, minHeight: 76, borderWidth: 1, borderColor: C.line, borderRadius: 18, backgroundColor: C.sheet, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.85 : 1 })}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: tile.bg, alignItems: 'center', justifyContent: 'center' }}><PIcon name={tile.icon} size={25} color={tile.color} /></View>
              <T v="xbold" style={{ flex: 1, fontSize: 16, lineHeight: 20 }}>{tile.label}</T>
            </Pressable>
          ))}
        </View>

        {/* COMO GANHAR */}
        <T v="serif" accessibilityRole="header" style={{ marginTop: 18, fontSize: 21, color: C.cover }}>Como ganhar</T>
        <View style={{ marginTop: 6, borderRadius: 18, backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14 }}>
          {EARN_TABLE.map((e, i) => (
            <View key={e.reason} accessible accessibilityLabel={`${e.label}: mais ${e.miles} milhas`}
              style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: i < EARN_TABLE.length - 1 ? 1 : 0, borderColor: '#E6D8BA' }}>
              <PIcon name={EARN_ICON[e.reason].icon} size={22} color={EARN_ICON[e.reason].color} />
              <T v="bold" style={{ flex: 1, fontSize: 16 }}>{e.label}</T>
              <T v="monoBold" style={{ fontSize: 15, color: '#2E6B41' }}>{`+${fmtMiles(e.miles)}`}</T>
            </View>
          ))}
        </View>

        {/* TROCAR POR */}
        <View onLayout={(ev) => { redeemY.current = ev.nativeEvent.layout.y; }}>
          <T v="serif" accessibilityRole="header" style={{ marginTop: 18, fontSize: 21, color: C.cover }}>Trocar por</T>
          <View style={{ marginTop: 6, gap: 8 }}>
            <View style={{ minHeight: 68, borderRadius: 18, backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, paddingLeft: 12, paddingRight: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.cover, alignItems: 'center', justifyContent: 'center' }}><PIcon name="planeUp" size={22} color={C.goldLight} /></View>
              <View style={{ flex: 1 }}>
                <T v="bold" style={{ fontSize: 16, lineHeight: 20 }}><T style={{ fontFamily: 'Nunito_900Black', color: C.goldDark, fontSize: 16 }}>2.000 milhas</T> → 1 mês de Primeira Classe</T>
                <T v="bold" style={{ fontSize: 15, lineHeight: 19, color: C.inkSoft }}>{redeemSub}</T>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={redeemBtn.a11y} accessibilityState={{ disabled: !redeemBtn.on }} onPress={redeemBtn.on ? redeem : undefined}
                style={({ pressed }) => ({ minHeight: 48, borderRadius: 24, backgroundColor: redeemBtn.on ? C.cover : C.paper2, paddingHorizontal: 14, justifyContent: 'center', opacity: pressed && redeemBtn.on ? 0.85 : 1 })}>
                <T v="xbold" style={{ fontSize: 15, color: redeemBtn.on ? '#FFFFFF' : C.inkSoft }}>{redeemBtn.label}</T>
              </Pressable>
            </View>
            <View accessible accessibilityLabel="Cupons de pet shop parceiro. Em breve." style={{ minHeight: 64, borderRadius: 18, backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.purplePale, alignItems: 'center', justifyContent: 'center' }}><PIcon name="tag" size={22} color={C.purple} /></View>
              <T v="bold" style={{ flex: 1, fontSize: 16 }}>Cupons de pet shop parceiro</T>
              <View style={{ minHeight: 26, borderRadius: 13, backgroundColor: C.purplePale, paddingHorizontal: 10, justifyContent: 'center' }}><T v="monoBold" style={{ fontSize: 12, color: C.purpleInk }}>EM BREVE</T></View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
