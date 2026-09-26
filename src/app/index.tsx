import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useApp } from '@/store/app';
import { Emblem, EChip, Leather } from '@/art/patterns';
import { Icon } from '@/art/Icon';
import { C, F } from '@/theme';

/** Capa do passaporte: decide para onde ir ao "abrir". */
export default function Capa() {
  const { width, height } = useWindowDimensions();
  const booted = useApp((s) => s.booted);
  const user = useApp((s) => s.user);
  const pets = useApp((s) => s.pets);
  const seen = useApp((s) => s.onboardingSeen);
  const loadError = useApp((s) => s.loadError);

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.05, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const open = () => {
    if (loadError) { useApp.getState().retryLoad(); return; }
    if (!user) router.replace(seen ? '/login' : '/onboarding');
    else if (pets.length === 0) { useApp.getState().startNewPassport(); router.replace('/emissao/foto'); }
    else router.replace('/inicio');
  };

  const gold = { color: C.goldLight, textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 } as const;

  return (
    <View style={{ flex: 1, backgroundColor: C.cover }}>
      <StatusBar style="light" />
      <Leather w={width} h={height} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 16, left: 16, right: 16, bottom: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(221,189,126,0.55)', borderRadius: 20 }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 36 }}>
        <Text maxFontSizeMultiplier={1.1} numberOfLines={1} adjustsFontSizeToFit style={[{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1.6, textAlign: 'center' }, gold]}>O PASSAPORTE DA VIDA DO SEU PET</Text>
        <Text accessibilityRole="header" style={[{ fontFamily: F.serif, fontSize: Math.min(48, Math.floor(((width - 80) / 9 - 5) / 0.72)), letterSpacing: 5, marginBottom: 12 }, gold]} numberOfLines={1} adjustsFontSizeToFit>PATAPORTE</Text>
        <Emblem size={Math.min(190, width * 0.48)} />
        <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: F.bodyItalic, fontSize: 17, lineHeight: 24, color: C.goldPale, textAlign: 'center', marginTop: 14 }}>
          Saúde, rotina e memórias{'\n'}de quem você ama, num só lugar.
        </Text>
        {loadError && booted ? (
          <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: F.bodyBold, fontSize: 16, lineHeight: 22, color: C.goldPale, textAlign: 'center', marginTop: 10 }}>Não consegui carregar seus dados.{'\n'}Confira a internet e toque de novo.</Text>
        ) : null}
        <View style={{ height: 76, justifyContent: 'center', marginTop: 18 }}>
          {booted ? (
            <Animated.View style={{ transform: [{ scale: pulse }], alignSelf: "center" }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Toque para abrir" onPress={open}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 58, paddingHorizontal: 26, borderRadius: 29, alignSelf: 'center', backgroundColor: C.goldLight, borderWidth: 2, borderColor: C.goldPale, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8, opacity: pressed ? 0.85 : 1 })}>
                <Icon name="paw" size={20} color={C.coverDeep} sw={2.2} />
                <Text maxFontSizeMultiplier={1.1} numberOfLines={1} style={{ fontFamily: F.bodyBlack, fontSize: 17, letterSpacing: 0.8, color: C.coverDeep, flexShrink: 0 }}>{loadError ? 'TENTAR DE NOVO' : 'TOQUE PARA ABRIR'}</Text>
                <Icon name="chevron" size={18} color={C.coverDeep} sw={2.6} />
              </Pressable>
            </Animated.View>
          ) : <ActivityIndicator color={C.goldLight} size="large" />}
        </View>
      </View>
      <View style={{ alignItems: 'center', gap: 8, paddingBottom: 46 }}>
        <EChip w={40} />
        <Text maxFontSizeMultiplier={1.15} style={[{ fontFamily: F.mono, fontSize: 10, letterSpacing: 2.4, opacity: 0.8 }, gold]}>VACINAS · ROTINA · DIÁRIO · VIAGENS</Text>
      </View>
    </View>
  );
}
