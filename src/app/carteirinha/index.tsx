import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useActivePet, useApp } from '@/store/app';
import { T } from '@/components/ui';
import { Icon } from '@/art/Icon';
import { useCadastro } from '@/components/v11/cadastro/session';
import { startVaccines } from '@/components/v11/cadastro/flow';
import { pickImage, resolvePhotoUri } from '@/services/photos';
import { aiEnabled, aiErrorText, ensureAiConsent, readVaccineCard } from '@/services/ai';
import { track } from '@/services/analytics';
import { C } from '@/theme';

type Phase = 'idle' | 'reading' | 'nokey' | 'limit' | 'notcard' | 'empty' | 'error';

/** Carteirinha-Foto: foto da carteirinha de vacina (papel) → IA lê vacinas e datas → conferência. */
export default function CarteirinhaFoto() {
  const { origem } = useLocalSearchParams<{ origem?: string }>();
  const cadastro = origem === 'cadastro';
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const pet = useActivePet();
  const species = useApp((s) => (cadastro ? s.draft.species : pet?.species ?? s.draft.species));
  const [phase, setPhase] = useState<Phase>('idle');
  const [uri, setUri] = useState('');
  const [err, setErr] = useState('');
  const scan = useRef(new Animated.Value(0)).current;
  const fw = Math.min(322, width - 68);
  const fh = Math.min(Math.round(fw * 1.34), Math.round(height * 0.5));

  useEffect(() => {
    if (phase !== 'reading') return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(scan, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(scan, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [phase, scan]);

  const close = () => (router.canGoBack() ? router.back() : router.replace(useApp.getState().pets.length ? '/inicio' : '/'));
  const manual = () => {
    if (cadastro) { startVaccines(true); return; }
    close();
  };

  const read = async (photo: string) => {
    if (!aiEnabled()) { setPhase('nokey'); return; }
    if (!(await ensureAiConsent())) { setPhase('idle'); return; }
    if ((await useApp.getState().consumeCardScan()) === 'limit') { setPhase('limit'); return; }
    setPhase('reading');
    try {
      const r = await readVaccineCard(photo, species);
      if (!r.isCard) { setPhase('notcard'); return; }
      const items = r.items.filter((it) => it.kind !== 'outro');
      track('carteirinha_lida', { itens: items.length, origem: cadastro ? 'cadastro' : 'pet' });
      if (!items.length) { setPhase('empty'); return; }
      useCadastro.getState().set({ card: { uri: photo, items } });
      router.replace({ pathname: '/carteirinha/resultado', params: { origem: cadastro ? 'cadastro' : 'pet' } });
    } catch (e) {
      setErr(`Não consegui ler a foto (${aiErrorText(e)}).`);
      setPhase('error');
    }
  };

  const get = async (src: 'camera' | 'library') => {
    const p = await pickImage(src, { aspect: [3, 4], folder: 'carteirinha' });
    if (!p) return;
    setUri(p.uri);
    read(p.uri);
  };

  const msg: Partial<Record<Phase, string>> = {
    nokey: 'A leitura automática está desligada. Toque em “Digitar à mão”.',
    limit: 'Você já usou as leituras de carteirinha deste mês. Dá para digitar à mão.',
    notcard: 'Não parece uma carteirinha de vacina. Tente outra foto, com boa luz e a página inteira.',
    empty: 'Não encontrei vacinas nessa foto. Tente outra página ou digite à mão.',
    error: err,
  };
  const ty = scan.interpolate({ inputRange: [0, 1], outputRange: [16, fh - 20] });
  const cornerPath = `M4 34 V4 H34 M${fw - 34} 4 H${fw - 4} V34 M4 ${fh - 34} V${fh - 4} H34 M${fw - 34} ${fh - 4} H${fw - 4} V${fh - 34}`;

  return (
    <View style={{ flex: 1, backgroundColor: C.coverDark }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={close} style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={22} color="#FFFFFF" sw={2.4} />
        </Pressable>
        <T v="xbold" accessibilityRole="header" style={{ flex: 1, fontSize: 18, color: '#FFFFFF', textAlign: 'center', marginRight: 48 }}>Carteirinha de vacina</T>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: fw, height: fh }}>
          <View style={{ position: 'absolute', left: 14, right: 14, top: 14, bottom: 14, borderRadius: 10, backgroundColor: C.paper, padding: 20, overflow: 'hidden' }}>
            {uri ? <Image source={{ uri: resolvePhotoUri(uri) }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} resizeMode="cover" accessibilityLabel="Foto da carteirinha" /> : (
              <>
                <View style={{ height: 14, width: '62%', borderRadius: 4, backgroundColor: C.line, marginBottom: 18 }} />
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {[C.aquaPale, C.amberPale, C.purplePale, C.greenPale].map((c) => <View key={c} style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: c }} />)}
                </View>
                {[1, 1, 1, 1, 0.7].map((w, k) => <View key={k} style={{ height: 2, width: `${w * 100}%`, backgroundColor: '#E6D8BA', marginBottom: 14 }} />)}
              </>
            )}
            {phase === 'reading' ? (
              <>
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(11,35,40,0.35)' }} />
                <Animated.View style={{ position: 'absolute', left: 12, right: 12, top: 0, height: 3, borderRadius: 2, backgroundColor: C.goldLight, transform: [{ translateY: ty }] }} />
              </>
            ) : null}
          </View>
          <Svg width={fw} height={fh} style={{ position: 'absolute' }} pointerEvents="none">
            <Path d={cornerPath} stroke={C.gold} strokeWidth={4} fill="none" strokeLinecap="round" />
          </Svg>
        </View>
      </View>

      <View style={{ paddingHorizontal: 28, gap: 6, alignItems: 'center' }} accessibilityLiveRegion="polite">
        {phase === 'reading' ? (
          <T v="xbold" style={{ fontSize: 18, color: '#FFFFFF', textAlign: 'center' }}>Lendo as vacinas e as datas…</T>
        ) : msg[phase] ? (
          <T v="xbold" style={{ fontSize: 17, lineHeight: 23, color: C.goldLight, textAlign: 'center' }}>{msg[phase]}</T>
        ) : (
          <>
            <T v="xbold" style={{ fontSize: 18, lineHeight: 24, color: '#FFFFFF', textAlign: 'center' }}>Encaixe a página das vacinas dentro do quadro</T>
            <T v="bold" style={{ fontSize: 16, lineHeight: 21, color: '#C7D6D3', textAlign: 'center' }}>Pode ser a carteirinha de papel do veterinário</T>
          </>
        )}
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: insets.bottom + 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Escolher da galeria" disabled={phase === 'reading'} onPress={() => get('library')}
          style={{ minWidth: 88, minHeight: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, flexDirection: 'row', gap: 6 }}>
          <Icon name="image" size={18} color="#FFFFFF" />
          <T v="xbold" style={{ fontSize: 16, color: '#FFFFFF' }}>Galeria</T>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Tirar foto" disabled={phase === 'reading'} onPress={() => get('camera')}
          style={({ pressed }) => ({ width: 78, height: 78, borderRadius: 39, backgroundColor: '#FFFFFF', borderWidth: 5, borderColor: 'rgba(255,255,255,0.35)', opacity: phase === 'reading' ? 0.4 : pressed ? 0.8 : 1 })} />
        <Pressable accessibilityRole="button" accessibilityLabel="Digitar à mão" onPress={manual} style={{ minWidth: 88, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          <T v="xbold" style={{ fontSize: 16, color: '#FFFFFF', textDecorationLine: 'underline' }}>Digitar à mão</T>
        </Pressable>
      </View>
    </View>
  );
}
