import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useActivePet, useApp } from '@/store/app';
import { Page, PageHeader } from '@/components/passport';
import { Button, Chip, FieldLabel, InfoNote, SectionTitle, T } from '@/components/ui';
import { Icon } from '@/art/Icon';
import { newId } from '@/data';
import { DESTINATIONS, TRANSPORTS, destLabel, tripChecklist, tripSummary } from '@/domain/travel';
import { diffDays, fmtBR, parseBR, today } from '@/domain/dates';
import type { TripDest, TripTransport, TriState } from '@/domain/types';
import { C, F } from '@/theme';
import { art } from '@/domain/words';

const mask = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
};

/** Vou viajar: lista de viagens e o formulário de uma nova. */
export default function Viagens() {
  const pet = useActivePet();
  const trips = useApp((s) => s.data.trips);
  const cares = useApp((s) => s.data.cares);
  const [form, setForm] = useState(trips.length === 0);
  const [dest, setDest] = useState<TripDest | null>(null);
  const [country, setCountry] = useState('');
  const [date, setDate] = useState('');
  const [transport, setTransport] = useState<TripTransport>('aviao');
  const [chip, setChip] = useState<TriState>(pet?.microchip?.has ?? 'naosei');
  const [chipNum, setChipNum] = useState(pet?.microchip?.number ?? '');
  const [err, setErr] = useState('');
  if (!pet) return <Redirect href="/" />;
  const t = today();

  const create = async () => {
    const d = parseBR(date);
    if (!dest) return setErr('Escolha para onde vai.');
    if (!d || d < t) return setErr('Informe a data da viagem (DD/MM/AAAA), a partir de hoje.');
    if ((dest === 'outro') && !country.trim()) return setErr('Escreva o país de destino.');
    setErr('');
    await useApp.getState().setMicrochip(chip, chipNum);
    const trip = { id: newId(), dest, country: dest === 'ue' || dest === 'outro' ? country.trim() : '', date: d, transport, done: [], createdAt: new Date().toISOString() };
    await useApp.getState().saveTrip(trip);
    setForm(false);
    setDest(null); setCountry(''); setDate('');
    router.push({ pathname: '/viagem/[id]', params: { id: trip.id } });
  };

  const needCountry = dest === 'ue' || dest === 'outro';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Page seed={27} header={<PageHeader title="Vou viajar" eyebrow={`CHECKLIST ${art(pet).DO} ${pet.name.toUpperCase()}`} />}
        footer={form ? <Button label={`Ver o que ${art(pet).o} ${pet.name} precisa`} icon="suitcase" onPress={create} /> : <Button label="Planejar nova viagem" icon="plus" onPress={() => setForm(true)} />}>
        <View style={{ gap: 16 }}>
          {trips.length > 0 && (
            <View style={{ gap: 10 }}>
              <SectionTitle>Minhas viagens</SectionTitle>
              {[...trips].sort((a, b) => a.date.localeCompare(b.date)).map((tr) => {
                const sum = tripSummary(tripChecklist(tr, pet, cares, t));
                const left = diffDays(t, tr.date);
                return (
                  <Pressable key={tr.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/viagem/[id]', params: { id: tr.id } })}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14 }}>
                    <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.cover, alignItems: 'center', justifyContent: 'center' }}><Icon name="plane" size={22} color={C.goldLight} /></View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T v="xbold" style={{ fontSize: 16 }}>{destLabel(tr)}</T>
                      <T style={{ fontSize: 14, color: C.inkSoft }}>{`${fmtBR(tr.date)} · ${left < 0 ? 'já passou' : left === 0 ? 'é hoje' : `em ${left} dias`}`}</T>
                      <T v="bold" style={{ fontSize: 14, color: sum.pending ? C.amber : C.green }}>{sum.pending ? `Faltam ${sum.pending} itens` : 'Tudo pronto!'}</T>
                    </View>
                    <Icon name="chevron" size={18} color={C.inkSoft} />
                  </Pressable>
                );
              })}
            </View>
          )}

          {form && (
            <View style={{ gap: 16 }}>
              {trips.length === 0 && <T style={{ fontSize: 15.5, color: C.inkSoft, lineHeight: 22 }}>{`Conte para onde e quando vocês vão. O app cruza com as vacinas ${art(pet).do} ${pet.name} e mostra o que já está pronto, o que falta e até quando fazer cada coisa.`}</T>}
              <View>
                <FieldLabel pt="Para onde?" />
                <View style={{ gap: 8 }}>
                  {DESTINATIONS.map((d) => {
                    const on = dest === d.k;
                    return (
                      <Pressable key={d.k} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setDest(d.k)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, borderRadius: 12, borderWidth: on ? 2 : 1, borderColor: on ? C.cover : C.line, backgroundColor: on ? C.sheet : 'rgba(255,255,255,0.4)' }}>
                        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.cover, alignItems: 'center', justifyContent: 'center' }}>{on && <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: C.cover }} />}</View>
                        <View style={{ flex: 1 }}><T v="bold" style={{ fontSize: 15.5 }}>{d.label}</T><T style={{ fontSize: 14.5, color: C.inkSoft }}>{d.hint}</T></View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              {needCountry && (
                <View>
                  <FieldLabel pt={dest === 'ue' ? 'Qual país? (opcional)' : 'Qual país?'} />
                  <TextInput maxFontSizeMultiplier={1.15} value={country} onChangeText={setCountry} placeholder={dest === 'ue' ? 'Ex.: Portugal' : 'Ex.: Japão'} placeholderTextColor={C.inkFaint} accessibilityLabel="País"
                    style={inputStyle} />
                </View>
              )}
              <View>
                <FieldLabel pt="Data da viagem" />
                <TextInput maxFontSizeMultiplier={1.15} value={date} onChangeText={(v) => setDate(mask(v))} placeholder="DD/MM/AAAA" placeholderTextColor={C.inkFaint} keyboardType="number-pad" accessibilityLabel="Data da viagem"
                  style={[inputStyle, { fontFamily: F.monoBold, letterSpacing: 2, fontSize: 18 }]} />
              </View>
              <View>
                <FieldLabel pt="Como vão?" />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {TRANSPORTS.map((x) => <Chip key={x.k} label={x.label} on={transport === x.k} onPress={() => setTransport(x.k)} style={{ flex: 1, justifyContent: 'center' }} />)}
                </View>
              </View>
              <View>
                <FieldLabel pt={`${art(pet).O} ${pet.name} tem microchip?`} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {([['sim', 'Tem'], ['nao', 'Não tem'], ['naosei', 'Não sei']] as const).map(([k, l]) => <Chip key={k} label={l} on={chip === k} onPress={() => setChip(k)} style={{ flex: 1, justifyContent: 'center' }} />)}
                </View>
                {chip === 'sim' && (
                  <TextInput maxFontSizeMultiplier={1.15} value={chipNum} onChangeText={(v) => setChipNum(v.replace(/\D/g, '').slice(0, 15))} placeholder="Número (15 dígitos, opcional)" placeholderTextColor={C.inkFaint} keyboardType="number-pad" accessibilityLabel="Número do microchip"
                    style={[inputStyle, { marginTop: 8, fontFamily: F.monoBold }]} />
                )}
                <T style={{ fontSize: 14.5, color: C.inkSoft, marginTop: 6 }}>É um chip do tamanho de um grão de arroz, colocado pelo vet na nuca. O número fica na carteirinha.</T>
              </View>
              {err ? <InfoNote tone="red" text={err} /> : null}
            </View>
          )}
        </View>
      </Page>
    </KeyboardAvoidingView>
  );
}

const inputStyle = { minHeight: 50, backgroundColor: 'rgba(255,255,255,0.6)', borderBottomWidth: 2, borderBottomColor: C.inkSoft, borderTopLeftRadius: 10, borderTopRightRadius: 10, paddingHorizontal: 14, fontFamily: F.body, fontSize: 16, color: C.ink } as const;
