import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, TextInput, View } from 'react-native';
import { Icon } from '@/art/Icon';
import { RectStamp } from '@/art/Stamp';
import { T, styles as ui } from '@/components/ui';
import { C, F } from '@/theme';

/** Bolinha de rádio. */
function Radio({ on }: { on: boolean }) {
  return (
    <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2.5, borderColor: on ? C.cover : '#8C7A58', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
      {on ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.cover }} /> : null}
    </View>
  );
}

/**
 * Opção de resposta larga (padrão Cap-Vacina / Dur-Quando): rádio à esquerda, texto grande.
 * Quando escolhida e com `children`, a opção se abre e mostra o complemento (data, mês…).
 */
export function RadioOption({ label, sub, on, onPress, children, a11y, compact }: {
  label: string; sub?: string; on: boolean; onPress: () => void; children?: React.ReactNode; a11y?: string; compact?: boolean;
}) {
  return (
    <View style={{ borderRadius: 16, borderWidth: on ? 2.5 : 1.5, borderColor: on ? C.cover : C.line, backgroundColor: on ? C.aquaPale : '#FFFFFF', flex: compact ? 1 : undefined }}>
      <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={a11y ?? label} onPress={onPress}
        style={({ pressed }) => ({ minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: compact ? 12 : 16, paddingVertical: 8, opacity: pressed ? 0.85 : 1 })}>
        <Radio on={on} />
        <View style={{ flex: 1 }}>
          <T v="xbold" style={{ fontSize: 17.5, lineHeight: 23 }}>{label}</T>
          {sub ? <T style={{ fontSize: 16, lineHeight: 20, color: C.inkSoft }}>{sub}</T> : null}
        </View>
      </Pressable>
      {on && children ? <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>{children}</View> : null}
    </View>
  );
}

/** Cartão de resposta com ícone (padrão Cap-Personalidade). */
export function CardOption({ label, sub, icon, on, onPress, a11y }: { label: string; sub?: string; icon?: React.ReactNode; on: boolean; onPress: () => void; a11y?: string }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={a11y ?? label} onPress={onPress}
      style={({ pressed }) => ({ minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16,
        borderWidth: on ? 2.5 : 2, borderColor: on ? C.cover : C.line, backgroundColor: on ? C.aquaPale : C.sheet, opacity: pressed ? 0.85 : 1 })}>
      {icon ? <View style={{ width: 30, alignItems: 'center' }}>{icon}</View> : null}
      <View style={{ flex: 1 }}>
        <T v="xbold" style={{ fontSize: 20, lineHeight: 25, color: on ? C.cover : C.ink }}>{label}</T>
        {sub ? <T style={{ fontSize: 16, lineHeight: 20, color: C.inkSoft }}>{sub}</T> : null}
      </View>
      {on ? (
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.cover, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={16} color="#FFFFFF" sw={3} />
        </View>
      ) : null}
    </Pressable>
  );
}

/** Pílula de escolha menor (sub-opções "Menos de 1 ano" / "Mais de 1 ano"). */
export function Pill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => ({ minHeight: 52, flex: 1, borderRadius: 12, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center',
        borderWidth: on ? 0 : 1.5, borderColor: C.line, backgroundColor: on ? C.cover : '#FFFFFF', opacity: pressed ? 0.85 : 1 })}>
      <T v="xbold" style={{ fontSize: 16, lineHeight: 20, textAlign: 'center', color: on ? '#FFFFFF' : C.ink }}>{label}</T>
    </Pressable>
  );
}

/** Caixas DD / MM / AAAA com rótulo (padrão Cap-Vacina). Pula sozinho para a próxima caixa. */
export function DateBoxes({ value, onChange, height = 56, labels = true }: { value: string; onChange: (v: string) => void; height?: number; labels?: boolean }) {
  const [d = '', m = '', y = ''] = value.split('/');
  const mRef = useRef<TextInput>(null);
  const yRef = useRef<TextInput>(null);
  const box = (v: string, len: number, ph: string, a11y: string, set: (x: string) => void, flex: number, ref?: React.RefObject<TextInput | null>, next?: React.RefObject<TextInput | null>) => (
    <View style={{ flex, gap: 4, alignItems: 'center' }}>
      {labels ? <T v="bold" style={{ fontSize: 16, color: C.inkSoft }}>{a11y}</T> : null}
      <TextInput ref={ref} maxFontSizeMultiplier={1.15} value={v} keyboardType="number-pad" maxLength={len} accessibilityLabel={a11y} placeholder={ph} placeholderTextColor={C.inkFaint}
        onChangeText={(t) => { const x = t.replace(/\D/g, '').slice(0, len); set(x); if (x.length === len) next?.current?.focus(); }}
        style={{ alignSelf: 'stretch', height, borderWidth: 2, borderColor: C.line, borderRadius: 12, backgroundColor: '#FFFFFF', textAlign: 'center', fontFamily: F.monoBold, fontSize: 22, color: C.ink, padding: 0 }} />
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {box(d, 2, 'DD', 'Dia', (x) => onChange(`${x}/${m}/${y}`), 1, undefined, mRef)}
      {box(m, 2, 'MM', 'Mês', (x) => onChange(`${d}/${x}/${y}`), 1, mRef, yRef)}
      {box(y, 4, 'AAAA', 'Ano', (x) => onChange(`${d}/${m}/${x}`), 1.4, yRef)}
    </View>
  );
}

/** Campo do nome: quando a pessoa termina, o nome ganha um carimbo "NOME REGISTRADO" (animação). */
export function NameField({ value, onChange, onDone }: { value: string; onChange: (v: string) => void; onDone?: () => void }) {
  const [editing, setEditing] = useState(!value.trim());
  const stamp = useState(() => new Animated.Value(value.trim() ? 1 : 0))[0];
  const inputRef = useRef<TextInput>(null);

  const finish = () => {
    if (value.trim().length < 2) return;
    onChange(value.trim().replace(/\s+/g, ' '));
    setEditing(false);
    stamp.setValue(0);
    Animated.timing(stamp, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(2.2)), useNativeDriver: true }).start();
    onDone?.();
  };
  useEffect(() => { if (editing) { const t = setTimeout(() => inputRef.current?.focus(), 80); return () => clearTimeout(t); } }, [editing]);

  if (editing) {
    return (
      <TextInput ref={inputRef} maxFontSizeMultiplier={1.15} value={value} onChangeText={onChange} onBlur={finish} onSubmitEditing={finish} returnKeyType="done"
        placeholder="Ex.: Simba" placeholderTextColor={C.inkFaint} autoCapitalize="words" autoCorrect={false} maxLength={40} accessibilityLabel="Nome do pet"
        style={[ui.input, { fontSize: 24, minHeight: 64, textAlign: 'center' }]} />
    );
  }
  const scale = stamp.interpolate({ inputRange: [0, 1], outputRange: [1.8, 1] });
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Nome: ${value}. Toque para mudar`} onPress={() => setEditing(true)}
      style={{ minHeight: 84, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.sheet, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10, overflow: 'hidden' }}>
      <View style={{ flex: 1 }}>
        <T v="serif" style={{ fontSize: 32, lineHeight: 38 }} numberOfLines={2}>{value}</T>
        <T v="bold" style={{ fontSize: 16, color: C.cover, textDecorationLine: 'underline' }}>Toque para mudar</T>
      </View>
      <Animated.View style={{ opacity: stamp, transform: [{ scale }, { rotate: '-9deg' }] }}>
        <RectStamp lines={['NOME', 'REGISTRADO']} color={C.green} width={96} height={46} rotation={0} seed={7} bigIndex={-1} />
      </Animated.View>
    </Pressable>
  );
}
