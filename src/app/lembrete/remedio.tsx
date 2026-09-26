import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useActivePet, useApp } from '@/store/app';
import { Page, PageHeader } from '@/components/passport';
import { Button, ChipRow, Field, FieldLabel, InfoNote, MilesChip, T } from '@/components/ui';
import { DAYS_OPTIONS, FREQUENCY_OPTIONS, doseTimes, hasNightDose, suggestShift, summary as medSummary } from '@/domain/meds';
import { addDays, atTime, today } from '@/domain/dates';
import { art } from '@/domain/words';
import { Icon } from '@/art/Icon';
import { PAID_PLANS } from '@/domain/commerce';
import { track } from '@/services/analytics';
import { C, F } from '@/theme';

const FREQ_LABELS = [...FREQUENCY_OPTIONS.map((f) => f.label), 'Outro'];
const DAY_LABELS = (n: (typeof DAYS_OPTIONS)[number]) => (n === 'continuo' ? 'Uso contínuo' : `${n} dias`);

/** Lembrete-Remedio + Remedio-Madrugada: cadastro de um remédio com horários calculados. */
export default function LembreteRemedio() {
  const pet = useActivePet();
  const limits = useApp((s) => s.limits());
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [freq, setFreq] = useState(FREQ_LABELS[0]);
  const [firstDose, setFirstDose] = useState('08:00');
  const [customTimes, setCustomTimes] = useState<string[]>(['08:00', '20:00']);
  const [days, setDays] = useState<(typeof DAYS_OPTIONS)[number]>(7);
  const [nightChoice, setNightChoice] = useState<'ask' | 'shift' | 'keep'>('ask');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [openedAt] = useState(() => Date.now());
  if (!pet) return <Redirect href="/" />;

  const isOutro = freq === 'Outro';
  const option = FREQUENCY_OPTIONS.find((f) => f.label === freq);
  const rawTimes = isOutro ? [...customTimes].filter((t) => /^\d{2}:\d{2}$/.test(t)).sort() : doseTimes(option?.everyHours ?? 24, firstDose);
  const night = hasNightDose(rawTimes);
  const shifted = night ? suggestShift(rawTimes) : null;
  const times = night && nightChoice === 'shift' && shifted ? shifted : rawTimes;
  // 1ª dose que já passou hoje (mais de 15 min) começa amanhã: não nasce um lembrete já "atrasado"
  const firstAt = times[0] ? atTime(today(), times[0]) : null;
  const startsTomorrow = !!firstAt && firstAt.getTime() < openedAt - 15 * 60_000;
  const startDate = startsTomorrow ? addDays(today(), 1) : today();
  const a = art(pet);
  const preview = { name, everyHours: isOutro ? undefined : option?.everyHours, times: isOutro ? times : undefined, firstDose: times[0], days, startDate, dose };
  const summaryLine = name.trim() ? medSummary(preview) : '';

  const save = async () => {
    if (name.trim().length < 2) return setErr('Dê um nome ao remédio (ex.: Antibiótico).');
    if (night && nightChoice === 'ask') return setErr('Escolha uma opção para a dose de madrugada.');
    setErr('');
    setBusy(true);
    await useApp.getState().addReminder({
      type: 'remedio', title: name.trim(),
      med: { name: name.trim(), ...(isOutro ? { times } : { everyHours: option!.everyHours }), firstDose: times[0], days, startDate, ...(dose.trim() ? { dose: dose.trim() } : {}) },
    });
    track('lembrete_criado', { tipo: 'remedio' });
    setBusy(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Page seed={31} header={<PageHeader title={`Remédio ${a.do} ${pet.name}`} eyebrow="NOVO LEMBRETE" />}
        footer={<Button label="Salvar lembrete" icon="check" onPress={save} loading={busy} />}>
        <Field pt="Nome do remédio" value={name} onChangeText={setName} placeholder="Ex.: Antibiótico" autoCapitalize="sentences" />
        <Field pt="Dose (opcional)" value={dose} onChangeText={setDose} placeholder="Ex.: 1 comprimido, 5 gotas" />

        <View style={{ marginBottom: 4 }}><FieldLabel pt="De quanto em quanto tempo?" /><ChipRow options={FREQ_LABELS} value={freq} onChange={(v) => { setFreq(v); setNightChoice('ask'); }} /></View>

        {isOutro ? (
          <View style={{ marginBottom: 18, gap: 8 }}>
            <FieldLabel pt="Horários" />
            {customTimes.map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TimeInput value={t} onChange={(v) => setCustomTimes(customTimes.map((x, j) => (j === i ? v : x)))} />
                {customTimes.length > 1 && <Button small variant="ghost" label="Remover" onPress={() => setCustomTimes(customTimes.filter((_, j) => j !== i))} />}
              </View>
            ))}
            <Button small variant="secondary" icon="plus" label="Adicionar horário" onPress={() => setCustomTimes([...customTimes, '12:00'])} style={{ alignSelf: 'flex-start' }} />
          </View>
        ) : (
          <View style={{ marginBottom: 18, gap: 10 }}>
            <FieldLabel pt="Primeira dose" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TimeInput value={firstDose} onChange={setFirstDose} />
              <T v="bold" style={{ color: C.inkSoft, fontSize: 16 }}>{startsTomorrow ? 'amanhã' : 'hoje'}</T>
            </View>
            <View style={{ backgroundColor: C.greenPale, borderRadius: 14, padding: 12, gap: 8 }}>
              <T v="label" style={{ color: '#2E6B41' }}>Horários</T>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {times.map((t) => {
                  const moon = hasNightDose([t]);
                  return (
                    <View key={t} style={{ flex: 1, minHeight: 44, borderRadius: 10, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      accessible accessibilityLabel={moon ? `${t}, de madrugada` : t}>
                      {moon ? <Icon name="moon" size={16} color="#2E6B41" /> : null}
                      <T v="monoBold" style={{ fontSize: 17, color: '#2E6B41' }}>{t}</T>
                    </View>
                  );
                })}
              </View>
              <T style={{ fontSize: 16, color: C.inkSoft }}>Vamos avisar no celular em cada horário.</T>
            </View>
          </View>
        )}

        {night ? (
          <View style={{ marginBottom: 18, backgroundColor: C.amberPale, borderRadius: 14, padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="moon" size={20} color={C.goldDark} />
              <T v="xbold" style={{ fontSize: 17, color: C.goldDark }}>Uma dose cai de madrugada</T>
            </View>
            {shifted ? (
              <>
                <T v="bold" style={{ fontSize: 16, color: C.ink }}>{`Quer mudar para ${shifted.join(' · ')}?`}</T>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button small label="Sim, mudar" icon={nightChoice === 'shift' ? 'check' : undefined} variant={nightChoice === 'keep' ? 'secondary' : 'primary'} onPress={() => setNightChoice('shift')} style={{ flex: 1, alignSelf: 'auto' }} />
                  <Button small variant={nightChoice === 'keep' ? 'primary' : 'secondary'} icon={nightChoice === 'keep' ? 'check' : undefined} label={`Manter ${rawTimes.find((t) => t < '06:00')}`} onPress={() => setNightChoice('keep')} style={{ flex: 1, alignSelf: 'auto' }} />
                </View>
              </>
            ) : (
              <>
                <T style={{ fontSize: 16, color: C.ink }}>Não dá para tirar essa dose da madrugada com esse intervalo. Vamos avisar mesmo assim.</T>
                <Button small variant="secondary" label="Entendi" onPress={() => setNightChoice('keep')} style={{ alignSelf: 'flex-start' }} />
              </>
            )}
          </View>
        ) : null}

        <View style={{ marginBottom: 16 }}><FieldLabel pt="Por quantos dias?" /><ChipRow options={DAYS_OPTIONS.map(DAY_LABELS)} value={DAY_LABELS(days)} onChange={(v) => setDays(DAYS_OPTIONS.find((d) => DAY_LABELS(d) === v)!)} /></View>

        {summaryLine ? <T v="bold" style={{ fontSize: 16, color: C.inkSoft, marginBottom: 8 }}>{summaryLine}</T> : null}
        <MilesChip text="+20 MILHAS POR DOSE NO HORÁRIO" />
        {PAID_PLANS && !limits.medAlarms ? (
          <View style={{ marginTop: 12 }}>
            <InfoNote tone="gold" text="No plano Econômica o lembrete é salvo, mas os alarmes de remédio são exclusivos da Primeira Classe." />
            <Button small variant="ghost" label="Ver planos" onPress={() => router.push('/planos')} style={{ alignSelf: 'flex-start' }} />
          </View>
        ) : null}
        {err ? <View style={{ marginTop: 12 }}><InfoNote tone="red" text={err} /></View> : null}
      </Page>
    </KeyboardAvoidingView>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const mask = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    if (d.length <= 2) return d;
    let h = d.slice(0, 2); let m = d.slice(2);
    if (parseInt(h, 10) > 23) h = '23';
    if (m.length === 2 && parseInt(m, 10) > 59) m = '59';
    return `${h}:${m}`;
  };
  return (
    <TextInput maxFontSizeMultiplier={1.15} value={value} onChangeText={(v) => onChange(mask(v))} keyboardType="number-pad" placeholder="HH:MM" placeholderTextColor={C.inkFaint}
      accessibilityLabel="Horário" style={{ minWidth: 84, minHeight: 48, backgroundColor: C.sheet, borderWidth: 1.5, borderColor: C.line, borderRadius: 10, paddingHorizontal: 14, fontFamily: F.monoBold, fontSize: 18, color: C.ink, textAlign: 'center' }} />
  );
}
