import React, { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivePet, useApp } from '@/store/app';
import { PetAvatar } from '@/components/passport';
import { T } from '@/components/ui';
import { ItemArt, PIcon } from '@/art/icons-premium';
import { DUTY_ITEMS, PAID_PLANS, SHOP_CATEGORIES, accessoriesFor, equip, itemState, type DutyItem, type ItemState, type ShopCategory } from '@/domain/commerce';
import { destinationById, milesTotals } from '@/domain/gamification';
import { art } from '@/domain/words';
import { confirmAsk } from '@/services/confirm';
import { BalancePill, PillButton, TopBar, fmtMiles } from '@/components/v11/premium/common';
import { C } from '@/theme';

/** Mockup Loja-Avatar: provador, abas, grade 3 colunas, itens de viagem bloqueados e "Saldo após a compra". */
function inCategory(it: DutyItem, cat: ShopCategory): boolean {
  if (cat === 'viagem') return !!it.destination;
  if (cat === 'oculos') return it.layers.includes('olhos');
  if (cat === 'chapeus') return it.layers.includes('cabeca');
  return it.layers.includes('pescoco') && !it.layers.includes('cabeca');
}

export default function LojaAvatar() {
  const pet = useActivePet();
  const ledger = useApp((s) => s.data.ledger);
  const plan = useApp((s) => s.plan());
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState<ShopCategory>('chapeus');
  const [trying, setTrying] = useState<string | null>(null);
  if (!pet) return <Redirect href="/" />;

  const { balance } = milesTotals(ledger);
  const a = art(pet);
  const sel = trying ? DUTY_ITEMS.find((i) => i.id === trying) ?? null : null;
  const st: ItemState | null = sel ? itemState(sel, pet, ledger, plan) : null;
  const preview = accessoriesFor(sel ? equip({ ...pet, owned: [...pet.owned, sel.id] }, sel.id) : pet.equipped);
  const items = DUTY_ITEMS.filter((it) => inCategory(it, cat));
  const cols = 3;
  const cardW = Math.floor((Math.min(width, 560) - 40 - (cols - 1) * 10) / cols);
  const cityOf = (it: DutyItem) => (it.destination ? destinationById(it.destination)?.name ?? '' : '');

  const buy = async () => {
    if (!sel) return;
    const ok = await confirmAsk(`Comprar por ${fmtMiles(sel.price)} milhas?`, `${sel.name} vai para a mala ${a.do} ${pet.name}. Seu saldo fica em ${fmtMiles(balance - sel.price)} milhas.`, 'Comprar');
    if (!ok) return;
    const r = await useApp.getState().buyShopItem(sel.id);
    if (r === 'ok') setTrying(null);
  };
  const wear = async () => { if (sel) { await useApp.getState().toggleEquip(sel.id); setTrying(null); } };

  const panel = (() => {
    if (!sel || !st) return null;
    switch (st) {
      case 'comprar': return <PillButton label={`Comprar por ${fmtMiles(sel.price)} milhas`} icon="plane" onPress={buy} />;
      case 'na_mala': return <PillButton label={`Vestir ${sel.name}`} onPress={wear} />;
      case 'equipado': return <PillButton label={`Tirar ${sel.name}`} tone="muted" onPress={wear} />;
      case 'sem_saldo': return <PillButton label={`Faltam ${fmtMiles(sel.price - balance)} milhas`} disabled />;
      case 'bloqueado_destino': return <PillButton label={`Viajar até ${cityOf(sel)} no mapa`} icon="plane" onPress={() => router.push('/milhas/mapa' as never)} />;
      case 'bloqueado_classe': return <PillButton label="Conhecer a Primeira Classe" onPress={() => router.push('/planos')} />;
      case 'bloqueado_nivel': return <PillButton label="Chegue ao nível 6 · Embaixador" disabled />;
      default: return null;
    }
  })();

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar title={`Loja ${a.do} ${pet.name}`} right={<BalancePill balance={balance} />} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {/* PROVADOR */}
        <View style={{ marginTop: 12, alignItems: 'center' }}>
          <View accessible accessibilityLabel={sel ? `Avatar ${a.do} ${pet.name} provando ${sel.name}` : `Avatar ${a.do} ${pet.name}`}
            style={{ width: 180, height: 180, borderRadius: 90, backgroundColor: C.goldPale, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'visible', shadowColor: C.cover, shadowOpacity: 0.14, shadowRadius: 11, shadowOffset: { width: 0, height: 8 }, elevation: 3 }}>
            <View style={{ width: 172, height: 172, borderRadius: 86, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              <PetAvatar pet={pet} size={140} acc={preview} />
            </View>
            {sel && (
              <View style={{ position: 'absolute', bottom: -13, minHeight: 24, borderRadius: 12, backgroundColor: C.cover, paddingHorizontal: 10, justifyContent: 'center' }}>
                <T v="monoBold" style={{ fontSize: 12, color: C.goldLight }}>PROVANDO</T>
              </View>
            )}
          </View>
          <T v="xbold" numberOfLines={1} style={{ marginTop: 16, fontSize: 17, color: C.cover }}>
            {sel ? `${sel.name} · ${fmtMiles(sel.price)} milhas` : 'Toque num item para provar'}
          </T>
        </View>

        {/* ABAS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14, marginRight: -20 }} contentContainerStyle={{ gap: 8, paddingRight: 20 }} accessibilityRole="tablist">
          {SHOP_CATEGORIES.map((c) => {
            const on = c.id === cat;
            return (
              <Pressable key={c.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setCat(c.id)}
                style={{ minHeight: 48, borderRadius: 24, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: on ? C.cover : C.sheet, borderWidth: on ? 0 : 1.5, borderColor: C.line }}>
                <T v="xbold" style={{ fontSize: 16, color: on ? '#FFFFFF' : C.ink }}>{c.label}</T>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* GRADE */}
        <View style={{ marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 18 }}>
          {items.map((it) => {
            const s = itemState(it, pet, ledger, plan);
            const isTry = trying === it.id;
            const lockedTrip = s === 'bloqueado_destino';
            const premium = PAID_PLANS && !!it.firstClass;
            const tag = isTry ? { text: 'PROVANDO', bg: C.cover, fg: C.goldLight, border: undefined }
              : lockedTrip ? { text: cityOf(it).toUpperCase(), bg: C.purple, fg: '#FFFFFF', border: undefined }
              : premium ? { text: 'PRIMEIRA CLASSE', bg: C.goldPale, fg: C.goldDark, border: C.gold }
              : s === 'equipado' ? { text: 'USANDO', bg: C.green, fg: '#FFFFFF', border: undefined }
              : s === 'na_mala' ? { text: 'NA MALA', bg: C.greenPale, fg: C.green, border: undefined }
              : null;
            const label = `${it.name}, ${fmtMiles(it.price)} milhas${lockedTrip ? `, bloqueado: libera ao visitar ${cityOf(it)}` : ''}${premium ? ', Primeira Classe' : ''}${s === 'na_mala' ? ', na mala' : s === 'equipado' ? ', usando' : ''}`;
            return (
              <Pressable key={it.id} accessibilityRole="button" accessibilityState={{ selected: isTry }} accessibilityLabel={label} onPress={() => setTrying(isTry ? null : it.id)}
                style={({ pressed }) => ({
                  width: cardW, minHeight: 116, borderRadius: 18, paddingTop: 10, paddingBottom: 6, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: lockedTrip ? C.paper2 : C.sheet, borderWidth: isTry ? 2.5 : 1.5, borderStyle: lockedTrip && !isTry ? 'dashed' : 'solid',
                  borderColor: isTry ? C.gold : lockedTrip ? C.line : '#E6D8BA', opacity: pressed ? 0.85 : 1,
                })}>
                {tag && (
                  <View style={{ position: 'absolute', top: -11, alignSelf: 'center', minHeight: 20, borderRadius: 10, paddingHorizontal: 7, justifyContent: 'center', backgroundColor: tag.bg, borderWidth: tag.border ? 1 : 0, borderColor: tag.border }}>
                    <T v="monoBold" numberOfLines={1} style={{ fontSize: 12, color: tag.fg, letterSpacing: 0.3 }}>{tag.text}</T>
                  </View>
                )}
                <ItemArt id={it.id} size={44} dim={lockedTrip} />
                <T v="xbold" numberOfLines={2} style={{ fontSize: 15, lineHeight: 17, textAlign: 'center', color: lockedTrip ? C.inkSoft : C.ink }}>{it.name}</T>
                {lockedTrip ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <PIcon name="lock" size={14} color={C.inkSoft} sw={2.4} />
                    <T v="xbold" style={{ fontSize: 15, color: C.inkSoft }}>Viajar</T>
                  </View>
                ) : (
                  <T v="monoBold" style={{ fontSize: 14, color: C.cover }}>{`${fmtMiles(it.price)} mi`}</T>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* PAINEL FIXO */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 16, backgroundColor: C.sheet, borderTopWidth: 1, borderColor: '#E6D8BA', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: C.cover, shadowOpacity: 0.08, shadowRadius: 11, shadowOffset: { width: 0, height: -8 }, elevation: 6, gap: 10 }}>
        {sel && st === 'comprar' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T v="bold" style={{ fontSize: 15, color: C.inkSoft }}>Saldo após a compra</T>
            <T v="monoBold" style={{ fontSize: 15, color: C.cover }}>{`${fmtMiles(balance - sel.price)} milhas`}</T>
          </View>
        )}
        {panel}
        <T v="bold" style={{ fontSize: 15, lineHeight: 20, color: C.inkSoft, textAlign: 'center' }}>Itens de viagem liberam ao visitar a cidade no mapa.</T>
      </View>
    </View>
  );
}
