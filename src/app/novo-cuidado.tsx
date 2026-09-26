import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useActivePet, useApp } from '@/store/app';
import { Page, PageHeader } from '@/components/passport';
import { Button, ChipRow, Field, FieldLabel, InfoNote, T } from '@/components/ui';
import { CircleStamp } from '@/art/Stamp';
import { codeFromName, milesForCategory } from '@/domain/catalog';
import { addRecurrence, fmtLong, parseBR, today } from '@/domain/dates';
import type { CareCategory, Recurrence } from '@/domain/types';
import { C } from '@/theme';

const TYPES: [string, CareCategory][] = [['Vacina', 'vacina'], ['Vermífugo', 'vermifugo'], ['Antipulgas', 'antiparasitario'], ['Remédio', 'remedio'], ['Exame', 'exame'], ['Outro', 'outro']];
const REPEAT: [string, Recurrence][] = [['Anual', { unit: 'year', every: 1 }], ['6 meses', { unit: 'month', every: 6 }], ['3 meses', { unit: 'month', every: 3 }], ['Mensal', { unit: 'month', every: 1 }], ['Diário', { unit: 'day', every: 1 }], ['Não repete', null]];
const REMIND: [string, number][] = [['No dia', 0], ['1 dia antes', 1], ['3 dias antes', 3], ['1 semana antes', 7]];

function brToday() {
  const [y, m, d] = today().split('-');
  return `${d}/${m}/${y}`;
}

export default function NovoCuidado() {
  const pet = useActivePet();
  const [type, setType] = useState('Vacina');
  const [name, setName] = useState('');
  const [applied, setApplied] = useState(brToday());
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('Anual');
  const [remind, setRemind] = useState<string[]>(['1 dia antes', '3 dias antes']);
  const [place, setPlace] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!pet) return <Redirect href="/" />;

  const cat = TYPES.find((x) => x[0] === type)![1];
  const rec = REPEAT.find((x) => x[0] === repeat)![1];
  const appliedDay = applied.trim() ? parseBR(applied) : null;
  // data futura em "Aplicada em" = agendamento para esse dia (não +1 ano)
  const nextDay = next.trim() ? parseBR(next) : appliedDay ? (appliedDay > today() ? appliedDay : addRecurrence(appliedDay, rec)) : null;
  const t = today();
  const stampNow = !!appliedDay && appliedDay <= t;

  const save = async () => {
    if (name.trim().length < 2) return setErr('Dê um nome ao cuidado (ex.: Antirrábica).');
    if (applied.trim() && !appliedDay) return setErr('Data de aplicação inválida. Use DD/MM/AAAA.');
    if (next.trim() && !parseBR(next)) return setErr('Data da próxima dose inválida. Use DD/MM/AAAA.');
    if (!stampNow && !nextDay) return setErr('Informe quando foi aplicado ou quando será.');
    if (stampNow && appliedDay && nextDay && nextDay <= appliedDay) return setErr('A próxima dose precisa ser depois da data de aplicação.');
    setErr('');
    setBusy(true);
    await useApp.getState().addCare({
      name, category: cat, applied: stampNow ? appliedDay : null, next: stampNow ? nextDay : (nextDay ?? appliedDay),
      recurrence: rec, reminders: REMIND.filter((r) => remind.includes(r[0])).map((r) => r[1]), place,
    });
    setBusy(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Page seed={18} header={<PageHeader title="Novo carimbo" eyebrow="REGISTRAR CUIDADO" />}
        footer={<Button label={stampNow ? `Carimbar · +${milesForCategory(cat)} milhas` : 'Agendar embarque'} icon={stampNow ? 'stamp' : 'ticket'} variant={stampNow ? 'stamp' : 'primary'} onPress={save} loading={busy} />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: C.inkFaint, borderRadius: 14, padding: 12, marginBottom: 18, backgroundColor: C.sheet }}>
          <CircleStamp top={(name || 'NOME DO CUIDADO').toUpperCase().slice(0, 22)} bottom={`${pet.name.toUpperCase()} · ${pet.passportNumber}`} main={name ? codeFromName(name) : '???'}
            sub={appliedDay ? fmtLong(appliedDay) : ''} color={cat === 'vacina' ? C.blue : cat === 'vermifugo' ? C.green : cat === 'antiparasitario' ? C.purple : C.coralInk} size={108} rotation={-10} seed={101} />
          <View style={{ flex: 1 }}><T v="label">Prévia do carimbo</T><T style={{ fontSize: 15, color: C.inkSoft }}>{stampNow ? 'Já aplicado: vai direto para a página de carimbos.' : 'Futuro: entra no itinerário com chamada de embarque.'}</T></View>
        </View>
        <View style={{ marginBottom: 16 }}>
          <FieldLabel pt="Tipo" en="Type" />
          <ChipRow options={TYPES.map((x) => x[0])} value={type} onChange={(v) => (v === 'Remédio' ? router.push('/lembrete/remedio') : setType(v))} />
          <T style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 4 }}>“Remédio” abre o lembrete com horários automáticos.</T>
        </View>
        <Field pt="Nome" en="Name" value={name} onChangeText={setName} placeholder="Ex.: Antirrábica" autoCapitalize="sentences" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field pt="Aplicada em" value={applied} onChangeText={setApplied} placeholder="DD/MM/AAAA" keyboardType="numbers-and-punctuation" style={{ flex: 1 }} />
          <Field pt="Próxima dose" value={next} onChangeText={setNext} placeholder={nextDay ? nextDay.split('-').reverse().join('/') : 'DD/MM/AAAA'} keyboardType="numbers-and-punctuation" style={{ flex: 1 }} />
        </View>
        <View style={{ marginBottom: 16 }}><FieldLabel pt="Repetir" en="Repeat" /><ChipRow options={REPEAT.map((x) => x[0])} value={repeat} onChange={setRepeat} /></View>
        <View style={{ marginBottom: 16 }}><FieldLabel pt="Chamada de embarque" en="Reminder" /><ChipRow multi options={REMIND.map((x) => x[0])} value={remind} onChange={(v) => setRemind(remind.includes(v) ? remind.filter((x) => x !== v) : [...remind, v])} /></View>
        <Field pt="Clínica ou veterinário" value={place} onChangeText={setPlace} placeholder="Opcional" />
        {err ? <InfoNote tone="red" text={err} /> : null}
      </Page>
    </KeyboardAvoidingView>
  );
}
