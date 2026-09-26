import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/store/app';
import { EmissionPage } from '@/components/emission';
import { ChipRow, FieldLabel, InfoNote, T, styles as ui } from '@/components/ui';
import { RectStamp } from '@/art/Stamp';
import { parseBR, today } from '@/domain/dates';
import { C, F } from '@/theme';

/** Três caixinhas de data: DD / MM / AAAA (pula sozinho para a próxima). */
function DateBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [d = '', m = '', y = ''] = value.split('/');
  const mRef = useRef<TextInput>(null);
  const yRef = useRef<TextInput>(null);
  const part = (v: string, len: number, ph: string, a11y: string, set: (x: string) => void, ref?: React.RefObject<TextInput | null>, next?: React.RefObject<TextInput | null>) => (
    <TextInput ref={ref} maxFontSizeMultiplier={1.15} value={v} keyboardType="number-pad" maxLength={len} accessibilityLabel={a11y} placeholder={ph} placeholderTextColor={C.inkFaint}
      onChangeText={(t) => { const x = t.replace(/\D/g, '').slice(0, len); set(x); if (x.length === len) next?.current?.focus(); }}
      style={{ width: len === 4 ? 104 : 70, height: 58, borderWidth: 1.5, borderColor: C.inkFaint, borderRadius: 12, backgroundColor: '#FFFFFF', textAlign: 'center', fontFamily: F.bodyBold, fontSize: 20, color: C.ink }} />
  );
  const sep = <T style={{ color: C.inkSoft, fontSize: 22 }}>/</T>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {part(d, 2, 'DD', 'Dia', (x) => onChange(`${x}/${m}/${y}`), undefined, mRef)}{sep}
      {part(m, 2, 'MM', 'Mês', (x) => onChange(`${d}/${x}/${y}`), mRef, yRef)}{sep}
      {part(y, 4, 'AAAA', 'Ano', (x) => onChange(`${d}/${m}/${x}`), yRef)}
    </View>
  );
}

/** Campo livre para o nome. Quando a pessoa termina, o nome ganha um carimbo de passaporte. */
function NameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(!value.trim());
  const stamp = useRef(new Animated.Value(value.trim() ? 1 : 0)).current;
  const inputRef = useRef<TextInput>(null);

  const finish = () => {
    if (value.trim().length < 2) return;
    onChange(value.trim().replace(/\s+/g, ' '));
    setEditing(false);
    stamp.setValue(0);
    Animated.timing(stamp, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(2.2)), useNativeDriver: true }).start();
  };
  useEffect(() => { if (editing) setTimeout(() => inputRef.current?.focus(), 50); }, [editing]);

  if (editing) {
    return (
      <TextInput ref={inputRef} maxFontSizeMultiplier={1.15} value={value} onChangeText={onChange} onBlur={finish} onSubmitEditing={finish} returnKeyType="done"
        placeholder="Ex.: Simba" placeholderTextColor={C.inkFaint} autoCapitalize="words" autoCorrect={false} maxLength={40} accessibilityLabel="Nome do pet"
        style={[ui.input, { fontSize: 22, minHeight: 60 }]} />
    );
  }
  const scale = stamp.interpolate({ inputRange: [0, 1], outputRange: [1.8, 1] });
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Nome: ${value}. Toque para mudar`} onPress={() => setEditing(true)}
      style={{ minHeight: 76, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.sheet, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10, overflow: 'hidden' }}>
      <View style={{ flex: 1 }}>
        <T v="serif" style={{ fontSize: 30, lineHeight: 36 }} numberOfLines={2}>{value}</T>
        <T v="bold" style={{ fontSize: 14, color: C.cover, textDecorationLine: 'underline' }}>Toque para mudar</T>
      </View>
      <Animated.View style={{ opacity: stamp, transform: [{ scale }, { rotate: '-9deg' }] }}>
        <RectStamp lines={['NOME', 'REGISTRADO']} color={C.green} width={96} height={46} rotation={0} seed={7} bigIndex={-1} />
      </Animated.View>
    </Pressable>
  );
}

export default function Dados() {
  const d = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const editing = d.editingPetId !== null;
  const [err, setErr] = useState('');
  const fem = d.sex === 'F';

  const next = async () => {
    const birth = parseBR(d.birth);
    if (d.name.trim().length < 2) return setErr('Escreva o nome do pet.');
    if (!birth || birth > today()) return setErr('Confira a data de nascimento. Se não souber o dia, use 01.');
    if (Number(today().slice(0, 4)) - Number(birth.slice(0, 4)) > 30) return setErr('Confira o ano de nascimento: mais de 30 anos?');
    const kg = d.weight.trim() ? parseFloat(d.weight.replace(',', '.')) : null;
    if (kg !== null && (!Number.isFinite(kg) || kg <= 0 || kg > 150)) return setErr('Confira o peso (ex.: 12,5). Se não souber, deixe em branco.');
    setErr('');
    setDraft({ name: d.name.trim().replace(/\s+/g, ' ') });
    if (editing) { await useApp.getState().saveEdit(); router.back(); return; }
    router.push('/emissao/saude');
  };

  return (
    <EmissionPage step={6} title="Dados do pet" onNext={next} final>
      <View style={{ marginBottom: 22 }}><FieldLabel pt="Qual é o nome?" /><NameField value={d.name} onChange={(v) => setDraft({ name: v })} /></View>
      <View style={{ marginBottom: 22 }}><FieldLabel pt="É macho ou fêmea?" /><ChipRow options={['Macho', 'Fêmea']} value={fem ? 'Fêmea' : 'Macho'} onChange={(v) => setDraft({ sex: v === 'Fêmea' ? 'F' : 'M' })} /></View>
      <View style={{ marginBottom: 22 }}>
        <FieldLabel pt="Quando nasceu?" />
        <DateBoxes value={d.birth} onChange={(v) => setDraft({ birth: v })} />
        <T style={{ fontSize: 14.5, color: C.inkSoft, marginTop: 8 }}>Não sabe o dia? Coloque 01.</T>
      </View>
      <View style={{ marginBottom: 22 }}>
        <FieldLabel pt="Quanto pesa? (opcional)" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TextInput maxFontSizeMultiplier={1.15} value={d.weight} onChangeText={(t) => setDraft({ weight: t.replace(/[^\d,.]/g, '').slice(0, 6) })} keyboardType="decimal-pad" placeholder="Ex.: 12,5" placeholderTextColor={C.inkFaint} accessibilityLabel="Peso em quilos"
            style={[ui.input, { width: 140 }]} />
          <T v="bold" style={{ fontSize: 18 }}>kg</T>
        </View>
      </View>
      <View style={{ marginBottom: 18 }}>
        <FieldLabel pt={fem ? 'É castrada?' : 'É castrado?'} />
        <ChipRow options={['Sim', 'Não', 'Não sei']} value={{ sim: 'Sim', nao: 'Não', naosei: 'Não sei' }[d.neutered]} onChange={(v) => setDraft({ neutered: v === 'Sim' ? 'sim' : v === 'Não' ? 'nao' : 'naosei' })} />
      </View>
      {err ? <InfoNote tone="red" text={err} /> : null}
    </EmissionPage>
  );
}
