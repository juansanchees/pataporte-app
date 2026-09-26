import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/art/Icon';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { useActivePet, useApp } from '@/store/app';
import { Page, PageHeader } from '@/components/passport';
import { Button, Field, MilesChip, SectionTitle, T } from '@/components/ui';
import { fmtBR, fmtLong, fmtShort, parseBR, today } from '@/domain/dates';
import { PAID_PLANS } from '@/domain/commerce';
import type { WeightLog } from '@/domain/types';
import { C, F } from '@/theme';
import { Redirect, router } from 'expo-router';

export default function Peso() {
  const pet = useActivePet();
  const weights = useApp((s) => s.data.weights);
  const limits = useApp((s) => s.limits());
  const chartLocked = PAID_PLANS && !limits.weightChart;
  const { width } = useWindowDimensions();
  const [val, setVal] = useState('');
  const [edit, setEdit] = useState<WeightLog | null>(null);
  if (!pet) return <Redirect href="/" />;
  const list = [...weights].sort((a, b) => a.day.localeCompare(b.day));
  const last = list[list.length - 1];
  const pts = list.slice(-8);
  const W = width - 48;
  const H = 170;
  const min = Math.min(...pts.map((p) => p.kg), last?.kg ?? 0) - 1;
  const max = Math.max(...pts.map((p) => p.kg), last?.kg ?? 1) + 1;
  const x = (i: number) => 24 + (i * (W - 48)) / Math.max(1, pts.length - 1);
  const y = (kg: number) => 16 + (1 - (kg - min) / Math.max(0.1, max - min)) * (H - 40);
  const delta = list.length >= 2 ? last.kg - list[0].kg : 0;

  const add = async () => {
    const kg = parseFloat(val.replace(',', '.'));
    if (!Number.isFinite(kg) || kg <= 0 || kg > 150) return useApp.getState().showToast('Digite um peso válido em kg.');
    await useApp.getState().addWeight(Math.round(kg * 10) / 10);
    setVal('');
  };

  return (
    <Page seed={19} header={<PageHeader title="Balança de embarque" eyebrow="CONTROLE DE PESO" />}>
      <View style={{ gap: 14 }}>
        <View style={{ backgroundColor: C.goldPale, borderWidth: 1.5, borderColor: C.gold, borderRadius: 14, padding: 16, paddingLeft: 30 }}>
          <View style={{ position: 'absolute', left: 10, top: '50%', width: 10, height: 10, marginTop: 0, borderRadius: 5, backgroundColor: C.paper, borderWidth: 1.5, borderColor: C.goldDark }} />
          <T v="monoBold" style={{ fontSize: 13, letterSpacing: 1.6, color: C.goldDark }}>{`ETIQUETA DE BAGAGEM · ${pet.name.toUpperCase()}`}</T>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <T v="serif" style={{ fontSize: 42 }}>{last ? String(last.kg).replace('.', ',') : '—'}</T><T v="monoBold">KG</T>
          </View>
          <T style={{ fontSize: 14 }}>{last ? `Última pesagem em ${fmtLong(last.day)}` : 'Ainda sem pesagens. Registre a primeira abaixo.'}</T>
        </View>
        {chartLocked ? (
          <View style={{ backgroundColor: C.paper2, borderWidth: 2, borderStyle: 'dashed', borderColor: C.inkFaint, borderRadius: 14, padding: 18, gap: 10, alignItems: 'center' }}>
            <Icon name="lock" size={22} color={C.inkSoft} />
            <T v="bold" style={{ textAlign: 'center' }}>O gráfico de evolução é exclusivo da Primeira Classe.</T>
            <Button small label="Ver planos" onPress={() => router.push('/planos')} />
          </View>
        ) : pts.length >= 2 && (
          <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingVertical: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 4 }}>
              <T v="label">Evolução</T>
              <T v="monoBold" style={{ fontSize: 13, color: delta >= 0 ? C.green : C.amber }}>{`${delta >= 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')} KG`}</T>
            </View>
            <Svg width={W} height={H} accessibilityLabel={`Peso foi de ${pts[0].kg} para ${last.kg} quilos`}>
              {Array.from({ length: Math.floor(W / 16) }, (_, i) => <Line key={`v${i}`} x1={10 + i * 16} y1={0} x2={10 + i * 16} y2={H - 20} stroke={C.line} strokeWidth={0.7} />)}
              {Array.from({ length: Math.floor((H - 20) / 16) }, (_, i) => <Line key={`h${i}`} x1={0} y1={10 + i * 16} x2={W} y2={10 + i * 16} stroke={C.line} strokeWidth={0.7} />)}
              <Polyline points={pts.map((p, i) => `${x(i)},${y(p.kg)}`).join(' ')} fill="none" stroke={C.cover} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) => <Circle key={p.id} cx={x(i)} cy={y(p.kg)} r={5} fill={C.sheet} stroke={C.cover} strokeWidth={2.5} />)}
              {pts.map((p, i) => <SvgText key={`t${p.id}`} x={x(i)} y={H - 4} fontSize={9} fontFamily={F.mono} fill={C.inkSoft} textAnchor="middle">{fmtShort(p.day)}</SvgText>)}
            </Svg>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <Field pt="Pesagem de hoje (kg)" value={val} onChangeText={setVal} placeholder="00,0" keyboardType="decimal-pad" style={{ flex: 1, marginBottom: 0 }} />
          <Button label="Registrar" small onPress={add} style={{ minHeight: 48, alignSelf: 'auto' }} />
        </View>
        <MilesChip text="+5 MILHAS POR SEMANA" />
        <T style={{ fontSize: 14, color: C.inkSoft }}>A faixa de peso ideal varia por raça, idade e porte. Confirme a meta do seu pet com o veterinário.</T>
        {list.length > 0 && <View><SectionTitle>Histórico</SectionTitle>
          <T style={{ fontSize: 15, color: C.inkSoft, marginBottom: 4 }}>Digitou errado? Toque numa pesagem para corrigir ou apagar.</T>
          {[...list].reverse().map((w, i, arr) => {
          const prev = arr[i + 1];
          const d = prev ? w.kg - prev.kg : 0;
          return (
            <Pressable key={w.id} accessibilityRole="button" accessibilityLabel={`Editar pesagem de ${fmtBR(w.day)}, ${w.kg} quilos`} onPress={() => setEdit(w)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: C.line, opacity: pressed ? 0.7 : 1 })}>
              <T style={{ flex: 1, fontSize: 15, color: C.inkSoft }}>{fmtBR(w.day)}</T>
              <T v="xbold" style={{ fontSize: 16 }}>{`${String(w.kg).replace('.', ',')} kg`}</T>
              <T v="bold" style={{ width: 52, textAlign: 'right', fontSize: 15, color: d > 0 ? C.green : d < 0 ? C.amber : C.inkSoft }}>{prev ? `${d > 0 ? '+' : ''}${d.toFixed(1).replace('.', ',')}` : ''}</T>
              <Icon name="edit" size={17} color={C.inkSoft} />
            </Pressable>
          );
        })}</View>}
        {edit && <EditWeight w={edit} onClose={() => setEdit(null)} />}
      </View>
    </Page>
  );
}

function EditWeight({ w, onClose }: { w: WeightLog; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [kg, setKg] = useState(String(w.kg).replace('.', ','));
  const [day, setDay] = useState(fmtBR(w.day));
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState('');
  const mask = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 8); return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/'); };
  const save = async () => {
    const n = parseFloat(kg.replace(',', '.'));
    const dd = parseBR(day);
    if (!Number.isFinite(n) || n <= 0 || n > 150) return setErr('Digite um peso válido em kg (ex.: 3,5).');
    if (!dd || dd > today()) return setErr('Confira a data (DD/MM/AAAA), até hoje.');
    await useApp.getState().updateWeight(w.id, Math.round(n * 10) / 10, dd);
    onClose();
  };
  const input = { minHeight: 52, backgroundColor: 'rgba(255,255,255,0.6)', borderBottomWidth: 2, borderBottomColor: C.inkSoft, borderRadius: 10, paddingHorizontal: 14, fontFamily: F.monoBold, fontSize: 20, color: C.ink } as const;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(11,35,40,0.55)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={{ backgroundColor: C.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 24 + insets.bottom, gap: 12 }}>
          <T v="serif" style={{ fontSize: 24 }}>Corrigir pesagem</T>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}><T v="label">Peso (kg)</T><TextInput maxFontSizeMultiplier={1.15} value={kg} onChangeText={(v) => setKg(v.replace(/[^\d,.]/g, ''))} keyboardType="decimal-pad" accessibilityLabel="Peso corrigido" style={input} /></View>
            <View style={{ flex: 1.3, gap: 4 }}><T v="label">Data</T><TextInput maxFontSizeMultiplier={1.15} value={day} onChangeText={(v) => setDay(mask(v))} keyboardType="number-pad" placeholder="DD/MM/AAAA" placeholderTextColor={C.inkFaint} accessibilityLabel="Data da pesagem" style={[input, { fontSize: 17 }]} /></View>
          </View>
          {err ? <T v="bold" style={{ color: C.red }}>{err}</T> : null}
          <Button label="Salvar correção" icon="check" onPress={save} />
          {confirm ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Manter" variant="secondary" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
              <Button label="Apagar" variant="danger" onPress={async () => { await useApp.getState().deleteWeight(w.id); onClose(); }} style={{ flex: 1 }} />
            </View>
          ) : <Button label="Apagar esta pesagem" icon="trash" variant="ghost" onPress={() => setConfirm(true)} />}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
