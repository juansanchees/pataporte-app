import { useApp } from '@/store/app';
import React, { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg from 'react-native-svg';
import { C, F, STATUS_UI } from '@/theme';
import { Icon } from '@/art/Icon';
import { GuillocheG, PageDecor, RosetteG } from '@/art/patterns';
import { Avatar, PassportPhoto } from '@/art/Avatar';
import { EmptyStamp, StatusStamp } from '@/art/Stamp';
import { EYE_HEX } from '@/domain/catalog';
import { accessoriesFor } from '@/domain/commerce';
import { relative, fmtBR } from '@/domain/dates';
import type { Care, CareStatus, Mood, Pet } from '@/domain/types';
import type { Checkin } from '@/domain/gamification';
import { Button, T } from './ui';
import { resolvePhotoUri } from '@/services/photos';


// ------------------------------------------------------------------ page shell
export function Page({ children, seed = 1, band = true, watermark = true, scroll = true, footer, header, bg = C.paper, tone, contentStyle }: {
  children: React.ReactNode; seed?: number; band?: boolean; watermark?: boolean; scroll?: boolean; footer?: React.ReactNode; header?: React.ReactNode; bg?: string; tone?: string; contentStyle?: StyleProp<ViewStyle>;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <PageDecor w={width} h={height} seed={seed} band={band} watermark={watermark} tone={tone} />
      <View style={{ paddingTop: insets.top }}>{header}</View>
      {scroll ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[{ paddingHorizontal: 24, paddingBottom: 28 }, contentStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingHorizontal: 24 }, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 14 + insets.bottom, gap: 6, backgroundColor: bg }}>{footer}</View> : null}
    </View>
  );
}

export function PageHeader({ title, eyebrow, page, back = true, right, onBack, color }: {
  title: string; eyebrow?: string; page?: string; back?: boolean; right?: React.ReactNode; onBack?: () => void; color?: string;
}) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 6 }}>
        {back && (
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace(useApp.getState().pets.length ? '/inicio' : '/')))}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.paper2, borderWidth: 1.5, borderColor: C.inkFaint, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="back" size={20} sw={2.4} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          {eyebrow ? <T v="eyebrow" style={color ? { color } : undefined}>{eyebrow}</T> : null}
          <T v="serif" style={{ fontSize: 24, lineHeight: 28, color: color ?? C.ink }} accessibilityRole="header">{title}</T>
        </View>
        {right ?? (page ? <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: F.monoBold, fontSize: 10, letterSpacing: 0.8, color: C.inkSoft, borderWidth: 1, borderColor: C.inkFaint, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 5 }}>PÁG. {page}</Text> : null)}
      </View>
      <Microline />
    </View>
  );
}

export function Microline({ style }: { style?: StyleProp<ViewStyle> }) {
  // linha fina (antes tinha um texto minúsculo decorativo; tirado para deixar a tela limpa)
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ height: 1, backgroundColor: C.line, marginHorizontal: 24, marginTop: 6, marginBottom: 12 }, style]} />;
}

// ------------------------------------------------------------------ pet avatar
export function PetAvatar({ pet, mood = 'feliz', size, acc }: { pet: Pick<Pet, 'species' | 'coat' | 'details' | 'equipped'>; mood?: Mood; size: number; acc?: string[] }) {
  return (
    <Avatar
      species={pet.species}
      coat={pet.coat}
      mood={mood}
      size={size}
      patch={pet.details.manchas !== 'Sem manchas'}
      patchColor={pet.details.manchas === 'Escura' ? '#3A2C24' : '#FFFFFF'}
      eye={EYE_HEX[pet.details.olhos] ?? '#2A2622'}
      ears={pet.details.orelhas}
      acc={acc ?? accessoriesFor(pet.equipped)}
    />
  );
}

export function MoodTag({ mood }: { mood: Mood }) {
  const m = { feliz: [C.green, 'Feliz'], neutro: [C.amber, 'Neutro'], triste: [C.red, 'Tristinho'] }[mood];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: m[0] }} />
      <T v="bold" style={{ fontSize: 15.5 }}>{m[1]}</T>
    </View>
  );
}

// ------------------------------------------------------------------ miles / visa
export function MilesBar({ cur, total, label, dark }: { cur: number; total: number; label: string; dark?: boolean }) {
  const pct = Math.max(0, Math.min(100, Math.round((cur / Math.max(total, 1)) * 100)));
  const fill = dark ? C.gold : C.cover;
  return (
    <View style={{ gap: 6 }} accessibilityLabel={label}>
      <View style={{ height: 20, justifyContent: 'center' }}>
        <View style={{ position: 'absolute', left: 0, right: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: dark ? 'rgba(221,189,126,0.35)' : C.paper3 }} />
        <View style={{ position: 'absolute', left: 0, width: `${pct}%`, height: 4, borderRadius: 3, backgroundColor: fill }} />
        <View style={{ position: 'absolute', left: `${pct}%`, marginLeft: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: fill, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plane" size={12} color={dark ? C.coverDeep : C.goldPale} sw={2.2} />
        </View>
      </View>
      <T v="bold" style={{ fontSize: 15, color: dark ? C.goldLight : C.inkSoft }}>{label}</T>
    </View>
  );
}

export function VisaSticker({ level, name, miles }: { level: number; name: string; miles: number }) {
  const [w, setW] = useState(340);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ borderRadius: 12, overflow: 'hidden', backgroundColor: C.purplePale, borderWidth: 1, borderColor: '#CDBFDD' }}>
      <Svg width={w} height={110} style={{ position: 'absolute' }} pointerEvents="none">
        <GuillocheG w={w} y0={0} band={110} n={16} seed={level + 20} color={C.purple} opacity={0.22} sw={0.55} />
        <RosetteG cx={w - 54} cy={55} size={44} color={C.purple} opacity={0.22} />
      </Svg>
      <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 20, flexDirection: 'row' }}>
        {['#E9C7D6', '#C8E3E6', '#E8E0B8', '#D5CBEA'].map((c) => <View key={c} style={{ flex: 1, backgroundColor: c, opacity: 0.8 }} />)}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, paddingRight: 34 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: C.purple, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)' }}>
          <T v="serif" style={{ fontSize: 28, color: C.purpleInk }}>{level}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T v="monoBold" style={{ fontSize: 11, letterSpacing: 1.2, color: C.purpleInk }}>NÍVEL DE VIAJANTE</T>
          <T v="serif" style={{ fontSize: 22, color: '#2F1E4D' }}>{name}</T>
          <T v="bold" style={{ fontSize: 13, color: C.purpleInk }}>{miles} milhas acumuladas</T>
        </View>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ boarding pass
const CAT_UI: Record<Care['category'], { label: string; color: string }> = {
  vacina: { label: 'VACINA', color: C.blue },
  vermifugo: { label: 'VERMÍFUGO', color: C.green },
  antiparasitario: { label: 'ANTIPULGAS', color: C.purple },
  remedio: { label: 'REMÉDIO', color: C.coralInk },
  exame: { label: 'EXAME', color: C.amber },
  outro: { label: 'LEMBRETE', color: C.inkSoft },
};

export function BoardingPass({ care, status, today, onStamp, onPress }: {
  care: Care; petCode?: string; status: CareStatus; today: string; onStamp?: () => void; onPress?: () => void;
}) {
  const bar = STATUS_UI[status].color;
  const due = care.nextDate;
  const cat = CAT_UI[care.category];
  const when = status === 'carimbado' ? 'Feito' : due ? relative(today, due).toLowerCase().replace(/^./, (c) => c.toUpperCase()) : '';
  return (
    <Pressable onPress={onPress} accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${care.name}, ${STATUS_UI[status].label.toLowerCase()}${due ? `, próxima dose ${fmtBR(due)}` : ''}`}
      style={{ flexDirection: 'row', backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 7, shadowOffset: { width: 0, height: 5 } }}>
      <View style={{ position: 'absolute', left: 0, top: 14, bottom: 14, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4, backgroundColor: bar }} />
      <View style={{ flex: 1, paddingVertical: 14, paddingLeft: 16, paddingRight: 12, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ borderWidth: 1.5, borderColor: cat.color, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: F.monoBold, fontSize: 10.5, letterSpacing: 0.8, color: cat.color }}>{cat.label}</Text>
          </View>
          <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: F.monoBold, fontSize: 11, color: bar }}>{STATUS_UI[status].label}</Text>
        </View>
        <T v="serif" style={{ fontSize: 20, lineHeight: 24 }} numberOfLines={2}>{care.name}</T>
        {status === 'carimbado' ? (
          <T style={{ fontSize: 14, color: C.inkSoft }}>{care.lastDate ? `Tomou em ${fmtBR(care.lastDate)}` : 'Concluído'}</T>
        ) : due ? (
          <View style={{ gap: 2 }}>
            <T v="bold" style={{ fontSize: 14.5 }}>{`Próxima: ${fmtBR(due)} · ${when}`}</T>
            <T style={{ fontSize: 13.5, color: C.inkSoft }}>{care.lastDate ? `Última: ${fmtBR(care.lastDate)}` : 'Ainda sem carimbo'}</T>
          </View>
        ) : null}
      </View>
      <View style={{ width: 104, borderLeftWidth: 2, borderStyle: 'dashed', borderLeftColor: C.line, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 }}>
        {onStamp && status !== 'carimbado' ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Carimbar ${care.name}`} onPress={onStamp}
            style={({ pressed }) => ({ minHeight: 48, width: 88, borderRadius: 10, backgroundColor: C.coralInk, borderBottomWidth: 4, borderBottomColor: '#7C2A1A', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
            <Icon name="stamp" size={15} color="#fff" sw={2.2} />
            <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: F.monoBold, fontSize: 11, color: '#fff', letterSpacing: 0.6 }}>CARIMBAR</Text>
          </Pressable>
        ) : (
          <StatusStamp status={status} width={84} rotation={-8} seed={care.code.charCodeAt(0) + 3} />
        )}
        <T v="monoBold" style={{ fontSize: 11, color: C.aquaInk }}>+{care.miles} milhas</T>
      </View>
      <View style={{ position: 'absolute', right: 95, top: -10, width: 18, height: 18, borderRadius: 9, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line }} />
      <View style={{ position: 'absolute', right: 95, bottom: -10, width: 18, height: 18, borderRadius: 9, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line }} />
    </Pressable>
  );
}

// ------------------------------------------------------------------ check-in
export function CheckinItem({ item, onPress }: { item: Checkin; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ checked: item.done }} onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, minHeight: 54, opacity: pressed ? 0.85 : 1 })}>
      {item.done ? (
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.cover, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={16} color={C.goldPale} sw={3} /></View>
      ) : (
        <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderStyle: 'dashed', borderColor: C.inkSoft }} />
      )}
      <T v="bold" style={{ flex: 1, fontSize: 14, color: item.done ? C.inkSoft : C.ink, textDecorationLine: item.done ? 'line-through' : 'none' }}>{item.label}</T>
      <View style={{ backgroundColor: C.aquaPale, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }}><T v="monoBold" style={{ fontSize: 12, color: C.aquaInk }}>+{item.miles}</T></View>
    </Pressable>
  );
}

// ------------------------------------------------------------------ MRZ
export function MRZ({ lines, size = 9.6 }: { lines: [string, string]; size?: number }) {
  return (
    <View accessibilityLabel="Zona de leitura mecânica">
      {lines.map((l, i) => <Text key={i} numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.mono, fontSize: size, color: C.ink, letterSpacing: 0.2 }}>{l}</Text>)}
    </View>
  );
}

// ------------------------------------------------------------------ requerimento progress
export function StampSlots({ total, current }: { total: number; current: number }) {
  return (
    <View accessibilityLabel={`Etapa ${current + 1} de ${total}`} style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 24, paddingBottom: 14 }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i < current ? C.coralInk : i === current ? C.cover : C.paper3 }} />
      ))}
    </View>
  );
}

// ------------------------------------------------------------------ char boxes (nome)
export function CharBoxes({ value, onChange, n = 9, label }: { value: string; onChange: (v: string) => void; n?: number; label: string }) {
  const ref = useRef<TextInput>(null);
  const chars = value.toUpperCase().slice(0, n).split('');
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel={label}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: n }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 44, borderWidth: 1.5, borderColor: i === chars.length ? C.cover : C.inkFaint, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' }}>
            <T v="monoBold" style={{ fontSize: 18 }}>{chars[i] ?? ''}</T>
          </View>
        ))}
      </View>
      <TextInput maxFontSizeMultiplier={1.15} ref={ref} value={value} onChangeText={(t) => onChange(t.replace(/[^\p{L}\s'-]/gu, '').slice(0, n))} maxLength={n}
        autoCapitalize="words" accessibilityLabel={label} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.02, color: 'transparent' }} />
    </Pressable>
  );
}

// ------------------------------------------------------------------ empty state
export function EmptyState({ title, text, action, onAction }: { title: string; text: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 24, alignItems: 'center', gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}><EmptyStamp size={64} rotation={-6} /><EmptyStamp size={64} rotation={8} /></View>
      <T v="serif" style={{ fontSize: 22, textAlign: 'center' }}>{title}</T>
      <T style={{ fontSize: 13.5, color: C.inkSoft, textAlign: 'center' }}>{text}</T>
      {action && onAction ? <Button label={action} onPress={onAction} small style={{ alignSelf: 'center' }} /> : null}
    </View>
  );
}

// ------------------------------------------------------------------ passport photo of a pet
export function PetPhoto({ pet, mood = 'feliz', w, h, holo = true, corners = true, photo = false }: { pet: Pick<Pet, 'species' | 'coat' | 'details' | 'equipped'> & { photoUri?: string }; mood?: Mood; w: number; h: number; holo?: boolean; corners?: boolean; photo?: boolean }) {
  if (photo && pet.photoUri) {
    return (
      <View style={{ width: w, height: h, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: C.line, backgroundColor: C.photo }}>
        <Image source={{ uri: resolvePhotoUri(pet.photoUri) }} style={{ width: w, height: h }} resizeMode="cover" accessibilityLabel="Foto do pet" />
      </View>
    );
  }
  return (
    <PassportPhoto w={w} h={h} holo={holo} corners={corners}>
      <PetAvatar pet={pet} mood={mood} size={Math.round(w * 1.08)} />
    </PassportPhoto>
  );
}
