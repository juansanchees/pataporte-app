import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useActivePet, useApp } from '@/store/app';
import { Page, PageHeader } from '@/components/passport';
import { Button, ChipRow, Field, FieldLabel, InfoNote, T } from '@/components/ui';
import { WeekdayPicker } from '@/components/v11/lembrete/shared';
import { LembreteIcon, type LembreteIconName } from '@/art/icons-lembrete';
import { reminderTypeLabel } from '@/domain/today';
import { fromDay, parseBR, toDay, today } from '@/domain/dates';
import type { ReminderType } from '@/domain/types';
import { track } from '@/services/analytics';
import { art } from '@/domain/words';
import { C } from '@/theme';

const ICON: Partial<Record<ReminderType, LembreteIconName>> = { passeio: 'walk', banho: 'bath', consulta: 'stethoscope', comida: 'food', outro: 'dots' };
/** passeio/comida repetem (todo dia ou dias da semana); banho/consulta/outro são uma data específica. */
const RECURRING: ReminderType[] = ['passeio', 'comida'];

function nextWeekday(n: number, from: string): string {
  const d = fromDay(from);
  while (d.getDay() !== n) d.setDate(d.getDate() + 1);
  return toDay(d);
}

/** Formulário genérico para passeio, comida, banho, consulta e outro (Lembrete-Novo → passo 2). */
export default function LembreteSimples() {
  const pet = useActivePet();
  const { tipo } = useLocalSearchParams<{ tipo?: string }>();
  const type = (tipo as ReminderType) ?? 'outro';
  const recurring = RECURRING.includes(type);

  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [freqMode, setFreqMode] = useState<'diario' | 'dias'>('diario');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!pet) return <Redirect href="/" />;

  const timeMask = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
  };
  const dateMask = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 8);
    return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
  };

  const save = async () => {
    const t = time.trim() && /^\d{2}:\d{2}$/.test(time) ? time : null;
    if (time.trim() && !t) return setErr('Horário inválido. Use HH:MM.');
    if (recurring) {
      if (freqMode === 'diario') {
        setErr(''); setBusy(true);
        await useApp.getState().addReminder({ type, date: today(), time: t, repeat: 'daily', note: note.trim() || undefined });
      } else {
        if (weekdays.length === 0) return setErr('Escolha pelo menos um dia da semana.');
        setErr(''); setBusy(true);
        for (const n of weekdays) {
          await useApp.getState().addReminder({ type, date: nextWeekday(n, today()), time: t, repeat: 'weekly', note: note.trim() || undefined });
        }
      }
    } else {
      const day = date.trim() ? parseBR(date) : today();
      if (date.trim() && !day) return setErr('Data inválida. Use DD/MM/AAAA.');
      setErr(''); setBusy(true);
      await useApp.getState().addReminder({ type, date: day ?? today(), time: t, repeat: 'once', note: note.trim() || undefined });
    }
    track('lembrete_criado', { tipo: type });
    setBusy(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Page seed={32} header={<PageHeader title={reminderTypeLabel(type)} eyebrow="NOVO LEMBRETE" />} footer={<Button label="Salvar lembrete" icon="bell" onPress={save} loading={busy} />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.aquaPale, alignItems: 'center', justifyContent: 'center' }}>
            <LembreteIcon name={ICON[type] ?? 'dots'} size={22} color={C.aquaInk} />
          </View>
          <T v="serif" style={{ fontSize: 22, flex: 1 }}>{`${reminderTypeLabel(type)} ${art(pet).do} ${pet.name}`}</T>
        </View>

        {recurring ? (
          <>
            <View style={{ marginBottom: 16 }}>
              <FieldLabel pt="Quando?" />
              <ChipRow options={['Todo dia', 'Dias da semana']} value={freqMode === 'diario' ? 'Todo dia' : 'Dias da semana'} onChange={(v) => setFreqMode(v === 'Todo dia' ? 'diario' : 'dias')} />
            </View>
            {freqMode === 'dias' ? <View style={{ marginBottom: 18 }}><WeekdayPicker value={weekdays} onChange={setWeekdays} /></View> : null}
          </>
        ) : (
          <Field pt="Data" value={date} onChangeText={(v) => setDate(dateMask(v))} placeholder={`${today().split('-').reverse().join('/')}`} keyboardType="number-pad" />
        )}
        <Field pt="Horário (opcional)" value={time} onChangeText={(v) => setTime(timeMask(v))} placeholder="HH:MM" keyboardType="number-pad" />
        <Field pt="Observação (opcional)" value={note} onChangeText={setNote} placeholder="Ex.: no parque da esquina" autoCapitalize="sentences" />

        {err ? <InfoNote tone="red" text={err} /> : null}
      </Page>
    </KeyboardAvoidingView>
  );
}
