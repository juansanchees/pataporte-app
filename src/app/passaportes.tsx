import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/store/app';
import { Button, InfoNote, T } from '@/components/ui';
import { Emblem, Leather } from '@/art/patterns';
import { Icon } from '@/art/Icon';
import { canAddPet, LIMITS, PAID_PLANS } from '@/domain/commerce';
import { levelFor, milesTotals } from '@/domain/gamification';
import { C } from '@/theme';

function MiniCover({ color, name, selected }: { color: string; name: string; selected?: boolean }) {
  return (
    <View style={{ width: 96, height: 130, borderRadius: 10, overflow: 'hidden', borderWidth: selected ? 3 : 0, borderColor: C.coralInk, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <Leather w={96} h={130} color={color} radius={10} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(221,189,126,0.5)', borderRadius: 6 }} />
      <T v="mono" style={{ fontSize: 13, letterSpacing: 1.4, color: C.goldLight }}>PATAPORTE</T>
      <Emblem size={52} bg={color} />
      <T v="serif" style={{ fontSize: 15, color: C.goldLight }} numberOfLines={1}>{name}</T>
    </View>
  );
}

export default function Passaportes() {
  const insets = useSafeAreaInsets();
  const pets = useApp((s) => s.pets);
  const active = useApp((s) => s.activePetId);
  const plan = useApp((s) => s.profile?.plan ?? 'economica');
  const ledger = useApp((s) => s.data.ledger);
  const canAdd = canAddPet(plan, pets.length);

  const choose = async (id: string) => {
    if (id !== active) await useApp.getState().setActivePet(id);
    router.back();
  };
  const emit = () => {
    if (!canAdd) { if (PAID_PLANS) router.replace('/planos'); return; }
    useApp.getState().startNewPassport();
    router.replace('/emissao/foto');
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(11,35,40,0.55)', justifyContent: 'flex-end' }}>
      <Pressable style={{ flex: 1 }} onPress={() => router.back()} accessibilityLabel="Fechar" />
      <View style={{ backgroundColor: C.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 12, paddingBottom: insets.bottom + 24 }}>
        <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: C.inkFaint, alignSelf: 'center', marginBottom: 14 }} />
        <View style={{ paddingHorizontal: 24 }}>
          <T v="eyebrow">GAVETA DE DOCUMENTOS</T>
          <T v="serif" style={{ fontSize: 28, marginBottom: 16 }} accessibilityRole="header">Meus passaportes</T>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingHorizontal: 24, paddingBottom: 18 }}>
          {pets.map((p) => (
            <Pressable key={p.id} accessibilityRole="button" accessibilityState={{ selected: p.id === active }} accessibilityLabel={`Passaporte de ${p.name}`} onPress={() => choose(p.id)} style={{ alignItems: 'center', gap: 8 }}>
              <MiniCover color={p.coverColor} name={p.name} selected={p.id === active} />
              <T v="bold" style={{ fontSize: 14, color: C.ink, textAlign: 'center' }} numberOfLines={1}>{p.name}</T>
              <T style={{ fontSize: 14, color: C.inkSoft, textAlign: 'center' }} numberOfLines={1}>{p.id === active ? 'Aberto agora' : p.breed}</T>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel="Emitir novo passaporte" onPress={emit} style={{ alignItems: 'center', gap: 8 }}>
            <View style={{ width: 96, height: 130, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: C.inkFaint, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.4)' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: canAdd ? C.cover : C.gold, alignItems: 'center', justifyContent: 'center' }}><Icon name={canAdd ? 'plus' : 'lock'} size={18} color={canAdd ? C.goldPale : '#35260A'} sw={2.4} /></View>
              <T v="monoBold" style={{ fontSize: 13, textAlign: 'center', color: C.inkSoft }}>{'EMITIR\nNOVO'}</T>
            </View>
            <T v="monoBold" style={{ fontSize: 13, color: canAdd ? C.inkSoft : C.goldDark }}>{canAdd ? 'NOVO PET' : PAID_PLANS ? '1ª CLASSE' : 'LIMITE'}</T>
          </Pressable>
        </ScrollView>
        {!canAdd && (
          <View style={{ paddingHorizontal: 24, gap: 12 }}>
            {PAID_PLANS ? <>
              <InfoNote tone="gold" icon="crown" text="Na Econômica cabe 1 passaporte. Para emitir outro, embarque na Primeira Classe." />
              <Button label="Conhecer a Primeira Classe" variant="premium" onPress={() => router.replace('/planos')} />
            </> : <InfoNote tone="gold" icon="info" text={`Por enquanto cabem até ${LIMITS[plan].maxPets} passaportes por conta.`} />}
          </View>
        )}
      </View>
    </View>
  );
}
