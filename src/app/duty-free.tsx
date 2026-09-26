import React, { useState } from 'react';
import { Alert, Pressable, View, useWindowDimensions } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useActivePet, useApp } from '@/store/app';
import { Page, PageHeader, PetAvatar } from '@/components/passport';
import { Button, T } from '@/components/ui';
import { Leather } from '@/art/patterns';
import { Icon } from '@/art/Icon';
import { PassportPhoto } from '@/art/Avatar';
import { DUTY_ITEMS, accessoriesFor, equip, itemState, type ItemState } from '@/domain/commerce';
import { milesTotals } from '@/domain/gamification';
import { C } from '@/theme';
import { art } from '@/domain/words';
import { confirmAsk } from '@/services/confirm';

const BADGE: Record<ItemState, { label: string; color: string; bg: string }> = {
  equipado: { label: 'USANDO', color: '#fff', bg: C.cover },
  na_mala: { label: 'NA MALA', color: C.green, bg: C.greenPale },
  comprar: { label: '', color: '', bg: '' },
  sem_saldo: { label: 'FALTAM MILHAS', color: C.inkSoft, bg: C.paper3 },
  bloqueado_nivel: { label: 'NÍVEL 6', color: C.inkSoft, bg: C.paper3 },
  bloqueado_classe: { label: '1ª CLASSE', color: '#35260A', bg: C.gold },
  bloqueado_destino: { label: 'VIAJAR', color: C.inkSoft, bg: C.paper3 },
};

export default function DutyFree() {
  const pet = useActivePet();
  const ledger = useApp((s) => s.data.ledger);
  const plan = useApp((s) => s.profile?.plan ?? 'economica');
  const { width } = useWindowDimensions();
  const [trying, setTrying] = useState<string | null>(null);
  if (!pet) return <Redirect href="/" />;
  const { balance } = milesTotals(ledger);
  const preview = accessoriesFor(trying ? equip({ ...pet, owned: [...pet.owned, trying] }, trying) : pet.equipped);
  const sel = trying ? DUTY_ITEMS.find((i) => i.id === trying)! : null;
  const selState = sel ? itemState(sel, pet, ledger, plan) : null;
  const cardW = (width - 48 - 10) / 2;

  const act = async () => {
    if (!sel || !selState) return;
    if (selState === 'bloqueado_classe') return router.push('/planos');
    if (selState === 'comprar') {
      confirmAsk(`Trocar ${sel.price} milhas?`, `${sel.name} vai para a mala ${art(pet).do} ${pet.name}. Seu nível não muda — só o saldo.`, 'Trocar').then(async (ok) => {
        if (ok) { await useApp.getState().buy(sel.id); setTrying(null); }
      });
      return;
    }
    if (selState === 'na_mala' || selState === 'equipado') { await useApp.getState().toggleEquip(sel.id); setTrying(null); }
  };

  const cta = !sel ? null
    : selState === 'comprar' ? { label: `Trocar ${sel.price} milhas pelo item`, variant: 'primary' as const }
    : selState === 'na_mala' ? { label: `Vestir ${sel.name}`, variant: 'primary' as const }
    : selState === 'equipado' ? { label: `Tirar ${sel.name}`, variant: 'secondary' as const }
    : selState === 'bloqueado_classe' ? { label: 'Conhecer a Primeira Classe', variant: 'premium' as const }
    : null;

  return (
    <Page seed={28} header={<PageHeader title="Duty Free" eyebrow="TROQUE MILHAS POR ACESSÓRIOS" page="18" />}
      footer={cta ? <><Button label={cta.label} variant={cta.variant} icon="bag" onPress={act} />{selState === 'comprar' && <T v="mono" style={{ fontSize: 13, textAlign: 'center', color: C.inkSoft }}>{`SALDO DEPOIS DA TROCA: ${balance - sel!.price} MILHAS`}</T>}</>
        : sel ? <T style={{ textAlign: 'center', color: C.inkSoft }}>{selState === 'sem_saldo' ? `Faltam ${sel.price - balance} milhas. Carimbe cuidados para juntar!` : 'Chegue ao nível 6 · Embaixador para liberar.'}</T> : undefined}>
      <View style={{ gap: 14 }}>
        <View style={{ borderRadius: 16, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
          <Leather w={width - 48} h={150} color={pet.coverColor} radius={16} />
          <View style={{ borderRadius: 10, borderWidth: 2, borderColor: C.gold, overflow: 'hidden' }}>
            <PassportPhoto w={104} h={120} holo={false} corners={false}><PetAvatar pet={pet} size={118} acc={preview} /></PassportPhoto>
          </View>
          <View style={{ flex: 1 }}>
            <T v="mono" style={{ fontSize: 13, letterSpacing: 1.6, color: C.goldLight }}>{trying ? 'PROVADOR' : 'SALDO'}</T>
            <T v="serif" style={{ fontSize: 34, color: C.goldPale }}>{`${balance}`}<T v="serif" style={{ fontSize: 16, color: C.goldPale }}> milhas</T></T>
            <T style={{ fontSize: 14, color: C.goldLight }}>{trying ? `Provando: ${sel?.name}` : 'Cada carimbo rende milhas. Cuidou, ganhou.'}</T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {DUTY_ITEMS.map((it) => {
            const st = itemState(it, pet, ledger, plan);
            const b = BADGE[st];
            const isTry = trying === it.id;
            const dim = st === 'bloqueado_nivel' || st === 'sem_saldo';
            return (
              <Pressable key={it.id} accessibilityRole="button" accessibilityState={{ selected: isTry }} accessibilityLabel={`${it.name}, ${it.price} milhas${b.label ? `, ${b.label.toLowerCase()}` : ''}`}
                onPress={() => setTrying(isTry ? null : it.id)}
                style={{ width: cardW, backgroundColor: C.sheet, borderRadius: 14, padding: 10, gap: 8, borderWidth: isTry ? 2 : st === 'bloqueado_classe' ? 1.5 : 1, borderColor: isTry ? C.coralInk : st === 'bloqueado_classe' ? C.gold : C.line, opacity: dim && !isTry ? 0.7 : 1 }}>
                <PassportPhoto w={cardW - 20} h={92} holo={false} corners={false}><PetAvatar pet={{ ...pet, equipped: [] }} size={96} acc={it.acc} /></PassportPhoto>
                <View style={{ minHeight: 20, flexDirection: 'row' }}>
                  {isTry ? <View style={{ backgroundColor: C.coralInk, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}><T v="monoBold" style={{ fontSize: 13, color: '#fff' }}>PROVANDO</T></View>
                    : b.label ? <View style={{ backgroundColor: b.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, flexDirection: 'row', gap: 4, alignItems: 'center' }}>{(st === 'bloqueado_nivel' || st === 'bloqueado_classe') && <Icon name={st === 'bloqueado_classe' ? 'crown' : 'lock'} size={11} color={b.color} />}<T v="monoBold" style={{ fontSize: 13, color: b.color }}>{b.label}</T></View> : null}
                </View>
                <T v="xbold" style={{ fontSize: 15 }}>{it.name}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="plane" size={13} color={C.aquaInk} /><T v="monoBold" style={{ fontSize: 14, color: C.aquaInk }}>{`${it.price} MI`}</T></View>
              </Pressable>
            );
          })}
        </View>
        <T style={{ fontSize: 14, color: C.inkSoft, textAlign: 'center' }}>Toque num item para provar. Prêmios de nível chegam de graça na mala.</T>
      </View>
    </Page>
  );
}
