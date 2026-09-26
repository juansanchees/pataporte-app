import React, { useState } from 'react';
import { Linking, Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useActivePet, useApp } from '@/store/app';
import { Page, PageHeader, PetPhoto } from '@/components/passport';
import { Button, SectionTitle, T } from '@/components/ui';
import { Icon } from '@/art/Icon';
import { destLabel, findCare, tripChecklist, tripSummary, TRANSPORTS, type ReqState, type TripReq } from '@/domain/travel';
import { diffDays, fmtBR, today } from '@/domain/dates';
import { C, F } from '@/theme';

const STATE_UI: Record<ReqState, { label: string; color: string; bg: string; icon: 'check' | 'info' | 'close' | 'bell' }> = {
  ok: { label: 'Pronto', color: C.green, bg: C.greenPale, icon: 'check' },
  falta: { label: 'Falta', color: C.amber, bg: C.amberPale, icon: 'bell' },
  atencao: { label: 'Atenção', color: C.red, bg: C.redPale, icon: 'info' },
  info: { label: 'Bom saber', color: C.aquaInk, bg: C.aquaPale, icon: 'info' },
};

export default function Viagem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pet = useActivePet();
  const trip = useApp((s) => s.data.trips.find((x) => x.id === id));
  const cares = useApp((s) => s.data.cares);
  const [confirmDel, setConfirmDel] = useState(false);
  const [chipNum, setChipNum] = useState('');
  if (!pet || !trip) return <Page header={<PageHeader title="Viagem" />}><T>Essa viagem não existe mais.</T></Page>;
  const t = today();
  const reqs = tripChecklist(trip, pet, cares, t);
  const sum = tripSummary(reqs);
  const left = diffDays(t, trip.date);
  const pct = sum.total ? Math.round((sum.ok / sum.total) * 100) : 100;
  const arb = findCare(cares, 'ARB', /antirrab|raiva/);

  const groups: [string, TripReq[]][] = [
    ['Precisa de atenção', reqs.filter((r) => r.state === 'atencao')],
    ['Falta fazer', reqs.filter((r) => r.state === 'falta')],
    ['Bom saber', reqs.filter((r) => r.state === 'info')],
    ['Pronto', reqs.filter((r) => r.state === 'ok')],
  ];

  const extra = (r: TripReq) => {
    if (r.key === 'arb' && r.state !== 'ok' && arb) return <Button label="Carimbar a antirrábica" icon="stamp" small variant="stamp" onPress={() => useApp.getState().askStamp(arb.id)} />;
    if (r.key === 'chip' && r.state !== 'ok') {
      return (
        <View style={{ gap: 8 }}>
          <TextInput maxFontSizeMultiplier={1.15} value={chipNum} onChangeText={(v) => setChipNum(v.replace(/\D/g, '').slice(0, 15))} placeholder="Nº do chip (opcional)" placeholderTextColor={C.inkFaint} keyboardType="number-pad" accessibilityLabel="Número do microchip"
            style={{ minHeight: 44, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 10, paddingHorizontal: 12, fontFamily: F.monoBold, fontSize: 14, color: C.ink }} />
          <Button label="Já tem microchip" small onPress={() => useApp.getState().setMicrochip('sim', chipNum)} />
        </View>
      );
    }
    if (r.key === 'cabine' && r.state === 'atencao' && !pet.weightKg) return <Button label="Registrar peso" icon="scale" small variant="secondary" onPress={() => router.push('/peso')} />;
    if (r.key === 'parasitas' && r.state !== 'ok') return <Button label="Ver vermífugo e antipulgas" small variant="secondary" onPress={() => router.push('/itinerario')} />;
    return null;
  };

  return (
    <Page seed={28} header={<PageHeader title={destLabel(trip)} eyebrow={`VIAGEM · ${TRANSPORTS.find((x) => x.k === trip.transport)?.label.toUpperCase()}`} />}>
      <View style={{ gap: 16 }}>
        <View style={{ backgroundColor: C.cover, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <PetPhoto pet={pet} mood={sum.pending ? 'neutro' : 'feliz'} w={78} h={96} holo={false} />
          <View style={{ flex: 1, gap: 4 }}>
            <T v="serif" style={{ fontSize: 24, color: C.goldPale, lineHeight: 28 }}>{sum.pending ? `Faltam ${sum.pending} ${sum.pending === 1 ? 'item' : 'itens'}` : 'Tudo pronto!'}</T>
            <T v="bold" style={{ color: C.goldLight, fontSize: 14.5 }}>{`${fmtBR(trip.date)} · ${left < 0 ? 'já passou' : left === 0 ? 'é hoje' : `faltam ${left} dias`}`}</T>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(221,189,126,0.25)', marginTop: 6 }}><View style={{ height: 8, borderRadius: 4, width: `${pct}%`, backgroundColor: C.gold }} /></View>
            <T style={{ color: C.goldPale, fontSize: 14.5 }}>{`${sum.ok} de ${sum.total} prontos`}</T>
          </View>
        </View>

        {groups.filter(([, l]) => l.length).map(([title, list]) => (
          <View key={title} style={{ gap: 10 }}>
            <SectionTitle>{title}</SectionTitle>
            {list.map((r) => {
              const ui = STATE_UI[r.state];
              return (
                <View key={r.key} style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderLeftWidth: 5, borderLeftColor: ui.color, borderRadius: 14, padding: 14, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    {r.manual ? (
                      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: r.state === 'ok' }} accessibilityLabel={`${r.title}: já fiz`} onPress={() => useApp.getState().toggleTripItem(trip.id, r.key)} hitSlop={8}
                        style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: r.state === 'ok' ? C.green : C.inkSoft, backgroundColor: r.state === 'ok' ? C.green : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                        {r.state === 'ok' && <Icon name="check" size={17} color="#fff" sw={3} />}
                      </Pressable>
                    ) : (
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: ui.bg, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}><Icon name={ui.icon} size={16} color={ui.color} sw={2.6} /></View>
                    )}
                    <View style={{ flex: 1, gap: 4 }}>
                      <T v="xbold" style={{ fontSize: 16, lineHeight: 21 }}>{r.title}</T>
                      <T style={{ fontSize: 14.5, lineHeight: 21, color: C.inkSoft }}>{r.why}</T>
                    </View>
                  </View>
                  {(r.deadline || r.window) && r.state !== 'ok' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: ui.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 38 }}>
                      <Icon name="calendar" size={15} color={ui.color} />
                      <T v="bold" style={{ fontSize: 15, color: ui.color }}>{r.window ? (r.window.to < t ? 'Prazo encerrado' : `Entre ${fmtBR(r.window.from < t ? t : r.window.from).slice(0, 5)} e ${fmtBR(r.window.to).slice(0, 5)}`) : r.deadline! < t ? `Prazo encerrado em ${fmtBR(r.deadline!)}` : `Até ${fmtBR(r.deadline!)}`}</T>
                    </View>
                  ) : null}
                  <View style={{ marginLeft: 38, gap: 8 }}>
                    {extra(r)}
                    {r.manual && r.state !== 'ok' ? <T style={{ fontSize: 14.5, color: C.inkSoft }}>Marque a caixinha quando fizer.</T> : null}
                    {r.reminder && r.state !== 'ok' ? <Button label="Criar lembrete" icon="bell" small variant="ghost" onPress={() => useApp.getState().addReminder(r.reminder!.name, r.reminder!.day)} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} /> : null}
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        <View style={{ backgroundColor: C.aquaPale, borderRadius: 14, padding: 14, gap: 8 }}>
          <T v="bold" style={{ fontSize: 14.5, color: C.aquaInk, lineHeight: 20 }}>Regras de 2026 do MAPA, da União Europeia e do CDC (EUA). Elas mudam com frequência: confirme sempre com o veterinário, a companhia e o consulado.</T>
          <Button label="Abrir a página oficial do MAPA" small variant="secondary" onPress={() => Linking.openURL('https://www.gov.br/agricultura/pt-br/assuntos/vigilancia-agropecuaria/animais-estimacao/sair-do-brasil')} />
        </View>

        {confirmDel ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Cancelar" variant="secondary" onPress={() => setConfirmDel(false)} style={{ flex: 1 }} />
            <Button label="Apagar" variant="danger" onPress={async () => { await useApp.getState().deleteTrip(trip.id); router.back(); }} style={{ flex: 1 }} />
          </View>
        ) : <Button label="Apagar esta viagem" variant="ghost" onPress={() => setConfirmDel(true)} />}
      </View>
    </Page>
  );
}
