import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/store/app';
import { CircleStamp } from '@/art/Stamp';
import { Icon } from '@/art/Icon';
import { C, F } from '@/theme';
import { addDays, addRecurrence, fmtBR, fmtLong, parseBR, today } from '@/domain/dates';
import { recurrenceLabel } from '@/domain/itinerary';
import { Button, Chip, T } from './ui';
import { art } from '@/domain/words';

export function Toast() {
  const toast = useApp((s) => s.toast);
  const insets = useSafeAreaInsets();
  const y = useState(() => new Animated.Value(40))[0];
  useEffect(() => {
    if (toast) {
      AccessibilityInfo.announceForAccessibility(toast);
      Animated.spring(y, { toValue: 0, useNativeDriver: true }).start();
    } else y.setValue(40);
  }, [toast, y]);
  if (!toast) return null;
  return (
    <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 96, alignItems: 'center', transform: [{ translateY: y }] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.coverDeep, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11, maxWidth: 360 }}>
        <Icon name="stamp" size={18} color={C.goldLight} />
        <Text maxFontSizeMultiplier={1.15} style={{ color: C.goldPale, fontFamily: F.bodyBold, fontSize: 15, flexShrink: 1 }}>{toast}</Text>
      </View>
    </Animated.View>
  );
}

/** Big stamp that "hits" the page after carimbar. */
export function StampBurst() {
  const fx = useApp((s) => s.stampFx);
  const clear = useApp((s) => s.clearStampFx);
  const scale = useState(() => new Animated.Value(2.2))[0];
  const opacity = useState(() => new Animated.Value(0))[0];
  const shake = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!fx) return;
    let reduce = false;
    AccessibilityInfo.isReduceMotionEnabled().then((r) => { reduce = r; }).catch(() => {});
    scale.setValue(reduce ? 1 : 2.2);
    opacity.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.92, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(shake, { toValue: 1, duration: 40, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -1, duration: 40, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
    const t = setTimeout(() => clear(), 2300);
    return () => clearTimeout(t);
  }, [fx, clear, opacity, scale, shake]);

  if (!fx) return null;
  const tx = shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });
  return (
    <Pressable onPress={clear} accessibilityLabel={`Carimbado: ${fx.top}. Mais ${fx.miles} milhas.`} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(11,35,40,0.35)', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ opacity, transform: [{ scale }, { translateX: tx }], alignItems: 'center', gap: 16 }}>
        <View style={{ backgroundColor: 'rgba(251,246,234,0.94)', borderRadius: 200, padding: 14 }}>
          <CircleStamp top={fx.top} bottom={fx.bottom} main={fx.main} sub={fmtLong(fx.sub)} color={fx.color} size={220} rotation={-12} seed={fx.main.length + 9} />
        </View>
        <View style={{ backgroundColor: C.coverDeep, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10, alignItems: 'center', gap: 4 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Icon name="plane" size={16} color={C.goldLight} />
            <Text maxFontSizeMultiplier={1.15} style={{ color: C.goldPale, fontFamily: F.monoBold, fontSize: 14 }}>+{fx.miles} MILHAS</Text>
          </View>
          {fx.next ? <Text maxFontSizeMultiplier={1.15} style={{ color: C.goldPale, fontFamily: F.bodyBold, fontSize: 14 }}>{`Próxima dose: ${fmtBR(fx.next)}`}</Text> : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

/** Folha "Quando tomou?": aparece ao tocar em Carimbar, para registrar a data certa da aplicação. */
export function StampDateSheet() {
  const careId = useApp((s) => s.stampAsk);
  const care = useApp((s) => s.data.cares.find((c) => c.id === s.stampAsk));
  const petName = useApp((s) => s.pets.find((p) => p.id === s.activePetId)?.name ?? 'pet');
  const petSex = useApp((s) => s.pets.find((p) => p.id === s.activePetId)?.sex);
  const insets = useSafeAreaInsets();
  const t = today();
  const [mode, setMode] = useState<'hoje' | 'ontem' | 'outra'>('hoje');
  const [other, setOther] = useState('');
  const [place, setPlace] = useState('');
  const [busy, setBusy] = useState(false);
  // nova folha (outro cuidado): volta ao estado inicial — ajuste durante o render, sem efeito
  const [openFor, setOpenFor] = useState<string | null>(null);
  if (careId !== openFor) {
    setOpenFor(careId);
    if (careId) { setMode('hoje'); setOther(''); setPlace(care?.place ?? ''); setBusy(false); }
  }
  if (!careId || !care) return null;
  const day = mode === 'hoje' ? t : mode === 'ontem' ? addDays(t, -1) : parseBR(other);
  const valid = !!day && day <= t;
  const next = day ? addRecurrence(day, care.recurrence) : null;
  const close = () => useApp.getState().askStamp(null);
  const confirm = async () => {
    if (!valid || !day) return;
    setBusy(true);
    const replace = useApp.getState().stampReplace;
    if (replace && replace !== day) await useApp.getState().removeDose(care.id, replace);
    await useApp.getState().stamp(care.id, day, place);
  };
  const mask = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 8);
    return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(11,35,40,0.55)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Fechar" />
        <View style={{ backgroundColor: C.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 24 + insets.bottom, gap: 14 }}>
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: C.line }} />
          <View>
            <T v="eyebrow">CARIMBAR</T>
            <T v="serif" style={{ fontSize: 26, lineHeight: 30 }}>{care.category === 'vacina' || care.category === 'vermifugo' || care.category === 'remedio' ? `Quando ${art({ sex: petSex }).o} ${petName} tomou ${care.name}?` : care.category === 'antiparasitario' ? `Quando ${art({ sex: petSex }).o} ${petName} usou ${care.name.toLowerCase()}?` : care.category === 'exame' ? `Quando foi o ${care.name.toLowerCase()}?` : `Quando foi: ${care.name}?`}</T>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Hoje" on={mode === 'hoje'} onPress={() => setMode('hoje')} style={{ flex: 1, justifyContent: 'center' }} />
            <Chip label="Ontem" on={mode === 'ontem'} onPress={() => setMode('ontem')} style={{ flex: 1, justifyContent: 'center' }} />
            <Chip label="Outra" on={mode === 'outra'} onPress={() => setMode('outra')} style={{ flex: 1, justifyContent: 'center' }} />
          </View>
          {mode === 'outra' && (
            <TextInput maxFontSizeMultiplier={1.15} value={other} onChangeText={(v) => setOther(mask(v))} placeholder="DD/MM/AAAA" placeholderTextColor={C.inkFaint} keyboardType="number-pad" autoFocus accessibilityLabel="Data da aplicação"
              style={{ minHeight: 52, backgroundColor: 'rgba(255,255,255,0.6)', borderBottomWidth: 2, borderBottomColor: C.inkSoft, borderRadius: 10, paddingHorizontal: 14, fontFamily: F.monoBold, fontSize: 20, letterSpacing: 2, color: C.ink }} />
          )}
          <TextInput maxFontSizeMultiplier={1.15} value={place} onChangeText={setPlace} placeholder="Clínica ou veterinário (opcional)" placeholderTextColor={C.inkFaint} accessibilityLabel="Clínica ou veterinário"
            style={{ minHeight: 48, backgroundColor: 'rgba(255,255,255,0.6)', borderBottomWidth: 2, borderBottomColor: C.inkFaint, borderRadius: 10, paddingHorizontal: 14, fontFamily: F.body, fontSize: 15, color: C.ink }} />
          <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, gap: 8 }}>
            <Row k="Aplicada em" v={valid && day ? fmtBR(day) : mode === 'outra' && other.length === 10 ? 'Data inválida' : '—'} />
            <Row k="Repetição" v={recurrenceLabel(care.recurrence)} />
            <Row k="Próxima dose" v={!valid ? '—' : next ? fmtBR(next) : 'Não precisa repetir'} strong />
          </View>
          <Button label={busy ? 'Carimbando…' : `Carimbar · +${care.miles} milhas`} variant="stamp" icon="stamp" onPress={confirm} disabled={!valid} loading={busy} />
          <Button label="Cancelar" variant="ghost" onPress={close} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <T style={{ fontSize: 14, color: C.inkSoft }}>{k}</T>
      <T v={strong ? 'xbold' : 'bold'} style={{ fontSize: strong ? 17 : 15, color: strong ? C.cover : C.ink }}>{v}</T>
    </View>
  );
}
