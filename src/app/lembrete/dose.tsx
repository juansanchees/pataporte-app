import React, { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useActivePet, useApp } from '@/store/app';
import { Button, InfoNote, T } from '@/components/ui';
import { BottomCard } from '@/components/v11/lembrete/shared';
import { LembreteIcon } from '@/art/icons-lembrete';
import { dosesBetween, doseKey } from '@/domain/meds';
import { atTime, hhmmOf, toDay } from '@/domain/dates';
import { track } from '@/services/analytics';
import { art } from '@/domain/words';
import { C, F } from '@/theme';

/** Dose-Atrasada: sheet para marcar uma dose de remédio como dada, esquecida ou pulada. */
export default function LembreteDose() {
  const pet = useActivePet();
  const { id, dose } = useLocalSearchParams<{ id?: string; dose?: string }>();
  const reminder = useApp((s) => s.data.reminders.find((r) => r.id === id));
  const doses = useApp((s) => s.data.doses);
  const [mode, setMode] = useState<'ask' | 'esqueci'>('ask');
  const [when, setWhen] = useState(() => hhmmOf(new Date()));
  const [busy, setBusy] = useState(false);

  const at = useMemo(() => (dose ? new Date(dose) : null), [dose]);
  if (!pet || !reminder?.med || !at || Number.isNaN(at.getTime())) return <Redirect href="/" />;
  const day = toDay(at);
  const time = hhmmOf(at);
  const next = dosesBetween(reminder.med, reminder.id, new Date(at.getTime() + 60_000), new Date(at.getTime() + 26 * 3600_000))[0];

  const finish = async (status: 'given' | 'skipped', givenAt?: Date) => {
    setBusy(true);
    await useApp.getState().markDose(reminder.id, day, time, status, givenAt);
    track('dose_marcada', { status });
    setBusy(false);
    router.back();
  };

  const already = doses.some((d) => d.id === doseKey(reminder.id, day, time));

  return (
    <BottomCard>
      <View style={{ alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 6 }} />
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.amberPale, alignItems: 'center', justifyContent: 'center' }}>
          <LembreteIcon name="pill" size={26} color={C.amber} />
        </View>
        <T v="serif" style={{ fontSize: 22, textAlign: 'center' }}>{`${art(pet).O} ${pet.name} tomou o ${reminder.med.name.toLowerCase()}?`}</T>
        <T v="label">{`PREVISTA · ${time}`}</T>
      </View>

      {already ? <InfoNote tone="gold" text="Essa dose já foi marcada. Você pode registrar de novo se corrigiu algo." /> : null}

      {mode === 'ask' ? (
        <View style={{ gap: 10 }}>
          <Button label="Sim, dei agora" icon="check" onPress={() => finish('given')} loading={busy} />
          <Button label="Já tinha dado, esqueci de marcar" variant="secondary" icon="clock" onPress={() => setMode('esqueci')} disabled={busy} />
          <Button label="Pular esta dose" variant="ghost" onPress={() => finish('skipped')} disabled={busy} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <T v="label">Que horas?</T>
          <TextInput maxFontSizeMultiplier={1.15} value={when} onChangeText={(v) => {
            const d = v.replace(/\D/g, '').slice(0, 4);
            const h = d.slice(0, 2); const m = d.slice(2);
            setWhen(d.length <= 2 ? d : `${h}:${m}`);
          }} keyboardType="number-pad" placeholder="HH:MM" placeholderTextColor={C.inkFaint} accessibilityLabel="Horário em que deu o remédio"
            style={{ minHeight: 54, backgroundColor: C.sheet, borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 16, fontFamily: F.monoBold, fontSize: 24, color: C.ink, textAlign: 'center' }} />
          <Button label="Confirmar horário" icon="check" onPress={() => /^\d{2}:\d{2}$/.test(when) ? finish('given', atTime(day, when)) : undefined} loading={busy} />
          <Button label="Voltar" variant="ghost" onPress={() => setMode('ask')} disabled={busy} />
        </View>
      )}

      <InfoNote tone="red" text="Não dê 2 doses juntas. Na dúvida, fale com o veterinário." />
      {next ? <T v="label" style={{ textAlign: 'center' }}>{`PRÓXIMA DOSE · ${next.time}`}</T> : null}
    </BottomCard>
  );
}
