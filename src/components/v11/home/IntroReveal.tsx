import React, { useCallback, useEffect, useState } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { C } from '@/theme';

/**
 * Último quadro da abertura (Main / Abertura-4): o círculo do carimbo se abre e revela o app.
 * Fica no _layout raiz, POR CIMA da navegação, para que a tela de destino (Home, login…) já apareça
 * dentro do círculo enquanto ele cresce. É um anel cor de papel com um "furo" no meio: o furo cresce
 * (escala no driver nativo) até cobrir a tela toda.
 */
export const INTRO_HOLE = 132;
export const INTRO_CY = 0.42;
export const REVEAL_MS = 650;

let listener: ((on: boolean) => void) | null = null;
let pending = false;

/** Chamado pela abertura (index.tsx) logo antes de navegar para o destino. */
export function startIntroReveal() {
  if (listener) listener(true);
  else pending = true;
}

export function IntroRevealHost() {
  const [on, setOn] = useState(() => { const p = pending; pending = false; return p; });
  useEffect(() => {
    listener = setOn;
    return () => { listener = null; };
  }, []);
  const done = useCallback(() => setOn(false), []);
  if (!on) return null;
  return <Reveal onDone={done} />;
}

function Reveal({ onDone }: { onDone: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const [t] = useState(() => new Animated.Value(0));
  const cx = W / 2;
  const cy = H * INTRO_CY;
  const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 8;
  const hole = INTRO_HOLE / 2;
  const scaleEnd = (R / hole) * 1.04;

  useEffect(() => {
    const a = Animated.timing(t, { toValue: 1, duration: REVEAL_MS, easing: Easing.bezier(0.65, 0, 0.25, 1), useNativeDriver: true });
    a.start(() => onDone());
    return () => a.stop();
  }, [t, onDone]);

  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, scaleEnd] });
  const edge = t.interpolate({ inputRange: [0, 0.1, 0.5, 0.8, 1], outputRange: [0, 0.95, 0.6, 0, 0] });
  const border = R - hole;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={{ position: 'absolute', left: cx - R, top: cy - R, width: R * 2, height: R * 2, borderRadius: R, borderWidth: border, borderColor: C.paper, transform: [{ scale }] }} />
      <Animated.View style={{ position: 'absolute', left: cx - hole, top: cy - hole, width: hole * 2, height: hole * 2, borderRadius: hole, borderWidth: 2, borderColor: C.goldLight, opacity: edge, transform: [{ scale }] }} />
    </View>
  );
}
