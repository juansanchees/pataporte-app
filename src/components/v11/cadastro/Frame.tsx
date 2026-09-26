import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/art/Icon';
import { T } from '@/components/ui';
import { useApp } from '@/store/app';
import { C, F } from '@/theme';

export const CHAPTERS = [
  { n: 1, name: 'Quem é você?', short: 'QUEM É VOCÊ', sub: 'foto, nome, nascimento' },
  { n: 2, name: 'Personalidade', short: 'PERSONALIDADE', sub: '1 min' },
  { n: 3, name: 'Vacinas', short: 'VACINAS', sub: '1 min' },
  { n: 4, name: 'Vermífugo e antipulgas', short: 'VERMÍFUGO E ANTIPULGAS', sub: '1 min' },
  { n: 5, name: 'Outros cuidados', short: 'OUTROS CUIDADOS', sub: '1 min' },
] as const;

export const TOTAL_CHAPTERS = 5;

/** As 5 "páginas do passaporte" do progresso. `cap` = capítulo atual (1..5). */
export function ChapterProgress({ cap, done = false, label }: { cap: number; done?: boolean; label?: string }) {
  const name = CHAPTERS[cap - 1]?.short ?? '';
  return (
    <View style={{ flex: 1, gap: 6 }} accessible accessibilityLabel={`Capítulo ${cap} de 5, ${CHAPTERS[cap - 1]?.name ?? ''}${done ? ', concluído' : ''}`}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {CHAPTERS.map((c) => {
          const filled = c.n < cap || (done && c.n === cap);
          const current = c.n === cap && !done;
          return (
            <View key={c.n} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: filled ? C.cover : current ? C.goldPale : C.line, borderWidth: current ? 2 : 0, borderColor: C.gold }} />
          );
        })}
      </View>
      <T v="eyebrow" style={{ fontSize: 12, color: C.inkSoft, letterSpacing: 1.3 }} numberOfLines={2}>{label ?? `CAPÍTULO ${cap} DE 5 · ${done ? 'CONCLUÍDO' : name}`}</T>
    </View>
  );
}

export function BackButton({ onPress }: { onPress?: () => void }) {
  const go = onPress ?? (() => (router.canGoBack() ? router.back() : router.replace(useApp.getState().pets.length ? '/inicio' : '/')));
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={go} hitSlop={6}
      style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 14, borderWidth: 2, borderColor: C.line, backgroundColor: C.sheet, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
      <Icon name="back" size={22} sw={2.4} />
    </Pressable>
  );
}

/** Botão grande do rodapé (60 px, como nos mockups). */
export function BigButton({ label, onPress, disabled, loading, variant = 'primary', icon, style }: {
  label: string; onPress?: () => void; disabled?: boolean; loading?: boolean; variant?: 'primary' | 'outline'; icon?: React.ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled || !!loading }} disabled={!!disabled || !!loading} onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [{
        minHeight: primary ? 60 : 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 18,
        backgroundColor: primary ? (disabled ? C.paper3 : C.cover) : 'transparent', borderWidth: primary ? 0 : 2, borderColor: C.cover,
        opacity: pressed ? 0.88 : 1,
      }, style]}>
      {loading ? <ActivityIndicator color={primary ? '#FFFFFF' : C.cover} /> : (
        <>
          {icon}
          <T style={{ fontFamily: F.bodyXBold, fontSize: 18, color: primary ? (disabled ? C.inkSoft : '#FFFFFF') : C.cover, textAlign: 'center', flexShrink: 1 }}>{label}</T>
        </>
      )}
    </Pressable>
  );
}

/** Link de texto sob o botão ("Ver as outras vacinas", "Tirar foto da carteirinha"). */
export function TextLink({ label, onPress, color = C.inkSoft }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
      <T v="xbold" style={{ fontSize: 16, color, textDecorationLine: 'underline' }}>{label}</T>
    </Pressable>
  );
}

/**
 * Moldura de toda tela do cadastro: barra do topo (voltar + 5 páginas + "CAPÍTULO N DE 5 · NOME"),
 * conteúdo centralizado e distribuído na vertical, e o botão fixo no rodapé.
 */
export function ChapterFrame({ cap, done, label, children, onNext, nextLabel = 'Continuar', disabled, loading, secondary, footerTop, back = true, onBack, gap = 16, justify = 'space-evenly', padH = 24 }: {
  cap: number; done?: boolean; label?: string; children: React.ReactNode; onNext?: () => void; nextLabel?: string; disabled?: boolean; loading?: boolean;
  secondary?: React.ReactNode; footerTop?: React.ReactNode; back?: boolean; onBack?: () => void; gap?: number; justify?: 'space-evenly' | 'center' | 'flex-start'; padH?: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {back ? <BackButton onPress={onBack} /> : <View style={{ width: 48, height: 48 }} />}
        <ChapterProgress cap={cap} done={done} label={label} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: justify, paddingHorizontal: padH, paddingTop: 8, paddingBottom: 12, gap }}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {onNext || secondary || footerTop ? (
        <View style={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: insets.bottom + 18, gap: 6, backgroundColor: C.paper }}>
          {footerTop}
          {onNext ? <BigButton label={nextLabel} onPress={onNext} disabled={disabled} loading={loading} /> : null}
          {secondary}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** Título centralizado das perguntas (serif, cor da capa). */
export function QTitle({ children, size = 28 }: { children: string; size?: number }) {
  return <T v="serif" accessibilityRole="header" style={{ fontSize: size, lineHeight: size * 1.2, color: C.cover, textAlign: 'center' }}>{children}</T>;
}

export function QSub({ children }: { children: string }) {
  return <T style={{ fontSize: 17, lineHeight: 24, color: C.inkSoft, textAlign: 'center' }}>{children}</T>;
}

/** "PERGUNTA 2 DE 4" */
export function QCount({ children }: { children: string }) {
  return <T v="eyebrow" style={{ fontSize: 14, color: C.inkSoft, textAlign: 'center' }}>{children}</T>;
}

/** Círculo com ícone no topo da pergunta. */
export function IconBadge({ children, size = 88, bg = C.goldPale, border = C.gold }: { children: React.ReactNode; size?: number; bg?: string; border?: string }) {
  return (
    <View style={{ alignSelf: 'center', width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderWidth: 2, borderColor: border, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  );
}

/** Nota "confirme com o veterinário" / "não é documento oficial". */
export function VetNote({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', justifyContent: 'center' }}>
      <Icon name="info" size={18} color={C.inkSoft} />
      <T v="bold" style={{ flexShrink: 1, fontSize: 16, lineHeight: 21, color: C.inkSoft }}>{text}</T>
    </View>
  );
}
