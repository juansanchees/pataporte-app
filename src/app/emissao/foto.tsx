import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { useApp } from '@/store/app';
import { EmissionPage } from '@/components/emission';
import { Button, InfoNote, T } from '@/components/ui';
import { PetPhoto } from '@/components/passport';
import { Leather } from '@/art/patterns';
import { Icon } from '@/art/Icon';
import { pickImage, resolvePhotoUri } from '@/services/photos';
import { aiEnabled, aiErrorText, analyzePetPhoto, ensureAiConsent, imageForAi, type PhotoAnalysis } from '@/services/ai';
import { C } from '@/theme';

type Phase = 'idle' | 'reading' | 'done' | 'nokey' | 'notpet' | 'error';

/** Etapa 1: a foto do pet. A IA (Gemini) lê a foto e monta o avatar; o tutor só confere. */
export default function Foto() {
  const { width } = useWindowDimensions();
  const w = width - 48;
  const H = Math.round(w * 1.05);
  const d = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const [phase, setPhase] = useState<Phase>(d.photoUri ? (d.aiSummary ? 'done' : 'idle') : 'idle');
  const [result, setResult] = useState<PhotoAnalysis | null>(null);
  const [errMsg, setErrMsg] = useState('');
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase !== 'reading') return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(scan, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(scan, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [phase, scan]);

  const analyze = async (uri: string) => {
    if (!aiEnabled()) { setPhase('nokey'); return; }
    if (!(await ensureAiConsent())) { setPhase('idle'); return; }
    setPhase('reading');
    try {
      const img = await imageForAi(uri); // foto reduzida (1024 px): mais rápida e sem erro de tamanho
      const r = await analyzePetPhoto(img);
      if (!r.isPet) { setPhase('notpet'); return; }
      setResult(r);
      setDraft({ species: r.species, breed: r.breed, coat: r.coatHex, coatName: r.coatName, details: r.details, size: r.size, ancestry: r.mixes, aiSummary: r.summary || `${r.species === 'dog' ? 'Cão' : 'Gato'} ${r.breed}, pelagem ${r.coatName.toLowerCase()}.` });
      setPhase('done');
    } catch (e) {
      setErrMsg(`Não consegui ler a foto (${aiErrorText(e)}).`);
      setPhase('error');
    }
  };

  const get = async (src: 'camera' | 'library') => {
    const p = await pickImage(src, { aspect: [3, 4], folder: 'passaporte' });
    if (!p) return;
    setDraft({ photoUri: p.uri, aiSummary: '' });
    setResult(null);
    analyze(p.uri);
  };

  const manual = () => router.push('/emissao/especie');
  const confirm = () => router.push('/emissao/perfil');
  const ty = scan.interpolate({ inputRange: [0, 1], outputRange: [20, H - 24] });

  const footerLabel = phase === 'done' ? 'Está certo, continuar' : phase === 'idle' ? 'Montar sem foto' : 'Montar manualmente';
  const onNext = phase === 'done' ? confirm : manual;
  const details = d.details;
  const found: [string, string][] = [
    ['Espécie', d.species === 'dog' ? 'Cachorro' : 'Gato'],
    ['Raça', d.breed],
    ['Cor', d.coatName],
    ['Olhos', details.olhos],
    ['Orelhas', details.orelhas],
    ['Manchas', details.manchas],
    ...(d.ancestry.length ? [['Parece com', d.ancestry.join(' e ')] as [string, string]] : []),
    ...(d.size ? [['Porte', d.size.charAt(0).toUpperCase() + d.size.slice(1)] as [string, string]] : []),
  ];

  return (
    <EmissionPage step={0} title={phase === 'done' ? 'Encontramos!' : 'Foto do seu pet'} onNext={onNext} nextLabel={footerLabel} disabled={phase === 'reading'}
      extraFooter={phase === 'done' ? <Button label="Ajustar algum detalhe" variant="ghost" small onPress={manual} style={{ alignSelf: 'center' }} /> : undefined}>
      {phase !== 'done' && (
        <T style={{ color: C.inkSoft, marginBottom: 14, fontSize: 15.5 }}>
          Mande uma foto e a IA monta o avatar sozinha: espécie, raça, cor e detalhes. A foto também vira a foto do passaporte.
        </T>
      )}

      {phase === 'done' ? (
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <View style={{ width: 132, height: 170, borderRadius: 8, overflow: 'hidden', backgroundColor: C.paper3 }}>
                {d.photoUri ? <Image source={{ uri: resolvePhotoUri(d.photoUri) }} style={{ width: 132, height: 170 }} accessibilityLabel="Foto enviada" /> : null}
              </View>
              <T v="bold" style={{ fontSize: 14.5, color: C.inkSoft }}>Foto</T>
            </View>
            <View style={{ justifyContent: 'center' }}><Icon name="sparkle" size={26} color={C.gold} /></View>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <PetPhoto pet={{ species: d.species, coat: d.coat, details: d.details, equipped: [] }} w={132} h={170} />
              <T v="bold" style={{ fontSize: 14.5, color: C.inkSoft }}>Avatar</T>
            </View>
          </View>
          {d.aiSummary ? <T v="italic" style={{ fontSize: 16, textAlign: 'center' }}>{`“${d.aiSummary}”`}</T> : null}
          <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 16 }}>
            {found.map(([k, v], i) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderStyle: 'dashed', borderColor: C.line }}>
                <T style={{ color: C.inkSoft, fontSize: 15 }}>{k}</T>
                <T v="xbold" style={{ fontSize: 15 }}>{v}</T>
              </View>
            ))}
          </View>
          {result && result.confidence < 0.55 ? <InfoNote tone="gold" text="A IA não teve certeza da raça. Se não estiver certo, toque em “Ajustar algum detalhe”." /> : null}
          <Button label="Trocar a foto" variant="secondary" icon="camera" onPress={() => get('library')} />
        </View>
      ) : (
        <>
          <View style={{ height: H, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Leather w={w} h={H} color={C.coverDark} radius={16} />
            {d.photoUri ? <Image source={{ uri: resolvePhotoUri(d.photoUri) }} style={{ position: 'absolute', width: w, height: H }} resizeMode="cover" accessibilityLabel="Foto do pet" /> : null}
            <Svg width={w} height={H} style={{ position: 'absolute' }} pointerEvents="none">
              {!d.photoUri && <Ellipse cx={w / 2} cy={H * 0.46} rx={w * 0.3} ry={H * 0.34} fill="none" stroke={C.goldLight} strokeWidth={2.2} strokeDasharray="8 7" />}
              <Path d={`M28 44 V26 H46 M${w - 46} 26 H${w - 28} V44 M28 ${H - 44} V${H - 26} H46 M${w - 46} ${H - 26} H${w - 28} V${H - 44}`} stroke={C.goldPale} strokeWidth={3} fill="none" strokeLinecap="round" />
            </Svg>
            {phase === 'reading' && (
              <>
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(11,35,40,0.35)' }} />
                <Animated.View style={{ position: 'absolute', left: 20, right: 20, top: 0, height: 3, borderRadius: 2, backgroundColor: C.goldLight, transform: [{ translateY: ty }] }} />
                <View style={{ position: 'absolute', bottom: 22, backgroundColor: C.coverDeep, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <T v="bold" style={{ color: C.goldPale, fontSize: 14 }}>Lendo a foto… raça, cor e detalhes</T>
                </View>
              </>
            )}
            {!d.photoUri && (
              <View style={{ position: 'absolute', alignItems: 'center', gap: 8 }}>
                <Icon name="camera" size={40} color={C.goldLight} />
                <T v="bold" style={{ color: C.goldPale, fontSize: 15 }}>Rosto do pet dentro do oval</T>
              </View>
            )}
          </View>

          {phase === 'nokey' && <View style={{ marginBottom: 12 }}><InfoNote tone="gold" text="A leitura automática está desligada. A foto ficou salva: agora é só montar em 4 toques." /></View>}
          {phase === 'notpet' && <View style={{ marginBottom: 12 }}><InfoNote tone="red" text="Não encontrei um cão ou gato nessa foto. Tente outra, com o rosto bem visível." /></View>}
          {phase === 'error' && (
            <View style={{ marginBottom: 12, gap: 10 }}>
              <InfoNote tone="red" text={errMsg} />
              {d.photoUri ? <Button label="Tentar ler de novo" icon="sparkle" onPress={() => analyze(d.photoUri!)} /> : null}
            </View>
          )}

          {phase !== 'reading' && (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <Button label="Tirar foto" icon="camera" onPress={() => get('camera')} style={{ flex: 1 }} />
              <Button label="Galeria" icon="image" variant="secondary" onPress={() => get('library')} style={{ flex: 1 }} />
            </View>
          )}
          <View style={{ gap: 8 }}>
            {['Boa luz, de frente', 'Olhos e focinho aparecendo', 'Só um pet na foto'].map((t) => (
              <View key={t} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Icon name="check" size={18} color={C.aquaInk} sw={2.6} />
                <T style={{ fontSize: 15 }}>{t}</T>
              </View>
            ))}
          </View>
        </>
      )}
    </EmissionPage>
  );
}
