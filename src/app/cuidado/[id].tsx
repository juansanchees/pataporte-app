import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useActivePet, useApp } from '@/store/app';
import { Page, PageHeader } from '@/components/passport';
import { Button, SectionTitle, T } from '@/components/ui';
import { CircleStamp } from '@/art/Stamp';
import { Icon } from '@/art/Icon';
import { DurationSheet } from '@/components/v11/lembrete/DurationSheet';
import { BottomSheet } from '@/components/v11/home/HomeSheets';
import { DateBoxes } from '@/components/v11/cadastro/Options';
import { aboutCare, careWords, CATEGORY_LABEL } from '@/domain/catalog';
import { careStatus, historyOf, projected, recurrenceLabel } from '@/domain/itinerary';
import { diffDays, fmtBR, parseBR, today } from '@/domain/dates';
import { durationLabel, type ParasiteKind } from '@/domain/parasites';
import type { ParasiteDuration } from '@/domain/types';
import { C, STATUS_UI } from '@/theme';

/** Ficha de um cuidado: o que é, quando tomou, quando é a próxima e o cronograma das próximas doses. */
export default function Cuidado() {
  const { id, acao } = useLocalSearchParams<{ id: string; acao?: string }>();
  const pet = useActivePet();
  const care = useApp((s) => s.data.cares.find((c) => c.id === id));
  const hour = useApp((s) => s.profile?.notifyHour ?? 9);
  const [confirmDel, setConfirmDel] = useState(false);
  const [dose, setDose] = useState<string | null>(null);
  // notificações: "Já tomou" (acao=carimbar|tomou) abre o registro (com a pergunta de duração p/ vermífugo/antipulgas);
  // "Mudar data" (acao=mudar-data|mudar) abre a troca da data da PRÓXIMA dose (não carimba).
  // O cuidado já está na store quando a notificação navega (handleNotificationAction troca o pet antes).
  const stampNow = acao === 'carimbar' || acao === 'tomou';
  const changeNow = acao === 'mudar-data' || acao === 'mudar';
  const isParasite = care?.category === 'vermifugo' || care?.category === 'antiparasitario';
  const parasiteKind: ParasiteKind = care?.category === 'vermifugo' ? 'vermifugo' : 'antipulgas';
  const [showDuration, setShowDuration] = useState(() => !!care && stampNow && isParasite);
  const [busyDuration, setBusyDuration] = useState(false);
  /** "Mudar data" (DD/MM/AAAA) da próxima dose; null = fechado */
  const [newDate, setNewDate] = useState<string | null>(() => (care && changeNow ? (care.nextDate ? fmtBR(care.nextDate) : '') : null));
  const acaoHandled = useRef(false);
  useEffect(() => {
    if (!care || acaoHandled.current || !stampNow || isParasite) return;
    acaoHandled.current = true;
    useApp.getState().askStamp(care.id);
  }, [care, stampNow, isParasite]);

  if (!pet || !care) return <Page header={<PageHeader title="Cuidado" />}><T>Esse cuidado não existe mais.</T></Page>;

  const t = today();
  const confirmDuration = async (d: ParasiteDuration) => {
    setBusyDuration(true);
    const r = await useApp.getState().setParasiteLast(parasiteKind, t, d);
    setBusyDuration(false);
    setShowDuration(false);
    if (r) useApp.getState().showToast(`Registrado! ${durationLabel(r.months)} · próximo ${r.label}.`);
  };
  const saveNewDate = async () => {
    const day = parseBR(newDate ?? '');
    if (!day) { useApp.getState().showToast('Confira a data: dia, mês e ano.'); return; }
    if (diffDays(t, day) < 0) { useApp.getState().showToast('Escolha hoje ou uma data futura. Se já tomou, use "Já tomou".'); return; }
    await useApp.getState().setCareNextDate(care.id, day);
    setNewDate(null);
  };
  const st = careStatus(care, t);
  const ui = STATUS_UI[st];
  const past = historyOf(care);
  const next = projected(care, 4);
  const n = care.nextDate ? diffDays(t, care.nextDate) : null;
  const headline = st === 'carimbado' ? 'Concluído' : n === null ? '—' : n < 0 ? `Atrasado há ${-n} ${n === -1 ? 'dia' : 'dias'}` : n === 0 ? 'É hoje' : `Faltam ${n} ${n === 1 ? 'dia' : 'dias'}`;
  const reminders = [...care.reminders].sort((a, b) => b - a).map((r) => (r === 0 ? 'no dia' : r === 1 ? '1 dia antes' : `${r} dias antes`));

  return (
    <Page seed={23} header={<PageHeader title={care.name} eyebrow={CATEGORY_LABEL[care.category].toUpperCase()} />}
      footer={st !== 'carimbado' ? <Button label={careWords(care.category).done} icon="stamp" variant="stamp" onPress={() => (isParasite ? setShowDuration(true) : useApp.getState().askStamp(care.id))} /> : undefined}>
      <View style={{ gap: 16 }}>
        <View style={{ backgroundColor: ui.bg, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <T v="monoBold" style={{ fontSize: 14, color: ui.color, letterSpacing: 1 }}>{ui.label}</T>
            <T v="serif" style={{ fontSize: 28, lineHeight: 32 }}>{headline}</T>
            {care.nextDate && st !== 'carimbado' ? <T v="bold" style={{ fontSize: 16 }}>{`Próxima dose: ${fmtBR(care.nextDate)}`}</T> : null}
            <T style={{ fontSize: 14.5, color: C.inkSoft }}>{care.lastDate ? `Última vez: ${fmtBR(care.lastDate)}` : 'Ainda não carimbado'}</T>
          </View>
          {care.lastDate ? <CircleStamp top={care.name.toUpperCase().slice(0, 22)} bottom={pet.name.toUpperCase()} main={care.code} sub={fmtBR(care.lastDate)} color={C.blue} size={92} rotation={-10} seed={care.id.length + 7} /> : null}
        </View>

        <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="info" size={20} color={C.aquaInk} /><T v="xbold" style={{ fontSize: 16 }}>O que é</T></View>
          <T style={{ fontSize: 15, lineHeight: 22 }}>{aboutCare(care.code, care.name)}</T>
          <T v="bold" style={{ fontSize: 14, color: C.inkSoft }}>{`Repetição: ${recurrenceLabel(care.recurrence)}`}</T>
          {care.answer === 'naosei' ? <T v="bold" style={{ fontSize: 14, color: C.amber }}>Você marcou “Não sei” no cadastro: confirme a data com o veterinário.</T> : null}
        </View>

        <View>
          <SectionTitle>Cronograma</SectionTitle>
          <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 16 }}>
            {past.length === 0 && next.length === 0 && <T style={{ color: C.inkSoft, paddingVertical: 10 }}>Sem datas ainda.</T>}
            {past.map((d, i) => <Step key={`p${d}`} day={d} label={`${careWords(care.category).done.replace('Já ', '').replace(/^\w/, (x) => x.toUpperCase())}  ✎`} done first={i === 0} last={i === past.length - 1 && next.length === 0} onPress={() => setDose(dose === d ? null : d)} />)}
            {next.map((d, i) => (
              <Step key={`n${d}`} day={d} label={i === 0 ? (st === 'atrasado' ? 'Atrasada' : 'Próxima dose') : 'Prevista'} late={i === 0 && st === 'atrasado'} next={i === 0} first={past.length === 0 && i === 0} last={i === next.length - 1} />
            ))}
          </View>
          {dose ? (
            <View style={{ backgroundColor: C.sheet, borderWidth: 1.5, borderColor: C.cover, borderRadius: 14, padding: 14, gap: 10, marginTop: 10 }}>
              <T v="bold" style={{ fontSize: 15 }}>{`Dose de ${fmtBR(dose)}. Registrou errado?`}</T>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button label="Corrigir data" small variant="secondary" onPress={() => { const d = dose; setDose(null); useApp.getState().askStamp(care.id, d); }} style={{ flex: 1, alignSelf: 'auto' }} />
                <Button label="Apagar dose" small variant="danger" onPress={async () => { await useApp.getState().removeDose(care.id, dose); setDose(null); }} style={{ flex: 1, alignSelf: 'auto' }} />
              </View>
            </View>
          ) : past.length ? <T style={{ fontSize: 15, color: C.inkSoft, marginTop: 8 }}>Toque numa dose já tomada para corrigir a data ou apagar.</T> : null}
          {care.recurrence && next.length > 0 ? <T style={{ fontSize: 15, color: C.inkSoft, marginTop: 8 }}>As datas previstas se ajustam sozinhas quando você carimba com a data real.</T> : null}
        </View>

        {care.active && care.nextDate ? (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: C.aquaPale, borderRadius: 14, padding: 14 }}>
            <Icon name="bell" size={20} color={C.aquaInk} />
            <T v="bold" style={{ flex: 1, fontSize: 14.5, color: C.aquaInk, lineHeight: 20 }}>{`Vamos te avisar ${reminders.join(', ')} às ${String(hour).padStart(2, '0')}h${care.place ? ` · local: ${care.place}` : ''}.`}</T>
          </View>
        ) : null}

        {care.nextDate && st !== 'carimbado' ? <Button label="Mudar a data da próxima dose" icon="calendar" variant="secondary" onPress={() => setNewDate(fmtBR(care.nextDate!))} /> : null}
        <Button label="Registrar uma dose antiga" icon="calendar" variant="secondary" onPress={() => useApp.getState().askStamp(care.id)} />
        {confirmDel ? (
          <View style={{ gap: 8 }}>
            <T v="bold" style={{ textAlign: 'center' }}>Remover do itinerário? Os carimbos já feitos continuam na página de carimbos.</T>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Cancelar" variant="secondary" onPress={() => setConfirmDel(false)} style={{ flex: 1 }} />
              <Button label="Remover" variant="danger" onPress={async () => { await useApp.getState().deleteCare(care.id); router.back(); }} style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <Button label="Remover do itinerário" variant="ghost" onPress={() => setConfirmDel(true)} />
        )}
      </View>
      <BottomSheet visible={newDate !== null} onClose={() => setNewDate(null)} title="Nova data">
        <T style={{ fontSize: 16, color: C.inkSoft }}>{`Quando vai ser ${care.name}? Vamos avisar antes.`}</T>
        <DateBoxes value={newDate ?? ''} onChange={setNewDate} />
        <Button label="Salvar nova data" icon="check" onPress={saveNewDate} />
      </BottomSheet>
      <Modal visible={showDuration} transparent animationType="slide" onRequestClose={() => setShowDuration(false)}>
        <DurationSheet title="Quanto tempo ele protege?" busy={busyDuration} onConfirm={confirmDuration} onClose={() => setShowDuration(false)} />
      </Modal>
    </Page>
  );
}

function Step({ day, label, done, next, late, first, last, onPress }: { day: string; label: string; done?: boolean; next?: boolean; late?: boolean; first?: boolean; last?: boolean; onPress?: () => void }) {
  const color = done ? C.blue : late ? C.red : next ? C.amber : C.inkFaint;
  return (
    <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52 }}>
      <View style={{ width: 24, alignItems: 'center', alignSelf: 'stretch' }}>
        <View style={{ position: 'absolute', top: first ? 26 : 0, bottom: last ? 26 : 0, width: 2, backgroundColor: C.line }} />
        <View style={{ marginTop: 16, width: 22, height: 22, borderRadius: 11, backgroundColor: done ? color : C.sheet, borderWidth: 2, borderColor: color, borderStyle: done || next ? 'solid' : 'dashed', alignItems: 'center', justifyContent: 'center' }}>
          {done ? <Icon name="check" size={13} color="#fff" sw={3} /> : null}
        </View>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T v={next ? 'xbold' : 'bold'} style={{ fontSize: 15.5, color: done || next ? C.ink : C.inkSoft }}>{fmtBR(day)}</T>
        <T v="bold" style={{ fontSize: 14, color }}>{label}</T>
      </View>
    </Pressable>
  );
}
