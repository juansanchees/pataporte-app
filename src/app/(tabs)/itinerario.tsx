import { careWords } from '@/domain/catalog';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useActivePet, useApp } from '@/store/app';
import { EmptyState, Page, PageHeader } from '@/components/passport';
import { Chip, IconButton, SectionTitle, T } from '@/components/ui';
import { Icon } from '@/art/Icon';
import { careStatus, timeline } from '@/domain/itinerary';
import { monthTitle } from '@/domain/diary';
import { addDays, diffDays, fmtBR, today, weekdayShort } from '@/domain/dates';
import { CATEGORY_LABEL } from '@/domain/catalog';
import type { Care } from '@/domain/types';
import { C } from '@/theme';
import { art } from '@/domain/words';

/** Janela em que um cuidado já "falta tomar". */
const SOON_DAYS = 7;

function monthsFrom(day: string, n: number): string[] {
  const [y, m] = day.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const mm = ((m - 1 + i) % 12) + 1;
    const yy = y + Math.floor((m - 1 + i) / 12);
    return `${yy}-${String(mm).padStart(2, '0')}`;
  });
}

export default function Vacinas() {
  const pet = useActivePet();
  const cares = useApp((s) => s.data.cares);
  const [view, setView] = useState<'situacao' | 'cronograma'>('situacao');
  const [onlyVac, setOnlyVac] = useState(true);
  const t = today();

  const { falta, tomou, next } = useMemo(() => {
    const falta: Care[] = [];
    const tomou: Care[] = [];
    for (const c of cares) {
      const due = c.active && c.nextDate ? diffDays(t, c.nextDate) : null;
      if (!c.lastDate || (due !== null && due <= SOON_DAYS)) falta.push(c);
      else tomou.push(c);
    }
    falta.sort((a, b) => (a.nextDate ?? '9').localeCompare(b.nextDate ?? '9'));
    tomou.sort((a, b) => (b.lastDate ?? '').localeCompare(a.lastDate ?? ''));
    const next = [...cares].filter((c) => c.active && c.nextDate && c.category === 'vacina').sort((a, b) => a.nextDate!.localeCompare(b.nextDate!))[0];
    return { falta, tomou, next };
  }, [cares, t]);

  const months = useMemo(() => {
    const list = timeline(cares.filter((c) => !onlyVac || c.category === 'vacina'), t, 12);
    const ms = monthsFrom(t, 12);
    const map = new Map<string, { care: Care; day: string }[]>();
    // atrasadas de meses passados aparecem no mês atual
    list.forEach((m) => { const k = m.month < ms[0] ? ms[0] : m.month; map.set(k, [...(map.get(k) ?? []), ...m.items]); });
    return ms.map((m) => ({ month: m, items: map.get(m) ?? [] }));
  }, [cares, onlyVac, t]);

  if (!pet) return null;
  const open = (c: Care) => router.push({ pathname: '/cuidado/[id]', params: { id: c.id } });
  const stamp = (c: Care) => useApp.getState().askStamp(c.id);

  return (
    <Page seed={17}
      header={
        <View>
          <PageHeader title="Vacinas e cuidados" eyebrow={`CARTEIRA ${art(pet).DO} ${pet.name.toUpperCase()}`} back={false} right={<IconButton icon="plus" tone="cover" label="Novo cuidado" onPress={() => router.push('/novo-cuidado')} />} />
          <View style={{ flexDirection: 'row', marginHorizontal: 24, marginBottom: 12, backgroundColor: C.paper2, borderRadius: 12, padding: 4 }}>
            {(['situacao', 'cronograma'] as const).map((v) => (
              <Pressable key={v} accessibilityRole="tab" accessibilityState={{ selected: view === v }} onPress={() => setView(v)}
                style={{ flex: 1, minHeight: 42, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: view === v ? C.cover : 'transparent' }}>
                <T v="bold" style={{ fontSize: 15, color: view === v ? C.goldPale : C.inkSoft }}>{v === 'situacao' ? 'Feito × Falta' : 'Cronograma do ano'}</T>
              </Pressable>
            ))}
          </View>
        </View>
      }>
      {view === 'situacao' ? (
        <View style={{ gap: 14 }}>
          {next ? (
            <Pressable accessibilityRole="button" onPress={() => open(next)} style={{ backgroundColor: C.cover, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(221,189,126,0.18)', alignItems: 'center', justifyContent: 'center' }}><Icon name="drop" size={26} color={C.goldLight} /></View>
              <View style={{ flex: 1 }}>
                <T v="bold" style={{ color: C.goldLight, fontSize: 15 }}>{next.nextDate! < t ? 'VACINA ATRASADA' : 'PRÓXIMA VACINA'}</T>
                <T v="serif" style={{ color: C.goldPale, fontSize: 22, lineHeight: 26 }} numberOfLines={2}>{next.name}</T>
                <T v="bold" style={{ color: C.goldPale, fontSize: 15 }}>{`${fmtBR(next.nextDate!)} · ${whenText(t, next.nextDate!)}`}</T>
              </View>
            </Pressable>
          ) : null}

          <SectionTitle>{`Falta fazer · ${falta.length}`}</SectionTitle>
          {falta.length === 0 ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: C.greenPale, borderRadius: 14, padding: 14 }}>
              <Icon name="check" size={22} color={C.green} sw={3} />
              <T v="bold" style={{ flex: 1, color: C.green, fontSize: 15 }}>{`Nada pendente nos próximos ${SOON_DAYS} dias. ${art(pet).O} ${pet.name} está em dia!`}</T>
            </View>
          ) : falta.map((c) => {
            const st = careStatus(c, t);
            const late = st === 'atrasado';
            const line = !c.nextDate ? 'Sem data' : late ? `Em atraso desde ${fmtBR(c.nextDate)}` : `Até ${fmtBR(c.nextDate)} · ${whenText(t, c.nextDate)}`;
            return (
              <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`${c.name}. ${line}`} onPress={() => open(c)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.sheet, borderWidth: 1, borderColor: late ? C.red : C.line, borderLeftWidth: 5, borderLeftColor: late ? C.red : C.amber, borderRadius: 14, padding: 14 }}>
                <View style={{ flex: 1, gap: 3 }}>
                  <T style={{ fontSize: 14, color: C.inkSoft }}>{CATEGORY_LABEL[c.category]}</T>
                  <T v="xbold" style={{ fontSize: 17 }}>{c.name}</T>
                  <T v="bold" style={{ fontSize: 14.5, color: late ? C.red : C.amber }}>{line}</T>
                  {!c.lastDate ? <T style={{ fontSize: 15, color: C.inkSoft }}>Ainda sem registro</T> : <T style={{ fontSize: 15, color: C.inkSoft }}>{`Última: ${fmtBR(c.lastDate)}`}</T>}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Carimbar ${c.name}`} onPress={() => stamp(c)}
                  style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, borderRadius: 10, backgroundColor: C.coralInk, borderBottomWidth: 4, borderBottomColor: '#7C2A1A', alignItems: 'center', justifyContent: 'center', gap: 2, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
                  <Icon name="stamp" size={16} color="#fff" sw={2.2} />
                  <T v="bold" style={{ color: '#fff', fontSize: 15 }}>{careWords(c.category).done}</T>
                </Pressable>
              </Pressable>
            );
          })}

          <SectionTitle>{`Em dia · ${tomou.length}`}</SectionTitle>
          {tomou.length === 0 ? <T style={{ color: C.inkSoft, fontSize: 14.5 }}>Quando você marcar uma vacina ou cuidado, ele aparece aqui com a data e a próxima vez.</T> : tomou.map((c) => (
            <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`${c.name}, feito em ${fmtBR(c.lastDate!)}`} onPress={() => open(c)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderLeftWidth: 5, borderLeftColor: C.green, borderRadius: 14, padding: 14 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={18} color="#fff" sw={3} /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="xbold" style={{ fontSize: 16.5 }}>{c.name}</T>
                <T v="bold" style={{ fontSize: 14.5, color: C.green }}>{`${c.category === 'exame' || c.category === 'outro' ? 'Feito' : c.category === 'antiparasitario' ? 'Aplicado' : 'Tomou'} em ${fmtBR(c.lastDate!)}`}</T>
                <T style={{ fontSize: 14, color: C.inkSoft }}>{c.nextDate ? `Próxima: ${fmtBR(c.nextDate)} · ${whenText(t, c.nextDate)}` : 'Dose única: concluída'}</T>
              </View>
              <Icon name="chevron" size={18} color={C.inkSoft} />
            </Pressable>
          ))}
          {cares.length === 0 && <EmptyState title="Carteira vazia" text="Adicione as vacinas e remédios do seu pet." action="Adicionar cuidado" onAction={() => router.push('/novo-cuidado')} />}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Só vacinas" on={onlyVac} onPress={() => setOnlyVac(true)} style={{ flex: 1, justifyContent: 'center' }} />
            <Chip label="Todos" on={!onlyVac} onPress={() => setOnlyVac(false)} style={{ flex: 1, justifyContent: 'center' }} />
          </View>
          <T style={{ fontSize: 14.5, color: C.inkSoft }}>{`Os próximos 12 meses ${art(pet).do} ${pet.name}, mês a mês.`}</T>
          {months.map((m) => {
            const empty = m.items.length === 0;
            return (
              <View key={m.month} style={{ backgroundColor: empty ? 'transparent' : C.sheet, borderWidth: 1, borderStyle: empty ? 'dashed' : 'solid', borderColor: C.line, borderRadius: 14, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: empty ? 'transparent' : C.cover }}>
                  <T v="serif" style={{ fontSize: 19, color: empty ? C.inkSoft : C.goldPale }}>{monthTitle(m.month)}</T>
                  <T v="bold" style={{ fontSize: 14, color: empty ? C.inkSoft : C.goldLight }}>{empty ? (onlyVac ? 'Sem vacinas' : 'Nada marcado') : `${m.items.length} ${onlyVac ? (m.items.length === 1 ? 'vacina' : 'vacinas') : (m.items.length === 1 ? 'cuidado' : 'cuidados')}`}</T>
                </View>
                {m.items.map((it, i) => {
                  const late = it.day < t;
                  return (
                    <Pressable key={it.care.id + it.day} accessibilityRole="button" accessibilityLabel={`${it.day.slice(8)} de ${monthTitle(m.month)}: ${it.care.name}`} onPress={() => open(it.care)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 56, borderTopWidth: i ? 1 : 0, borderStyle: 'dashed', borderColor: C.line }}>
                      <View style={{ width: 46, alignItems: 'center' }}>
                        <T v="serif" style={{ fontSize: 24, lineHeight: 26, color: late ? C.red : C.ink }}>{it.day.slice(8)}</T>
                        <T v="mono" style={{ fontSize: 13, color: C.inkSoft }}>{weekdayShort(it.day)}</T>
                      </View>
                      <View style={{ flex: 1 }}>
                        <T v="bold" style={{ fontSize: 16 }}>{it.care.name}</T>
                        {!onlyVac ? <T style={{ fontSize: 14.5, color: C.inkSoft }}>{CATEGORY_LABEL[it.care.category]}</T> : null}
                      </View>
                      {late ? <T v="bold" style={{ color: C.red, fontSize: 15 }}>Atrasada</T> : <Icon name="chevron" size={16} color={C.inkSoft} />}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
          {!months.some((m) => m.items.some((it) => it.day <= addDays(t, 365))) && <T style={{ color: C.inkSoft }}>Nenhuma dose prevista. Carimbe as vacinas para o cronograma se montar sozinho.</T>}
        </View>
      )}
    </Page>
  );
}

function whenText(t: string, day: string): string {
  const n = diffDays(t, day);
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n < 0) return `atrasada há ${-n} ${n === -1 ? 'dia' : 'dias'}`;
  if (n < 60) return `em ${n} dias`;
  const m = Math.round(n / 30);
  return `em ${m} meses`;
}
