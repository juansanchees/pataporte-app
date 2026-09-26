import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/store/app';
import { T } from '@/components/ui';
import { Icon } from '@/art/Icon';
import { CadIcon, type CadIconName } from '@/art/icons-cadastro';
import { ChapterFrame, IconBadge, QTitle, TextLink, VetNote } from '@/components/v11/cadastro/Frame';
import { LastAnswerPicker } from '@/components/v11/cadastro/LastAnswerPicker';
import { useCadastro } from '@/components/v11/cadastro/session';
import { draftPet, noteVaccine } from '@/components/v11/cadastro/flow';
import { nextDoseFromAnswer, tierLabel, TIER_TAG, vaccineQuestion, vaccinesFor, type NextDose, type VaccineInfo } from '@/domain/vaccines';
import { today } from '@/domain/dates';
import type { LastAnswer } from '@/domain/types';
import { C } from '@/theme';
import { TIER_COLORS, TierTag } from '@/components/v11/cadastro/vaccineUi';

/** "Próxima dose: …" que aparece dentro da opção escolhida. */
function NextPill({ n }: { n: NextDose }) {
  const tone = n.status === 'opcional' ? { bg: C.purplePale, fg: C.purpleInk } : n.status === 'em_dia' ? { bg: C.greenPale, fg: '#2E6B41' } : { bg: C.amberPale, fg: C.goldDark };
  const text = n.status === 'opcional' && !n.date ? 'Opcional: pergunte ao veterinário' : n.overdue ? `Venceu. Sugestão: ${n.label}` : `Próxima dose: ${n.label}`;
  return (
    <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: tone.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
      <Icon name="calendar" size={18} color={tone.fg} />
      <T v="xbold" style={{ fontSize: 16, lineHeight: 20, color: tone.fg, flexShrink: 1, textAlign: 'center' }}>{text}</T>
    </View>
  );
}

const LINE_ICONS: { icon: CadIconName; bg: string }[] = [
  { icon: 'virus', bg: C.aquaPale },
  { icon: 'warn', bg: C.amberPale },
  { icon: 'repeat', bg: C.purplePale },
];

/** Folha "Ver as outras vacinas". */
function OthersSheet({ list, open, onClose }: { list: VaccineInfo[]; open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Fechar" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(11,35,40,0.45)' }} />
      <View style={{ backgroundColor: C.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 18, paddingBottom: insets.bottom + 20, maxHeight: '80%' }}>
        <T v="serif" accessibilityRole="header" style={{ fontSize: 26, color: C.cover, textAlign: 'center', marginBottom: 12 }}>As vacinas do capítulo</T>
        <ScrollView contentContainerStyle={{ gap: 10 }}>
          {list.map((v) => (
            <View key={v.id} style={{ backgroundColor: C.sheet, borderWidth: 1.5, borderColor: C.line, borderRadius: 16, padding: 14, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                <T v="xbold" style={{ fontSize: 19 }}>{v.short}</T>
                <View style={{ backgroundColor: TIER_COLORS[v.tier].bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <T v="eyebrow" style={{ fontSize: 12, color: TIER_COLORS[v.tier].fg }}>{TIER_TAG[v.tier]}</T>
                </View>
              </View>
              <T style={{ fontSize: 16, color: C.inkSoft }}>{v.protects}</T>
            </View>
          ))}
        </ScrollView>
        <View style={{ marginTop: 12 }}><TextLink label="Fechar" onPress={onClose} color={C.cover} /></View>
      </View>
    </Modal>
  );
}

/** Capítulo 3 · Vacinas: tela educativa (Vac-Explica / Gato-Vacina) e a pergunta (Cap-Vacina / Cap-Vacina-Mes). */
export default function Vacina() {
  const { i: ip, fase } = useLocalSearchParams<{ i?: string; fase?: string }>();
  const d = useApp((s) => s.draft);
  const list = vaccinesFor(d.species);
  const i = Math.min(list.length - 1, Math.max(0, Number(ip) || 0));
  const v = list[i];
  const pet = draftPet(d);
  const fromCard = useCadastro((s) => !!s.fromCard[v.id]);
  const [others, setOthers] = useState(false);
  const saved = d.vaccineAnswers?.[v.id];
  const [ans, setAns] = useState<LastAnswer | null>(saved ?? null);

  const goNext = () => {
    const nv = list[i + 1];
    if (!nv) { router.push('/emissao/plano'); return; }
    const pre = !!useApp.getState().draft.vaccineAnswers?.[nv.id];
    router.push({ pathname: '/emissao/vacina', params: { i: String(i + 1), fase: pre ? 'pergunta' : 'explica' } });
  };

  // ---------------------------------------------------------------- explica
  if (fase !== 'pergunta') {
    return (
      <ChapterFrame cap={3} onNext={() => router.push({ pathname: '/emissao/vacina', params: { i: String(i), fase: 'pergunta' } })} nextLabel="Entendi, vamos lá"
        secondary={<TextLink label="Ver as outras vacinas" onPress={() => setOthers(true)} />}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <T v="eyebrow" style={{ fontSize: 14 }}>{`VACINA ${i + 1} DE ${list.length}`}</T>
          <IconBadge><CadIcon name="syringe" size={40} color={C.goldDark} /></IconBadge>
          <TierTag tier={v.tier} text={tierLabel(v.tier, d.species)} />
          <T v="serif" accessibilityRole="header" style={{ fontSize: v.short.length > 8 ? 40 : 48, lineHeight: v.short.length > 8 ? 46 : 52, color: C.cover, textAlign: 'center' }}>{v.short}</T>
          <T v="xbold" style={{ fontSize: 19, lineHeight: 25, textAlign: 'center' }}>{v.edu.subtitle}</T>
        </View>
        <View style={{ backgroundColor: C.sheet, borderRadius: 20, padding: 16, gap: 12 }}>
          {v.edu.lines.map((line, k) => (
            <View key={k} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: LINE_ICONS[k].bg, alignItems: 'center', justifyContent: 'center' }}>
                <CadIcon name={LINE_ICONS[k].icon} size={20} color={C.ink} />
              </View>
              <T v="bold" style={{ flex: 1, fontSize: 17, lineHeight: 23 }}>{line}</T>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: C.goldPale, borderRadius: 16, padding: 14 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.goldLight, alignItems: 'center', justifyContent: 'center' }}><CadIcon name="bulb" size={16} color={C.coverDeep} /></View>
          <T v="bold" style={{ flex: 1, fontSize: 16, lineHeight: 22, color: C.goldDark }}>{`Você sabia? ${v.edu.didYouKnow}`}</T>
        </View>
        <OthersSheet list={list} open={others} onClose={() => setOthers(false)} />
      </ChapterFrame>
    );
  }

  // ---------------------------------------------------------------- pergunta
  const save = () => {
    if (!ans) return;
    useApp.getState().setDraftVaccine(v.id, ans);
    noteVaccine(v.id, ans);
    goNext();
  };

  return (
    <ChapterFrame cap={3} onNext={save} disabled={!ans} gap={14}>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <T v="eyebrow" style={{ fontSize: 14 }}>{`VACINA ${i + 1} DE ${list.length}`}</T>
        {fromCard ? (
          <View style={{ backgroundColor: C.aquaPale, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
            <T v="eyebrow" style={{ fontSize: 12, color: C.aquaInk }}>LIDO DA CARTEIRINHA · CONFIRA</T>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBadge size={56}><CadIcon name="syringe" size={26} color={C.goldDark} /></IconBadge>
          <T v="serif" style={{ fontSize: 28, lineHeight: 32, color: C.cover, flexShrink: 1 }}>{v.short}{v.aka ? <T v="serif" style={{ fontSize: 20, color: C.inkSoft }}>{` ${v.aka}`}</T> : null}</T>
        </View>
        <T v="bold" style={{ fontSize: 16, lineHeight: 21, color: C.inkSoft, textAlign: 'center' }}>{v.protects}</T>
      </View>
      <QTitle size={26}>{vaccineQuestion(pet, v)}</QTitle>
      <LastAnswerPicker key={v.id} scope="ano" value={saved} onChange={setAns}
        preview={(a) => <NextPill n={nextDoseFromAnswer(a, v, pet, today())} />} />
      <VetNote text="Não é documento oficial. Confirme as datas com o veterinário." />
    </ChapterFrame>
  );
}
