import { foodLabel } from '@/domain/catalog';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useActivePet, useApp } from '@/store/app';
import { Page, PageHeader } from '@/components/passport';
import { Button, ChipRow, FieldLabel, SectionTitle, T } from '@/components/ui';
import { Icon, type IconName } from '@/art/Icon';
import { LIMITS } from '@/domain/commerce';
import { careStatus, historyOf } from '@/domain/itinerary';
import { gramsPerMeal } from '@/domain/catalog';
import { kindDef } from '@/domain/diary';
import { fmtBR, today } from '@/domain/dates';
import { dossieHtml, shareDossie, type DossieOptions } from '@/services/pdf';
import { C } from '@/theme';
import { art } from '@/domain/words';

const PERIODS: [string, number][] = [['3 meses', 3], ['6 meses', 6], ['1 ano', 12]];
const OPTS: { k: keyof Omit<DossieOptions, 'months'>; title: string; sub: string; icon: IconName }[] = [
  { k: 'cares', title: 'Vacinas e cuidados', sub: 'Datas em que tomou e as próximas doses', icon: 'drop' },
  { k: 'health', title: 'Saúde e alimentação', sub: 'Alergias, remédios, ração e quantidade', icon: 'heart' },
  { k: 'weight', title: 'Evolução do peso', sub: 'Todas as pesagens do período', icon: 'scale' },
  { k: 'diary', title: 'Diário de vida', sub: 'Sintomas, consultas e o que você anotou', icon: 'paw' },
  { k: 'chat', title: 'Conversas com o Guia IA', sub: 'Perguntas que você fez ao guia', icon: 'chat' },
];

/** Dossiê: resumo de saúde para levar ao veterinário. */
export default function Dossie() {
  const pet = useActivePet();
  const data = useApp((s) => s.data);
  const profile = useApp((s) => s.profile);
  const plan = profile?.plan ?? 'economica';
  const [period, setPeriod] = useState('6 meses');
  const [o, setO] = useState<Omit<DossieOptions, 'months'>>({ cares: true, weight: true, health: true, diary: true, chat: false });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!pet) return <Redirect href="/" />;
  const pdf = LIMITS[plan].pdf;
  const months = PERIODS.find((p) => p[0] === period)![1];
  const t = today();
  const since = new Date(); since.setMonth(since.getMonth() - months);
  const sinceDay = since.toISOString().slice(0, 10);
  const g = gramsPerMeal(pet);

  const gen = async () => {
    if (!pdf) return router.push('/planos');
    setBusy(true);
    try { await shareDossie(dossieHtml(pet, data, { ...o, months }, profile?.name ?? ''), pet.name); } catch { useApp.getState().showToast('Não foi possível gerar o PDF.'); }
    setBusy(false);
  };

  return (
    <Page seed={22} header={<PageHeader title="Dossiê para o vet" eyebrow="RESUMO DE SAÚDE" />}
      footer={<>
        <Button label="Mostrar na tela do celular" icon="share" onPress={() => setShow(true)} />
        <Button label={pdf ? 'Gerar PDF e enviar' : 'Gerar PDF · Primeira Classe'} icon={pdf ? 'pdf' : 'crown'} variant={pdf ? 'secondary' : 'premium'} onPress={gen} loading={busy} />
      </>}>
      <View style={{ gap: 16 }}>
        <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, gap: 10 }}>
          <T v="xbold" style={{ fontSize: 17 }}>Para que serve?</T>
          <T style={{ fontSize: 15, lineHeight: 22 }}>{`Na consulta, o veterinário sempre pergunta: quando foi a última vacina? Está comendo bem? Emagreceu? O dossiê junta tudo isso ${art(pet).do} ${pet.name} numa página só.`}</T>
          {[
            ['1', 'Escolha o período e o que entra no resumo.'],
            ['2', 'Mostre na tela durante a consulta ou gere o PDF.'],
            ['3', 'O PDF pode ser enviado pelo WhatsApp ou e-mail da clínica.'],
          ].map(([n, txt]) => (
            <View key={n} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.cover, alignItems: 'center', justifyContent: 'center' }}><T v="xbold" style={{ color: C.goldPale, fontSize: 14.5 }}>{n}</T></View>
              <T style={{ flex: 1, fontSize: 14.5 }}>{txt}</T>
            </View>
          ))}
        </View>

        <View><FieldLabel pt="Período do resumo" /><ChipRow options={PERIODS.map((p) => p[0])} value={period} onChange={setPeriod} /></View>

        <View>
          <SectionTitle>O que entra</SectionTitle>
          <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 14 }}>
            {OPTS.map((x, i) => {
              const locked = x.k === 'chat' && !pdf;
              const on = o[x.k];
              return (
                <Pressable key={x.k} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: locked }} onPress={() => (locked ? router.push('/planos') : setO({ ...o, [x.k]: !on }))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, borderTopWidth: i ? 1 : 0, borderStyle: 'dashed', borderColor: C.line }}>
                  <Icon name={x.icon} size={22} color={locked ? C.inkFaint : C.cover} />
                  <View style={{ flex: 1 }}>
                    <T v="bold" style={{ fontSize: 15.5, color: locked ? C.inkSoft : C.ink }}>{x.title}</T>
                    <T style={{ fontSize: 14.5, color: C.inkSoft }}>{x.sub}</T>
                  </View>
                  {locked ? <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' }}><Icon name="lock" size={15} color="#35260A" /></View>
                    : <View style={{ width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: C.cover, backgroundColor: on ? C.cover : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{on && <Icon name="check" size={16} color={C.goldPale} sw={3} />}</View>}
                </Pressable>
              );
            })}
          </View>
        </View>
        {!pdf && <T style={{ fontSize: 15, color: C.inkSoft }}>Na Econômica você mostra o resumo na tela. O PDF para enviar é da Primeira Classe.</T>}
      </View>

      <Modal visible={show} animationType="slide" onRequestClose={() => setShow(false)}>
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60, gap: 8 }}>
            <T v="mono" style={{ fontSize: 14, color: C.inkSoft }}>{`PATAPORTE · Nº ${pet.passportNumber} · ${fmtBR(t)}`}</T>
            <T v="serif" style={{ fontSize: 32, lineHeight: 36 }}>{pet.name}</T>
            <T style={{ fontSize: 16, color: C.inkSoft }}>{`${pet.species === 'dog' ? 'Cão' : 'Gato'} ${pet.breed} · ${pet.sex === 'M' ? 'macho' : 'fêmea'} · nasceu em ${fmtBR(pet.birthDate)} · ${pet.weightKg ? String(pet.weightKg).replace('.', ',') + ' kg' : 'peso não informado'}`}</T>
            {o.health && <>
              <Block title="Saúde e alimentação" />
              <Line k="Alergias" v={pet.allergies || 'Nenhuma'} />
              <Line k="Condições" v={pet.conditions || 'Nenhuma'} />
              <Line k="Remédios" v={pet.meds || 'Nenhum'} />
              <Line k="Comida" v={`${foodLabel(pet.food)} · ${pet.mealsPerDay === null ? '? vezes' : `${pet.mealsPerDay ?? pet.mealTimes.length}x por dia`}${pet.gramsPerDay ? ` · ${pet.gramsPerDay} g/dia${g ? ` (${g} g/refeição)` : ''}` : ''}`} />
            </>}
            {o.cares && <>
              <Block title="Vacinas e cuidados" />
              {data.cares.map((c) => (
                <Line key={c.id} k={c.name} v={`${historyOf(c).length ? `tomou ${historyOf(c).map(fmtBR).join(', ')}` : 'sem registro'} · próxima ${c.nextDate ? fmtBR(c.nextDate) : '—'}${careStatus(c, t) === 'atrasado' ? ' (ATRASADA)' : ''}`} />
              ))}
            </>}
            {o.weight && <>
              <Block title="Peso" />
              {[...data.weights].filter((w) => w.day >= sinceDay).sort((a, b) => a.day.localeCompare(b.day)).map((w) => <Line key={w.id} k={fmtBR(w.day)} v={`${String(w.kg).replace('.', ',')} kg`} />)}
            </>}
            {o.diary && <>
              <Block title="Diário de vida" />
              {data.diary.filter((d) => d.day >= sinceDay).sort((a, b) => b.day.localeCompare(a.day)).map((d) => (
                <Line key={d.id} k={`${fmtBR(d.day)} · ${d.kind ? kindDef(d.kind).label : d.topic}`} v={[d.tags?.join(', '), d.note].filter(Boolean).join(' — ') || '—'} />
              ))}
            </>}
          </ScrollView>
          <View style={{ padding: 24 }}><Button label="Fechar" onPress={() => setShow(false)} /></View>
        </View>
      </Modal>
    </Page>
  );
}

function Block({ title }: { title: string }) {
  return <T v="xbold" style={{ fontSize: 18, marginTop: 16, borderBottomWidth: 1, borderColor: C.line, paddingBottom: 4 }}>{title}</T>;
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ paddingVertical: 4 }}>
      <T v="bold" style={{ fontSize: 15 }}>{k}</T>
      <T style={{ fontSize: 15, color: C.inkSoft }}>{v}</T>
    </View>
  );
}
