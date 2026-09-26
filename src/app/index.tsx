import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useApp } from '@/store/app';
import { PaperRings } from '@/art/patterns';
import { PawFill, Spark } from '@/art/icons-home';
import { INTRO_CY, INTRO_HOLE, startIntroReveal } from '@/components/v11/home/IntroReveal';
import { C, F } from '@/theme';

/**
 * Abertura (Main / Abertura-2/3/4). Sem "toque para abrir": ~2,4 s de animação
 * (4 pegadinhas andam até o centro → carimbo com patinha cai com squash + onda dourada → "Pataporte"
 * → o círculo se abre revelando o app) e segue sozinho para login / cadastro / Home.
 * Reduzir movimento (acessibilidade) pula a animação. Só toca 1 vez por sessão.
 */

/** ms em que o carimbo começa a se abrir (a partir daqui a tela de destino já pode entrar).
 *  Marcos da linha do tempo abaixo tirados do Main.dc.html; a abertura do círculo dura REVEAL_MS (~0,65 s). */
const OPEN_AT = 1850;

let played = false;

function targetRoute(): string {
  const s = useApp.getState();
  if (!s.user) return s.onboardingSeen ? '/login' : '/onboarding';
  if (s.pets.length === 0) { s.startNewPassport(); return '/emissao/foto'; }
  return '/inicio';
}

export default function Abertura() {
  const { width: W, height: H } = useWindowDimensions();
  const booted = useApp((s) => s.booted);
  const loadError = useApp((s) => s.loadError);
  const [reduce, setReduce] = useState<boolean | null>(played ? true : null);
  const [animDone, setAnimDone] = useState(false);
  const gone = useRef(false);
  const [t] = useState(() => new Animated.Value(0));
  // chegou no ponto de abrir (sem animação: na hora)
  const ready = played || reduce === true || animDone;

  useEffect(() => {
    if (played) return;
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((r) => { if (alive) setReduce(r); }).catch(() => { if (alive) setReduce(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (reduce !== false) return;
    const a = Animated.timing(t, { toValue: OPEN_AT, duration: OPEN_AT, easing: Easing.linear, useNativeDriver: true });
    a.start(({ finished }) => { if (finished) setAnimDone(true); });
    return () => a.stop();
  }, [reduce, t]);

  const go = useCallback(() => {
    if (gone.current) return;
    gone.current = true;
    played = true;
    const to = targetRoute();
    if (reduce === false) startIntroReveal();
    router.replace(to as never);
  }, [reduce]);

  useEffect(() => {
    if (ready && booted && !loadError) go();
  }, [ready, booted, loadError, go]);

  // ---------------------------------------------------------------- geometria (mockup 390×844)
  const sx = W / 390;
  const sy = H / 844;
  const cx = W / 2;
  const cy = H * INTRO_CY;
  const S = INTRO_HOLE;
  const feet: [number, number, number][] = [[64, 734, 18], [114, 686, 34], [102, 620, 6], [152, 574, 26]];

  const iv = (input: number[], output: number[], easing?: (v: number) => number) => t.interpolate({ inputRange: input, outputRange: output, extrapolate: 'clamp', easing });
  const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
  const drop = Easing.bezier(0.55, 0, 0.9, 0.45);

  const footOpacity = (i: number) => iv([i * 250, i * 250 + 150, i * 250 + 400, 1250, 1900, 2100], [0, 1, 0.62, 0.26, 0.26, 0]);
  const footScale = (i: number) => iv([i * 250, i * 250 + 150], [0.6, 1], ease);

  const stampOpacity = iv([1000, 1200, 1900, 2100], [0, 1, 1, 0]);
  const stampSX = iv([1000, 1200, 1330, 1500, 1900, 2100], [1.25, 1.03, 0.99, 1, 1, 1.06], drop);
  const stampSY = iv([1000, 1200, 1330, 1500, 1900, 2100], [1.25, 0.95, 1.02, 1, 1, 1.06], drop);
  const rippleOpacity = iv([1195, 1200, 1750], [0, 0.85, 0]);
  const rippleScale = iv([1200, 1750], [1, 1.9], ease);
  const sparkOpacity = iv([1200, 1400, 1750], [0, 1, 0]);
  const sparkY = iv([1200, 1400, 1750], [-72, -90, -100], ease);
  const sparkScale = iv([1200, 1400, 1750], [0.3, 1, 0.4], ease);
  const nameOpacity = iv([1300, 1700, 1900, 2100], [0, 1, 1, 0]);
  const nameY = iv([1300, 1700], [8, 0], ease);
  const sparks: [number, number][] = [[-60, 13], [-15, 10], [30, 13], [120, 10], [165, 13], [210, 10]];

  const waiting = ready && (!booted || loadError);
  const still = reduce === true; // sem animação: mostra o quadro final parado

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }} accessible={false}>
      <StatusBar style="dark" />
      <PaperRings w={W} h={H} cy={cy} />

      <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {!still && feet.map(([x, y, rot], i) => (
          <View key={i} style={{ position: 'absolute', left: x * sx, top: y * sy, width: 28, height: 28, transform: [{ rotate: `${rot}deg` }] }}>
            <Animated.View style={{ opacity: footOpacity(i), transform: [{ scale: footScale(i) }] }}>
              <PawFill size={28} color={C.cover} />
            </Animated.View>
          </View>
        ))}

        {!still && (
          <Animated.View style={{ position: 'absolute', left: cx - S / 2, top: cy - S / 2, width: S, height: S, borderRadius: S / 2, borderWidth: 2, borderColor: C.goldLight, opacity: rippleOpacity, transform: [{ scale: rippleScale }] }} />
        )}
        {!still && sparks.map(([deg, size], i) => (
          <View key={i} style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0, transform: [{ rotate: `${deg}deg` }] }}>
            <Animated.View style={{ position: 'absolute', left: -size / 2, top: -size / 2, opacity: sparkOpacity, transform: [{ translateY: sparkY }, { scale: sparkScale }] }}>
              <Spark size={size} color={C.gold} />
            </Animated.View>
          </View>
        ))}

        {/* carimbo redondo com a patinha */}
        <Animated.View style={{ position: 'absolute', left: cx - S / 2, top: cy - S / 2, width: S, height: S, borderRadius: S / 2, borderWidth: 2, borderColor: C.gold, alignItems: 'center', justifyContent: 'center', opacity: still ? 1 : stampOpacity, transform: still ? [] : [{ scaleX: stampSX }, { scaleY: stampSY }] }}>
          <View style={{ position: 'absolute', left: 6, top: 6, right: 6, bottom: 6, borderRadius: S / 2, borderWidth: 1, borderColor: C.gold, opacity: 0.8 }} />
          <View style={{ position: 'absolute', left: 11, top: 11, right: 11, bottom: 11, borderRadius: S / 2, borderWidth: 1, borderStyle: 'dashed', borderColor: C.goldLight, opacity: 0.7 }} />
          <View style={{ marginTop: -2 }}><PawFill size={66} color={C.cover} opacity={0.94} /></View>
        </Animated.View>
      </View>

      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: cy + S / 2 + 17, alignItems: 'center', opacity: still ? 1 : nameOpacity, transform: still ? [] : [{ translateY: nameY }] }}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.1} style={{ fontFamily: F.serif, fontSize: 44, lineHeight: 52, color: C.cover, letterSpacing: 0.2 }}>Pataporte</Text>
      </Animated.View>

      {waiting ? (
        <View style={{ position: 'absolute', left: 24, right: 24, top: cy + S / 2 + 90, alignItems: 'center', gap: 14 }}>
          {loadError && booted ? (
            <>
              <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: F.bodyBold, fontSize: 17, lineHeight: 24, color: C.ink, textAlign: 'center' }}>
                Não consegui carregar seus dados.{'\n'}Confira a internet e tente de novo.
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Tentar de novo" onPress={() => useApp.getState().retryLoad()}
                style={({ pressed }) => ({ minHeight: 56, paddingHorizontal: 28, borderRadius: 28, backgroundColor: C.cover, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
                <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: F.bodyXBold, fontSize: 17, color: C.white }}>Tentar de novo</Text>
              </Pressable>
            </>
          ) : (
            <ActivityIndicator color={C.cover} size="large" accessibilityLabel="Carregando" />
          )}
        </View>
      ) : null}
    </View>
  );
}
