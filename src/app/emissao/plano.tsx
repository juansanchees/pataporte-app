import React from 'react';
import { View } from 'react-native';
import { useApp } from '@/store/app';
import { T } from '@/components/ui';
import { Icon } from '@/art/Icon';
import { CadIcon } from '@/art/icons-cadastro';
import { ChapterFrame, QTitle, VetNote } from '@/components/v11/cadastro/Frame';
import { finishChapter, isRealDose, notePrimeira, petRef } from '@/components/v11/cadastro/flow';
import { TIER_COLORS } from '@/components/v11/cadastro/vaccineUi';
import { TIER_TAG, type PlanStep } from '@/domain/vaccines';
import { C } from '@/theme';

function Counter({ value, label, bg, fg }: { value: string; label: string; bg: string; fg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', gap: 2 }}>
      <T v="serif" style={{ fontSize: value.length > 3 ? 21 : 27, lineHeight: 30, color: fg }} numberOfLines={1}>{value}</T>
      <T v="xbold" style={{ fontSize: 16, color: fg }} numberOfLines={1}>{label}</T>
    </View>
  );
}

function Dot({ children, kind }: { children: React.ReactNode; kind: 'ok' | 'step' | 'opt' | 'deworm' }) {
  const s = kind === 'ok' ? { bg: C.green, bc: C.green, dash: false } : kind === 'step' ? { bg: C.goldPale, bc: C.gold, dash: false } : kind === 'opt' ? { bg: '#FFFFFF', bc: C.purple, dash: true } : { bg: C.amberPale, bc: C.amber, dash: true };
  return (
    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: s.bg, borderWidth: kind === 'ok' ? 0 : 2.5, borderColor: s.bc, borderStyle: s.dash ? 'dashed' : 'solid', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
      {children}
    </View>
  );
}

function Row({ dot, title, sub, tag, box }: { dot: React.ReactNode; title: string; sub: string; tag?: { text: string; bg: string; fg: string }; box: { bg: string; bc?: string; dash?: boolean; subColor?: string } }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }} accessible accessibilityLabel={`${title}. ${sub}${tag ? `. ${tag.text}` : ''}`}>
      {dot}
      <View style={{ flex: 1, backgroundColor: box.bg, borderRadius: 14, borderWidth: box.bc ? 1.5 : 0, borderColor: box.bc, borderStyle: box.dash ? 'dashed' : 'solid', paddingHorizontal: 12, paddingVertical: 10, gap: 2 }}>
        <T v="xbold" style={{ fontSize: 17, lineHeight: 22 }}>{title}</T>
        <T v="bold" style={{ fontSize: 16, lineHeight: 20, color: box.subColor ?? C.inkSoft }}>{sub}</T>
        {tag ? (
          <View style={{ alignSelf: 'flex-start', marginTop: 4, backgroundColor: tag.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <T v="eyebrow" style={{ fontSize: 12, color: tag.fg, fontWeight: '700' }}>{tag.text}</T>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Capítulo 3 · fim: "O plano do Thor" (Vac-Plano) ou do filhote (Filhote-Plano) + "Colocar tudo na agenda". */
export default function Plano() {
  const d = useApp((s) => s.draft);
  const plan = useApp.getState().vaccinePlanNow();
  const ref = petRef(d);

  const confirm = () => {
    // as datas do plano viram agenda na emissão (emitPassport usa draft.vaccineAnswers com a série completa)
    const ans = useApp.getState().draft.vaccineAnswers ?? {};
    if (Object.values(ans).some((a) => isRealDose(a))) notePrimeira();
    finishChapter(3);
  };

  if (!plan) return null;
  const stepTag = (s: PlanStep) => (plan.puppy && s.doses.some((x) => x.vaccineId === 'ARB')
    ? { text: 'ANTIRRÁBICA', bg: C.purplePale, fg: C.purpleInk }
    : { text: TIER_TAG[s.tier], ...TIER_COLORS[s.tier] });
  const okItems = plan.items.filter((it) => it.status === 'em_dia');
  const optItems = plan.items.filter((it) => it.status === 'opcional' && !it.doses.length);

  return (
    <ChapterFrame cap={3} onNext={confirm} nextLabel="Colocar tudo na agenda">
      <View style={{ alignItems: 'center', gap: 6 }}>
        <QTitle>{`O plano ${ref.do}`}</QTitle>
        <T v="bold" style={{ fontSize: 17, lineHeight: 23, color: C.inkSoft, textAlign: 'center' }}>{plan.puppy ? 'Filhote precisa de mais doses no começo.' : 'Com base nas suas respostas, montamos o que falta.'}</T>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {plan.puppy && plan.chips.length ? plan.chips.slice(0, 3).map((c, k) => (
          <Counter key={c.label} value={c.value} label={c.label} {...[{ bg: C.aquaPale, fg: C.cover }, { bg: C.purplePale, fg: C.purpleInk }, { bg: C.amberPale, fg: C.goldDark }][k]} />
        )) : (
          <>
            <Counter value={String(plan.counts.emDia)} label="em dia" bg={C.greenPale} fg="#2E6B41" />
            <Counter value={String(plan.counts.faltando)} label="faltando" bg={C.amberPale} fg={C.goldDark} />
            <Counter value={String(plan.counts.opcional)} label="opcional" bg={C.purplePale} fg={C.purpleInk} />
          </>
        )}
      </View>

      <View style={{ gap: 10 }}>
        <View style={{ position: 'absolute', left: 19, top: 20, bottom: 20, width: 2, backgroundColor: C.line }} />
        {okItems.map((it) => (
          <Row key={it.vaccine.id} dot={<Dot kind="ok"><Icon name="check" size={20} color="#FFFFFF" sw={3} /></Dot>} title={it.vaccine.short} sub={it.line} box={{ bg: C.greenPale, subColor: '#2E6B41' }} />
        ))}
        {plan.steps.map((s) => (
          <Row key={s.n} dot={<Dot kind="step"><T style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 16, color: C.goldDark }}>{s.n}</T></Dot>}
            title={s.dateLabel} sub={s.title} tag={stepTag(s)} box={{ bg: C.sheet, bc: C.line }} />
        ))}
        {plan.puppyDeworm ? (
          <Row dot={<Dot kind="deworm"><CadIcon name="pill" size={18} color={C.amber} /></Dot>} title={plan.puppyDeworm.label} sub="Vermífugo" box={{ bg: C.sheet, bc: C.line, dash: true }} />
        ) : null}
        {optItems.map((it) => (
          <Row key={it.vaccine.id} dot={<Dot kind="opt"><T style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 16, color: C.purple }}>?</T></Dot>}
            title={it.vaccine.short} sub="Opcional · pergunte ao veterinário" box={{ bg: C.purplePale, bc: C.purple, dash: true, subColor: C.purpleInk }} />
        ))}
      </View>

      <VetNote text={plan.vetNote} />
    </ChapterFrame>
  );
}
