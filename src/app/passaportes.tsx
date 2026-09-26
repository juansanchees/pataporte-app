import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/store/app';
import { T } from '@/components/ui';
import { HomeIcon } from '@/art/icons-home';
import { PetRound } from '@/components/v11/home/PetRound';
import { paywallRoute } from '@/components/v11/home/routes';
import { progress, todayItems } from '@/domain/today';
import { ageLabel } from '@/domain/vaccines';
import { today } from '@/domain/dates';
import type { Pet } from '@/domain/types';
import { C } from '@/theme';

/**
 * Trocar de pet (Pets-Troca): folha "Seus pets" que sobe sobre a Home.
 * Rota em transparentModal (ver _layout). "+ Adicionar pet" passa antes pelo gatilho de paywall 'segundo_pet'.
 */
function speciesLabel(p: Pet): string {
  if (p.species === 'cat') return p.sex === 'F' ? 'Gata' : 'Gato';
  return p.sex === 'F' ? 'Cadela' : 'Cão';
}

export default function SeusPets() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const pets = useApp((s) => s.pets);
  const active = useApp((s) => s.activePetId);
  const data = useApp((s) => s.data);
  const t = today();
  const [y] = useState(() => new Animated.Value(40));
  const [fade] = useState(() => new Animated.Value(0));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) { y.setValue(0); fade.setValue(1); return; }
      Animated.parallel([
        Animated.timing(y, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }).catch(() => { y.setValue(0); fade.setValue(1); });
  }, [y, fade]);

  // "2 de 5 hoje" só existe para o pet aberto (os dados dos outros não estão carregados)
  const activeProg = useMemo(() => {
    const p = pets.find((x) => x.id === active);
    if (!p) return null;
    const pr = progress(todayItems({ data }, p, new Date()));
    return pr.total ? `${pr.label} hoje` : null;
  }, [pets, active, data]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/inicio'));
  const choose = async (id: string) => {
    if (id !== active) await useApp.getState().setActivePet(id);
    close();
  };
  const add = () => {
    const s = useApp.getState();
    const gatilho = s.paywallFor('segundo_pet'); // paywallTrigger do domínio (null com PAID_PLANS desligado)
    if (gatilho) { router.replace(paywallRoute(gatilho) as never); return; }
    if (!s.canAddPetNow().ok) { s.showToast(`Por enquanto cabem até ${s.limits().maxPets} pets por conta.`); return; }
    s.startNewPassport();
    router.replace('/emissao/foto');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(42,38,34,0.45)', opacity: fade }}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityRole="button" accessibilityLabel="Fechar" />
      </Animated.View>
      <Animated.View accessibilityViewIsModal
        style={{ maxHeight: height * 0.85, backgroundColor: C.sheet, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 20, paddingBottom: insets.bottom + 24, shadowColor: C.ink, shadowOpacity: 0.18, shadowRadius: 15, shadowOffset: { width: 0, height: -8 }, elevation: 12, opacity: fade, transform: [{ translateY: y }] }}>
        <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: '#D9CBAE', alignSelf: 'center' }} />
        <View style={{ marginTop: 12, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T v="serif" accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, color: C.cover }}>Seus pets</T>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={close}
            style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: pressed ? C.paper3 : '#F1E7D2', alignItems: 'center', justifyContent: 'center' })}>
            <HomeIcon name="close" size={20} color={C.cover} sw={2.4} />
          </Pressable>
        </View>
        <ScrollView style={{ marginTop: 12 }} contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>
          {pets.map((p) => {
            const on = p.id === active;
            const age = p.birthDate ? ageLabel(p.birthDate, t) : '';
            const sub = [speciesLabel(p), age].filter(Boolean).join(' · ');
            const chip = on ? activeProg : null;
            return (
              <Pressable key={p.id} accessibilityRole="radio" accessibilityState={{ selected: on, checked: on }}
                accessibilityLabel={`${p.name}, ${sub}${chip ? `, ${chip}` : ''}${on ? '. Selecionado' : ''}`} onPress={() => choose(p.id)}
                style={({ pressed }) => ({ minHeight: 72, borderWidth: 2, borderColor: on ? C.cover : '#E6D8BA', borderRadius: 20, backgroundColor: pressed ? C.paper : C.white, paddingLeft: 10, paddingRight: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 })}>
                <PetRound pet={p} size={52} border={2} bg={p.species === 'cat' ? C.purplePale : C.aquaPale} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T v="xbold" numberOfLines={1} style={{ fontSize: 19, lineHeight: 24 }}>{p.name}</T>
                  <T v="bold" numberOfLines={1} style={{ fontSize: 16, lineHeight: 21, color: C.inkSoft }}>{sub}</T>
                </View>
                {chip ? (
                  <View style={{ minHeight: 28, borderRadius: 14, paddingHorizontal: 10, backgroundColor: C.amberPale, justifyContent: 'center' }}>
                    <T v="xbold" numberOfLines={1} style={{ fontSize: 14, color: '#7A5204' }}>{chip}</T>
                  </View>
                ) : null}
                {on ? (
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.cover, alignItems: 'center', justifyContent: 'center' }}>
                    <HomeIcon name="check" size={16} color={C.white} sw={3} />
                  </View>
                ) : <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#C9B894' }} />}
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" accessibilityLabel="Adicionar pet" onPress={add}
            style={({ pressed }) => ({ minHeight: 72, borderWidth: 2, borderStyle: 'dashed', borderColor: C.cover, borderRadius: 20, backgroundColor: pressed ? C.paper : 'transparent', paddingLeft: 10, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 12 })}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.cover, alignItems: 'center', justifyContent: 'center' }}>
              <HomeIcon name="plus" size={24} color={C.white} sw={2.6} />
            </View>
            <T v="xbold" style={{ fontSize: 19, color: C.cover }}>Adicionar pet</T>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
