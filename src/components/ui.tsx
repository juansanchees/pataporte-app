import React from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { C, F } from '@/theme';
import { Icon, type IconName } from '@/art/Icon';

// ------------------------------------------------------------------ text
export const MAX_SCALE = 1.15;
type Variant = 'serif' | 'body' | 'bold' | 'xbold' | 'mono' | 'monoBold' | 'label' | 'eyebrow' | 'italic';
const VARIANTS: Record<Variant, TextStyle> = {
  serif: { fontFamily: F.serif, color: C.ink },
  body: { fontFamily: F.body, color: C.ink, fontSize: 16, lineHeight: 23 },
  bold: { fontFamily: F.bodyBold, color: C.ink, fontSize: 16 },
  xbold: { fontFamily: F.bodyXBold, color: C.ink, fontSize: 16 },
  italic: { fontFamily: F.bodyItalic, color: C.ink, fontSize: 14 },
  mono: { fontFamily: F.mono, color: C.ink, fontSize: 13.5 },
  monoBold: { fontFamily: F.monoBold, color: C.ink, fontSize: 13.5 },
  label: { fontFamily: F.mono, color: C.inkSoft, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' },
  eyebrow: { fontFamily: F.mono, color: C.inkSoft, fontSize: 12.5, letterSpacing: 1.2, textTransform: 'uppercase' },
};

export function T({ v = 'body', style, ...rest }: TextProps & { v?: Variant }) {
  // limita o "texto grande" do sistema para o layout não quebrar (ex.: R$29,9 / 0)
  return <Text maxFontSizeMultiplier={MAX_SCALE} {...rest} style={[VARIANTS[v], style]} />;
}

// ------------------------------------------------------------------ buttons
type BtnVariant = 'primary' | 'secondary' | 'premium' | 'stamp' | 'ghost' | 'locked' | 'danger';

export function Button({ label, onPress, variant = 'primary', icon, small, disabled, loading, style, accessibilityLabel }: {
  label: string; onPress?: () => void; variant?: BtnVariant; icon?: IconName; small?: boolean; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const v = BTN[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={!!disabled || !!loading}
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSm,
        v.box,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        style,
      ]}
    >
      {v.stitch && <View pointerEvents="none" style={[styles.stitch, { borderColor: v.stitch }]} />}
      {loading ? <ActivityIndicator color={v.text} /> : (
        <>
          {icon && <Icon name={icon} size={small ? 16 : 18} color={v.text} sw={2.2} />}
          <Text maxFontSizeMultiplier={MAX_SCALE} numberOfLines={2} style={[styles.btnText, small && { fontSize: 15.5 }, v.textStyle, { color: v.text, textAlign: 'center', flexShrink: 1 }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const BTN: Record<BtnVariant, { box: ViewStyle; text: string; stitch?: string; textStyle?: TextStyle }> = {
  primary: { box: { backgroundColor: C.cover, shadowColor: C.coverDark, shadowOpacity: 0.28, shadowRadius: 9, shadowOffset: { width: 0, height: 8 }, elevation: 4 }, text: C.goldPale, stitch: 'rgba(221,189,126,0.7)' },
  secondary: { box: { backgroundColor: 'transparent', borderWidth: 2, borderColor: C.cover }, text: C.cover },
  premium: { box: { backgroundColor: C.gold, elevation: 3 }, text: '#35260A', stitch: 'rgba(53,38,10,0.35)' },
  stamp: { box: { backgroundColor: C.coralInk, borderBottomWidth: 4, borderBottomColor: '#7C2A1A' }, text: '#FFFFFF', textStyle: { fontFamily: F.bodyXBold, fontSize: 16 } },
  ghost: { box: { backgroundColor: 'transparent', minHeight: 44 }, text: C.inkSoft, textStyle: { textDecorationLine: 'underline', textDecorationStyle: 'dotted' } },
  locked: { box: { backgroundColor: C.paper2, borderWidth: 2, borderStyle: 'dashed', borderColor: C.inkFaint }, text: C.inkSoft },
  danger: { box: { backgroundColor: C.red }, text: '#FFFFFF' },
};

export function IconButton({ icon, onPress, label, tone = 'paper', badge }: { icon: IconName; onPress?: () => void; label: string; tone?: 'paper' | 'cover' | 'red'; badge?: boolean }) {
  const bg = tone === 'cover' ? C.cover : C.paper2;
  const fg = tone === 'cover' ? C.goldPale : tone === 'red' ? C.red : C.ink;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4}
      style={({ pressed }) => [styles.iconBtn, { backgroundColor: bg, borderColor: tone === 'cover' ? C.cover : tone === 'red' ? C.red : C.inkFaint }, pressed && { opacity: 0.8 }]}>
      <Icon name={icon} size={20} color={fg} />
      {badge && <View style={styles.badgeDot} />}
    </Pressable>
  );
}

// ------------------------------------------------------------------ chips
export function Chip({ label, on, onPress, icon, style }: { label: string; on?: boolean; onPress?: () => void; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress}
      style={({ pressed }) => [styles.chip, on ? styles.chipOn : styles.chipOff, pressed && { opacity: 0.8 }, style]}>
      {on && !icon ? <Icon name="check" size={17} color={C.goldPale} sw={3} /> : null}
      {icon && <Icon name={icon} size={17} color={on ? C.goldPale : C.ink} sw={2.4} />}
      <Text maxFontSizeMultiplier={MAX_SCALE} style={[styles.chipText, { color: on ? C.goldPale : C.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ options, value, onChange, multi }: { options: string[]; value: string | string[]; onChange: (v: string) => void; multi?: boolean }) {
  const isOn = (o: string) => (multi ? (value as string[]).includes(o) : value === o);
  return (
    <View style={styles.wrap}>
      {options.map((o) => <Chip key={o} label={o} on={isOn(o)} onPress={() => onChange(o)} />)}
    </View>
  );
}

// ------------------------------------------------------------------ fields
export function FieldLabel({ pt }: { pt: string; en?: string }) {
  return (
    <Text maxFontSizeMultiplier={MAX_SCALE} style={styles.flabel}>{pt}</Text>
  );
}

export function Field({ pt, en, style, inputStyle, ...rest }: TextInputProps & { pt: string; en?: string; style?: StyleProp<ViewStyle>; inputStyle?: StyleProp<TextStyle> }) {
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      <FieldLabel pt={pt} en={en} />
      <TextInput maxFontSizeMultiplier={MAX_SCALE} placeholderTextColor={C.inkFaint} accessibilityLabel={pt} {...rest} style={[styles.input, inputStyle]} />
    </View>
  );
}

// ------------------------------------------------------------------ surfaces
export function Sheet({ children, style, dashed }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; dashed?: boolean }) {
  return <View style={[styles.sheet, dashed && { borderStyle: 'dashed', borderColor: C.inkFaint }, style]}>{children}</View>;
}

export function SectionTitle({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 6 }, style]}>
      <Text maxFontSizeMultiplier={MAX_SCALE} style={styles.sec}>{children.toUpperCase()}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
    </View>
  );
}

export function Row({ children, gap = 10, style }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function MilesChip({ text }: { text: string }) {
  return (
    <View style={styles.milesChip}>
      <Icon name="plane" size={12} color={C.aquaInk} sw={2.2} />
      <Text maxFontSizeMultiplier={MAX_SCALE} style={styles.milesChipText}>{text}</Text>
    </View>
  );
}

export function InfoNote({ text, tone = 'aqua', icon = 'info' }: { text: string; tone?: 'aqua' | 'red' | 'gold'; icon?: IconName }) {
  const t = tone === 'red' ? { bg: C.redPale, fg: C.red } : tone === 'gold' ? { bg: C.goldPale, fg: C.goldDark } : { bg: C.aquaPale, fg: C.aquaInk };
  return (
    <View style={{ flexDirection: 'row', gap: 10, backgroundColor: t.bg, borderRadius: 12, padding: 12 }}>
      <Icon name={icon} size={18} color={t.fg} />
      <Text maxFontSizeMultiplier={MAX_SCALE} style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 15.5, lineHeight: 22, color: t.fg }}>{text}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  btn: { minHeight: 54, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  btnSm: { minHeight: 48, borderRadius: 12, paddingHorizontal: 16, alignSelf: 'flex-start' },
  btnText: { fontFamily: F.bodyXBold, fontSize: 17 },
  stitch: { position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  badgeDot: { position: 'absolute', top: 7, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: C.coralInk, borderWidth: 2, borderColor: C.paper2 },
  chip: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, borderRadius: 12 },
  chipOn: { backgroundColor: C.cover, borderWidth: 1.5, borderColor: C.cover },
  chipOff: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: C.inkFaint },
  chipText: { fontFamily: F.bodyBold, fontSize: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flabel: { fontFamily: F.bodyXBold, fontSize: 17, lineHeight: 23, color: C.ink, marginBottom: 8 },
  input: { minHeight: 56, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: C.inkFaint, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontFamily: F.bodyBold, fontSize: 18, color: C.ink },
  sheet: { backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 14, shadowColor: '#2A2622', shadowOpacity: 0.06, shadowRadius: 7, shadowOffset: { width: 0, height: 6 }, elevation: 1 },
  sec: { fontFamily: F.monoBold, fontSize: 13, letterSpacing: 1.2, color: C.inkSoft },
  milesChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.aquaPale, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, alignSelf: 'flex-start' },
  milesChipText: { fontFamily: F.monoBold, fontSize: 13, color: C.aquaInk, letterSpacing: 0.4 },
});
