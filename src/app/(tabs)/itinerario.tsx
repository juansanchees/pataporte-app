import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivePet, useApp } from '@/store/app';
import { T } from '@/components/ui';
import { HomeIcon, type HomeIconName } from '@/art/icons-home';
import { newReminderRoute } from '@/components/v11/home/routes';
import { agendaByMonth, type AgendaEvent, type AgendaFilter, type AgendaKind, type DueStatus } from '@/domain/today';
import { careWords } from '@/domain/catalog';
import { today } from '@/domain/dates';
import { art } from '@/domain/words';
import { C } from '@/theme';

/**
 * Aba Agenda (Aba-Agenda): lista por mês, estilo agenda do celular.
 * Cores com texto: ATRASADO (vermelho) · ESTE MÊS (âmbar) · EM DIA (verde).
 * Aceita ?filtro=vacinas|remedios (atalhos da Home).
 */
const FILTERS: { id: AgendaFilter; label: string }[] = [
  { id: 'tudo', label: 'Tudo' },
  { id: 'vacinas', label: 'Vacinas' },
  { id: 'remedios', label: 'Remédios' },
];

const STATUS: Record<DueStatus, { fg: string; bg: string; label: string }> = {
  atrasado: { fg: C.red, bg: C.redPale, label: 'ATRASADO' },
  este_mes: { fg: C.amber, bg: C.amberPale, label: 'ESTE MÊS' },
  em_dia: { fg: C.green, bg: C.greenPale, label: 'EM DIA' },
};

const KIND_ICON: Record<AgendaKind, HomeIconName> = {
  vacina: 'syringe', vermifugo: 'pill', antipulgas: 'shield', remedio: 'pill', exame: 'vet', consulta: 'vet', banho: 'bath', outro: 'agenda',
};

function StatusPill({ s }: { s: DueStatus }) {
  const st = STATUS[s];
  return (
    <View style={{ borderRadius: 999, backgroundColor: st.bg, paddingHorizontal: 9, paddingVertical: 4 }}>
      <T v="monoBold" numberOfLines={1} style={{ fontSize: 12, lineHeight: 16, letterSpacing: 1, color: st.fg }}>{st.label}</T>
    </View>
  );
}

export default function Agenda() {
  const pet = useActivePet();
  const data = useApp((s) => s.data);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ filtro?: string }>();
  // atalho da Home: /itinerario?filtro=vacinas. A escolha do usuário vale enquanto o atalho não mudar.
  const fromParam: AgendaFilter = params.filtro === 'vacinas' || params.filtro === 'remedios' ? params.filtro : 'tudo';
  const [picked, setPicked] = useState<{ f: AgendaFilter; param?: string } | null>(null);
  const filter: AgendaFilter = picked && picked.param === params.filtro ? picked.f : fromParam;
  const setFilter = (f: AgendaFilter) => setPicked({ f, param: params.filtro });
  const t = today();

  const groups = useMemo(() => (pet ? agendaByMonth({ data }, pet, t, filter) : []), [pet, data, t, filter]);
  if (!pet) return null;
  const a = art(pet);

  const open = (e: AgendaEvent) => {
    if (e.careId) router.push({ pathname: '/cuidado/[id]', params: { id: e.careId } });
  };
  const careOf = (e: AgendaEvent) => (e.careId ? data.cares.find((c) => c.id === e.careId) : undefined);

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <T v="serif" accessibilityRole="header" numberOfLines={2} style={{ fontSize: 32, lineHeight: 38 }}>{`Agenda ${a.do} ${pet.name}`}</T>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' }} accessibilityRole="tablist">
          {FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <Pressable key={f.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setFilter(f.id)}
                style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 18, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.cover : pressed ? C.paper2 : C.sheet, borderWidth: on ? 0 : 2, borderColor: C.line })}>
                <T v="xbold" style={{ fontSize: 16, color: on ? C.white : C.inkSoft }}>{f.label}</T>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }} accessibilityLabel="Legenda: vermelho atrasado, amarelo este mês, verde em dia">
          <StatusPill s="atrasado" /><StatusPill s="este_mes" /><StatusPill s="em_dia" />
        </View>

        {groups.length === 0 ? (
          <View style={{ marginTop: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: '#D9C9A6', borderRadius: 22, backgroundColor: 'rgba(251,246,234,0.7)', padding: 18, alignItems: 'center', gap: 8 }}>
            <HomeIcon name="agenda" size={34} color={C.inkSoft} />
            <T v="xbold" style={{ fontSize: 18, textAlign: 'center' }}>Nada marcado ainda</T>
            <T v="bold" style={{ fontSize: 16, lineHeight: 22, color: C.inkSoft, textAlign: 'center' }}>
              {filter === 'remedios' ? `Os remédios ${a.do} ${pet.name} aparecem aqui.` : `Coloque as vacinas ${a.do} ${pet.name} e o app avisa quando for a hora.`}
            </T>
            <Pressable accessibilityRole="button" onPress={() => router.push(filter === 'remedios' ? (newReminderRoute('remedio') as never) : '/novo-cuidado')}
              style={({ pressed }) => ({ marginTop: 6, minHeight: 52, borderRadius: 26, backgroundColor: pressed ? C.coverDark : C.cover, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 8 })}>
              <HomeIcon name="plus" size={18} color={C.white} sw={2.6} />
              <T v="xbold" style={{ fontSize: 17, color: C.white }}>{filter === 'remedios' ? 'Adicionar remédio' : 'Adicionar vacina'}</T>
            </Pressable>
          </View>
        ) : (
          <View style={{ marginTop: 6 }}>
            {groups.map((g) => (
              <View key={g.id}>
                <T v="monoBold" accessibilityRole="header" style={{ fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: g.id === 'atrasados' ? C.red : C.inkSoft, paddingTop: 12, paddingBottom: 2 }}>{g.title}</T>
                {g.events.map((e) => {
                  const care = careOf(e);
                  // marcar como tomada: só na próxima dose prevista, se estiver atrasada ou for deste mês
                  const canMark = !!care && care.nextDate === e.day && e.status !== 'em_dia';
                  const st = STATUS[e.status];
                  return (
                    // linha e botão "Já tomou" são irmãos: botão dentro de botão é inválido na web e atrapalha o leitor de tela
                    <View key={e.key} style={{ borderBottomWidth: 1, borderColor: C.paper3 }}>
                    <Pressable accessibilityRole={e.careId ? 'button' : 'text'} disabled={!e.careId} onPress={() => open(e)}
                      accessibilityLabel={`${e.dayNum}, ${e.weekday}: ${e.title}. ${e.sub}. ${e.statusLabel}`}
                      style={({ pressed }) => ({ minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: pressed ? 'rgba(239,227,200,0.6)' : 'transparent', paddingVertical: 8 })}>
                      <View style={{ width: 52, alignItems: 'center' }}>
                        <T v="serif" style={{ fontSize: 26, lineHeight: 30 }}>{e.dayNum}</T>
                        <T v="mono" style={{ fontSize: 13, color: C.inkSoft }}>{e.weekday}</T>
                      </View>
                      <View style={{ width: 4, alignSelf: 'stretch', marginVertical: 6, borderRadius: 2, backgroundColor: st.fg }} />
                      <HomeIcon name={KIND_ICON[e.kind]} size={22} color={C.cover} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T v="xbold" numberOfLines={2} style={{ fontSize: 18, lineHeight: 23 }}>{e.title}</T>
                        <T numberOfLines={1} style={{ fontSize: 16, color: C.inkSoft }}>{e.sub}</T>
                      </View>
                      <StatusPill s={e.status} />
                    </Pressable>
                    {canMark && care ? (
                      <Pressable accessibilityRole="button" accessibilityLabel={`${careWords(care.category).done}: ${care.name}`} onPress={() => useApp.getState().askStamp(care.id)} hitSlop={6}
                        style={({ pressed }) => ({ alignSelf: 'flex-start', marginLeft: 108, marginTop: -8, marginBottom: 10, minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: pressed ? C.coverDark : C.cover, flexDirection: 'row', alignItems: 'center', gap: 6 })}>
                        <HomeIcon name="check" size={16} color={C.white} sw={3} />
                        <T v="xbold" style={{ fontSize: 16, color: C.white }}>{careWords(care.category).done}</T>
                      </Pressable>
                    ) : null}
                    </View>
                  );
                })}
              </View>
            ))}
            <Pressable accessibilityRole="button" onPress={() => router.push('/novo-cuidado')}
              style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
              <HomeIcon name="syringe" size={20} color={C.cover} />
              <T v="bold" style={{ fontSize: 16, color: C.cover }}>Adicionar vacina ou cuidado</T>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Pressable accessibilityRole="button" accessibilityLabel="Novo lembrete" onPress={() => router.push(newReminderRoute() as never)}
        style={({ pressed }) => ({ position: 'absolute', right: 20, bottom: 16, width: 64, height: 64, borderRadius: 32, backgroundColor: pressed ? C.coverDark : C.cover, alignItems: 'center', justifyContent: 'center', shadowColor: C.coverDark, shadowOpacity: 0.35, shadowRadius: 7, shadowOffset: { width: 0, height: 6 }, elevation: 6 })}>
        <HomeIcon name="plus" size={28} color={C.white} sw={2.5} />
      </Pressable>
    </View>
  );
}
