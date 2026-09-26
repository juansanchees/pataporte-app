import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg from 'react-native-svg';
import { useActivePet, useApp } from '@/store/app';
import { MoodTag, Page, PetAvatar, PetPhoto } from '@/components/passport';
import { DUTY_ITEMS } from '@/domain/commerce';
import { careWords } from '@/domain/catalog';
import { Button, IconButton, T } from '@/components/ui';
import { GuillocheG, Leather, Emblem } from '@/art/patterns';
import { Icon, type IconName } from '@/art/Icon';
import { careStatus } from '@/domain/itinerary';
import { levelFor, milesTotals, moodFor, nextLevel } from '@/domain/gamification';
import { weightTrend, fmtKg } from '@/domain/diary';
import { greeting, ROUTINE_ICON, routineItems, routineOf, routineProgress, routineSections, type RoutineItem } from '@/domain/routine';
import { tipOfDay } from '@/domain/breeds';
import { diffDays, fmtBR, fmtShort, today } from '@/domain/dates';
import type { Routine } from '@/domain/types';
import { C, F } from '@/theme';
import { art } from '@/domain/words';

const DUTY_NAME: Record<string, string> = Object.fromEntries(DUTY_ITEMS.map((d) => [d.id, d.name]));

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function Inicio() {
  const pet = useActivePet();
  const data = useApp((s) => s.data);
  const user = useApp((s) => s.profile?.name ?? '');
  const { width } = useWindowDimensions();
  const [walk, setWalk] = useState<RoutineItem | null>(null);
  const [editRoutine, setEditRoutine] = useState(false);
  const [showPassed, setShowPassed] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 60000); return () => clearInterval(i); }, []);
  const t = today();

  const view = useMemo(() => {
    if (!pet) return null;
    const { total } = milesTotals(data.ledger);
    const items = routineItems(pet, data.ledger, t);
    const upcoming = data.cares.filter((c) => c.active && c.nextDate && careStatus(c, t) !== 'atrasado').sort((a, b) => a.nextDate!.localeCompare(b.nextDate!));
    return {
      mood: moodFor(data.cares, t),
      total, lv: levelFor(total), nx: nextLevel(total),
      items, progress: routineProgress(items),
      overdue: data.cares.filter((c) => careStatus(c, t) === 'atrasado'),
      nextCare: upcoming.find((c) => c.category === 'vacina') ?? upcoming[0],
      weight: weightTrend(data.weights, t),
      tip: tipOfDay(pet, t),
      lastDiary: [...data.diary].sort((a, b) => b.day.localeCompare(a.day) || b.id.localeCompare(a.id))[0],
    };
  }, [pet, data, t]);
  if (!pet || !view) return <Redirect href="/" />;

  const now = nowHHMM();
  const sec = routineSections(view.items, now);
  const a = art(pet);
  const focus = sec.next ?? sec.anytime[0] ?? null;
  const bubble = view.overdue.length
    ? `${view.overdue[0].name} está em atraso. Me leva ao veterinário?`
    : view.progress.complete ? 'Dia perfeito! Obrigado por cuidar de mim.'
      : !focus ? 'Que dia tranquilo!'
        : focus.kind === 'racao' ? (focus.time && focus.time <= now ? 'Tá na hora da minha comida!' : `Minha próxima refeição é às ${focus.time}.`)
          : focus.kind === 'passeio' ? (focus.time && focus.time <= now ? 'Bora passear?' : `Meu passeio é às ${focus.time}.`)
            : focus.kind === 'brincar' ? 'Brinca comigo um pouquinho?'
              : focus.kind === 'agua' ? 'Troca minha água, por favor?'
                : focus.kind === 'remedio' ? 'Não esquece meu remédio!'
                  : focus.kind === 'caixa' ? 'Minha caixinha precisa de uma limpeza.'
                    : 'Bora escovar os dentes?';

  const tap = (it: RoutineItem) => {
    if (it.done) return useApp.getState().uncheckRoutine(it.key);
    if (it.kind === 'passeio') return setWalk(it);
    useApp.getState().checkRoutine(it);
  };

  const cardW = width - 48;
  const tiles: [string, string, IconName, string][] = [
    ['Peso', view.weight ? fmtKg(view.weight.last) : 'Registrar', 'scale', '/peso'],
    ['Diário', view.lastDiary ? `Último: ${fmtShort(view.lastDiary.day)}` : 'Escrever', 'paw', '/diario'],
    ['Vou viajar', 'O que precisa', 'suitcase', '/viagem'],
    ['Para o vet', 'Resumo da saúde', 'doc', '/dossie'],
    ['Saúde da raça', 'O que prevenir', 'shield', '/raca'],
    ['Loja de milhas', 'Prêmios do avatar', 'bag', '/duty-free'],
  ];
  const pct = view.nx ? Math.round(((view.total - view.lv.min) / (view.nx.min - view.lv.min)) * 100) : 100;

  const Row = ({ it, faded }: { it: RoutineItem; faded?: boolean }) => (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: it.done }} accessibilityLabel={`${it.title}${it.time ? ` às ${it.time}` : ''}`} onPress={() => tap(it)}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, minHeight: 68, borderTopWidth: 1, borderColor: C.line, backgroundColor: pressed ? C.paper2 : 'transparent', opacity: faded ? 0.75 : 1 })}>
      <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2.5, borderColor: it.done ? C.green : C.inkSoft, backgroundColor: it.done ? C.green : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        {it.done ? <Icon name="check" size={18} color="#fff" sw={3} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <T v="bold" style={{ fontSize: 17, color: it.done ? C.inkSoft : C.ink, textDecorationLine: it.done ? 'line-through' : 'none' }}>{it.title}</T>
        {!it.done ? <T style={{ fontSize: 15, color: C.inkSoft }} numberOfLines={1}>{it.sub}</T> : null}
      </View>
      {it.time ? <T v="xbold" style={{ fontSize: 17, color: C.inkSoft }}>{it.time}</T> : null}
    </Pressable>
  );
  const Fold = ({ open, onPress, label, tone }: { open: boolean; onPress: () => void; label: string; tone?: string }) => (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 16, borderTopWidth: 1, borderColor: C.line }}>
      <T v="bold" style={{ flex: 1, fontSize: 16, color: tone ?? C.inkSoft }}>{label}</T>
      <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}><Icon name="chevron" size={18} color={tone ?? C.inkSoft} sw={2.4} /></View>
    </Pressable>
  );

  return (
    <Page seed={14}
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 10 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Trocar de passaporte" onPress={() => router.push('/passaportes')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minHeight: 48 }}>
            <View style={{ width: 34, height: 44, borderRadius: 5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}><Leather w={34} h={44} color={pet.coverColor} radius={5} /><Emblem size={24} bg={pet.coverColor} /></View>
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 15, color: C.inkSoft }} numberOfLines={1}>{`${greeting(new Date().getHours())}${user ? `, ${user.split(' ')[0]}` : ''}!`}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><T v="xbold" style={{ fontSize: 19 }}>{pet.name}</T><Icon name="chevron" size={15} sw={2.4} /></View>
            </View>
          </Pressable>
          <IconButton icon="gear" label="Ajustes" onPress={() => router.push('/ajustes')} />
          <IconButton icon="heart" label="Emergência SOS" tone="red" onPress={() => router.push('/sos')} />
        </View>
      }>
      <View style={{ gap: 18 }}>
        {/* --------------------------------------------------- pet + fala + nível */}
        <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 16, gap: 14, overflow: 'hidden' }}>
          <Svg width={cardW} height={170} style={{ position: 'absolute' }} pointerEvents="none">
            <GuillocheG w={cardW} y0={10} band={110} n={10} seed={41} color={C.purple} opacity={0.1} />
          </Svg>
          <Pressable accessibilityRole="button" accessibilityLabel={`Página de identificação ${a.do} ${pet.name}`} onPress={() => router.push('/perfil')} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <View>
              <PetPhoto pet={pet} mood={view.mood} w={104} h={128} photo />
              {pet.photoUri ? (
                <View style={{ position: 'absolute', right: -8, bottom: -8, width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', borderWidth: 2, borderColor: C.line, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <PetAvatar pet={pet} mood={view.mood} size={52} />
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, borderBottomLeftRadius: 4, padding: 12, borderWidth: 1, borderColor: C.line }}>
                <T v="bold" style={{ fontSize: 16.5, lineHeight: 22 }}>{`“${bubble}”`}</T>
              </View>
              <MoodTag mood={view.mood} />
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Milhas e níveis" onPress={() => router.push('/mapa')} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <T v="xbold" style={{ fontSize: 17, color: C.purpleInk, flex: 1 }}>{`Nível ${view.lv.n} · ${view.lv.name}`}</T>
              <T v="xbold" style={{ fontSize: 17 }}>{`${view.total} milhas`}</T>
            </View>
            <View style={{ height: 12, borderRadius: 6, backgroundColor: C.paper3 }}>
              <View style={{ height: 12, borderRadius: 6, width: `${Math.max(3, pct)}%`, backgroundColor: C.purpleInk }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <T style={{ flex: 1, fontSize: 15.5, color: C.inkSoft }}>{view.nx ? `Faltam ${view.nx.min - view.total}${view.nx.reward && DUTY_NAME[view.nx.reward] ? ` · prêmio: ${DUTY_NAME[view.nx.reward]}` : ' para o próximo nível'}` : 'Nível máximo!'}</T>
              <T v="bold" style={{ fontSize: 15.5, color: C.cover }}>Como ganhar ›</T>
            </View>
          </Pressable>
        </View>

        {/* --------------------------------------------------- atrasados (um card só) */}
        {view.overdue.length === 1 ? (() => {
          const c = view.overdue[0];
          const late = -diffDays(t, c.nextDate!);
          return (
            <View style={{ backgroundColor: C.redPale, borderRadius: 16, padding: 16, borderWidth: 2, borderColor: C.red, gap: 12 }}>
              <Pressable onPress={() => router.push({ pathname: '/cuidado/[id]', params: { id: c.id } })} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Icon name="bell" size={26} color={C.red} />
                <View style={{ flex: 1 }}>
                  <T v="xbold" style={{ fontSize: 18, color: C.red }}>{`Em atraso: ${c.name}`}</T>
                  <T style={{ fontSize: 15.5 }}>{`Era para ${fmtBR(c.nextDate!)} (há ${late} ${late === 1 ? 'dia' : 'dias'})`}</T>
                </View>
              </Pressable>
              <Button label={careWords(c.category).done} icon="check" onPress={() => useApp.getState().askStamp(c.id)} style={{ backgroundColor: C.red, minHeight: 50 }} />
            </View>
          );
        })() : view.overdue.length > 1 ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/itinerario')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.redPale, borderRadius: 16, padding: 16, borderWidth: 2, borderColor: C.red }}>
            <Icon name="bell" size={26} color={C.red} />
            <View style={{ flex: 1 }}>
              <T v="xbold" style={{ fontSize: 18, color: C.red }}>{`${view.overdue.length} cuidados em atraso`}</T>
              <T style={{ fontSize: 15.5 }} numberOfLines={2}>{view.overdue.map((c) => c.name).join(', ')}</T>
            </View>
            <Icon name="chevron" size={20} color={C.red} sw={2.4} />
          </Pressable>
        ) : null}

        {/* --------------------------------------------------- agora */}
        <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 18, overflow: 'hidden' }}>
          <View style={{ padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <T v="serif" style={{ flex: 1, fontSize: 24 }}>Hoje</T>
              <T v="xbold" style={{ fontSize: 17, color: view.progress.complete ? C.green : C.inkSoft }}>{`${view.progress.done} de ${view.progress.total} feitos`}</T>
            </View>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: C.paper3 }}>
              <View style={{ height: 10, borderRadius: 5, backgroundColor: C.green, width: `${view.progress.total ? Math.round((view.progress.done / view.progress.total) * 100) : 0}%` }} />
            </View>
          </View>

          {focus ? (
            <View style={{ marginHorizontal: 12, marginBottom: 14, borderRadius: 16, backgroundColor: C.cover, padding: 16, gap: 12 }}>
              <T v="bold" style={{ fontSize: 15, color: C.goldLight }}>{focus.time ? (focus.time <= now ? 'AGORA' : `PRÓXIMO · ${focus.time}`) : 'QUALQUER HORA DO DIA'}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.goldPale, alignItems: 'center', justifyContent: 'center' }}><Icon name={ROUTINE_ICON[focus.kind]} size={30} color={C.cover} /></View>
                <View style={{ flex: 1 }}>
                  <T v="xbold" style={{ fontSize: 21, color: C.goldPale }}>{focus.title}</T>
                  <T style={{ fontSize: 16, color: C.goldLight }}>{focus.sub}</T>
                </View>
              </View>
              <Pressable accessibilityRole="button" onPress={() => tap(focus)} style={({ pressed }) => ({ minHeight: 58, borderRadius: 14, backgroundColor: pressed ? C.goldLight : C.goldPale, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 })}>
                <Icon name="check" size={22} color={C.cover} sw={3} />
                <T v="xbold" style={{ fontSize: 18, color: C.cover }}>{focus.kind === 'passeio' ? 'Já passeamos' : focus.kind === 'racao' ? 'Já dei a comida' : 'Feito'}</T>
              </Pressable>
            </View>
          ) : view.progress.complete ? (
            <Pressable onPress={() => router.push('/diario')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.greenPale, marginHorizontal: 12, marginBottom: 14, borderRadius: 16, padding: 16 }}>
              <Icon name="trophy" size={28} color={C.green} />
              <T v="bold" style={{ flex: 1, fontSize: 17, color: C.green }}>Tudo feito hoje! Já anotamos no diário.</T>
            </Pressable>
          ) : (
            <T style={{ fontSize: 16.5, color: C.inkSoft, paddingHorizontal: 16, paddingBottom: 14 }}>Nada para agora. Aproveite!</T>
          )}

          {sec.later.length || sec.anytime.filter((x) => x !== focus).length ? (
            <T v="bold" style={{ fontSize: 15, color: C.inkSoft, paddingHorizontal: 16, paddingBottom: 6 }}>DEPOIS</T>
          ) : null}
          {sec.later.filter((x) => x !== focus).map((it) => <Row key={it.key} it={it} />)}
          {sec.anytime.filter((x) => x !== focus).map((it) => <Row key={it.key} it={it} />)}
          {sec.passed.length ? <Fold open={showPassed} onPress={() => setShowPassed(!showPassed)} tone={C.coralInk} label={`Já passou do horário (${sec.passed.length}) · marcar se fez`} /> : null}
          {showPassed && sec.passed.map((it) => <Row key={it.key} it={it} faded />)}
          {sec.done.length ? <Fold open={showDone} onPress={() => setShowDone(!showDone)} tone={C.green} label={`Feitos hoje (${sec.done.length})`} /> : null}
          {showDone && sec.done.map((it) => <Row key={it.key} it={it} />)}
          <Pressable accessibilityRole="button" onPress={() => setEditRoutine(true)} style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, minHeight: 54, borderTopWidth: 1, borderColor: C.line }}>
            <Icon name="edit" size={18} color={C.cover} /><T v="bold" style={{ fontSize: 16, color: C.cover }}>Mudar horários</T>
          </Pressable>
        </View>

        {/* --------------------------------------------------- próximo cuidado */}
        {view.nextCare ? (() => {
          const c = view.nextCare;
          const n = diffDays(t, c.nextDate!);
          return (
            <Pressable accessibilityRole="button" onPress={() => router.push('/itinerario')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: C.cover, alignItems: 'center', justifyContent: 'center' }}>
                <T v="serif" style={{ fontSize: 26, lineHeight: 28, color: C.goldPale }}>{n}</T>
                <T v="bold" style={{ fontSize: 14.5, color: C.goldLight }}>{n === 1 ? 'dia' : 'dias'}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T v="bold" style={{ color: C.inkSoft, fontSize: 15 }}>{c.category === 'vacina' ? 'Próxima vacina' : 'Próximo cuidado'}</T>
                <T v="xbold" style={{ fontSize: 18 }} numberOfLines={2}>{c.name}</T>
                <T style={{ fontSize: 15.5, color: C.inkSoft }}>{fmtBR(c.nextDate!)}</T>
              </View>
              <Icon name="chevron" size={20} color={C.inkSoft} sw={2.4} />
            </Pressable>
          );
        })() : null}

        {/* --------------------------------------------------- atalhos */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {tiles.map(([label, sub, icon, href]) => (
            <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push(href as never)}
              style={({ pressed }) => ({ width: (cardW - 12) / 2, minHeight: 112, gap: 6, backgroundColor: pressed ? C.paper2 : C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 16 })}>
              <Icon name={icon} size={30} color={C.cover} />
              <T v="xbold" style={{ fontSize: 17 }}>{label}</T>
              <T style={{ fontSize: 15, color: C.inkSoft }} numberOfLines={1}>{sub}</T>
            </Pressable>
          ))}
        </View>

        {/* --------------------------------------------------- dica */}
        {view.tip ? (
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/guia', params: { q: view.tip!.risk.question } })}
            style={{ backgroundColor: C.yellowCard, borderWidth: 1, borderColor: C.yellowLine, borderRadius: 18, padding: 16, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="sparkle" size={22} color={C.goldDark} />
              <T v="xbold" style={{ flex: 1, fontSize: 16, color: C.goldDark }}>Dica do dia</T>
            </View>
            <T v="bold" style={{ fontSize: 17, lineHeight: 24 }}>{view.tip.tip}</T>
            <T v="bold" style={{ fontSize: 15.5, color: C.cover }}>Perguntar ao Guia ›</T>
          </Pressable>
        ) : null}
      </View>

      <WalkSheet item={walk} petName={`${a.do} ${pet.name}`} onClose={() => setWalk(null)} />
      {editRoutine && <RoutineEditor routine={routineOf(pet)} species={pet.species} onClose={() => setEditRoutine(false)} />}
    </Page>
  );
}

function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(11,35,40,0.55)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={{ backgroundColor: C.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 24 + insets.bottom, gap: 12 }}>{children}</View>
      </View>
    </Modal>
  );
}

function WalkSheet({ item, petName, onClose }: { item: RoutineItem | null; petName: string; onClose: () => void }) {
  const opts = ['15 min', '30 min', '1 hora', 'Mais de 1 hora'];
  return (
    <Sheet visible={!!item} onClose={onClose}>
      <T v="serif" style={{ fontSize: 24 }}>{`Quanto tempo durou o passeio ${petName}?`}</T>
      <T style={{ fontSize: 14.5, color: C.inkSoft }}>Fica registrado no diário de vida.</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {opts.map((o) => (
          <Pressable key={o} accessibilityRole="button" onPress={async () => { const it = item; onClose(); if (it) await useApp.getState().checkRoutine(it, o); }}
            style={{ width: '48%', flexGrow: 1, minHeight: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cover }}>
            <T v="bold" style={{ fontSize: 16, color: C.goldPale }}>{o}</T>
          </Pressable>
        ))}
      </View>
      <Button label="Cancelar" variant="ghost" onPress={onClose} />
    </Sheet>
  );
}

function RoutineEditor({ routine, species, onClose }: { routine: Routine; species: 'dog' | 'cat'; onClose: () => void }) {
  const [r, setR] = useState<Routine>(routine);
  const [newWalk, setNewWalk] = useState('');
  const fix = (v: string) => {
    const m = v.trim().match(/^(\d{1,2})(?::?(\d{2}))?$/);
    if (!m) return null;
    const h = Number(m[1]); const mi = Number(m[2] ?? '0');
    return h <= 23 && mi <= 59 ? `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` : null;
  };
  const addWalk = () => {
    const t = fix(newWalk);
    if (!t) { useApp.getState().showToast('Horário inválido. Use o formato 17:30.'); return; }
    if (!r.walkTimes.includes(t)) setR({ ...r, walkTimes: [...r.walkTimes, t].sort() });
    setNewWalk('');
  };
  const Toggle = ({ on, label, sub, onPress }: { on: boolean; label: string; sub: string; onPress: () => void }) => (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}>
      <View style={{ flex: 1 }}><T v="bold" style={{ fontSize: 15.5 }}>{label}</T><T style={{ fontSize: 14.5, color: C.inkSoft }}>{sub}</T></View>
      <View style={{ width: 50, height: 30, borderRadius: 15, backgroundColor: on ? C.cover : C.paper3, padding: 3, alignItems: on ? 'flex-end' : 'flex-start' }}><View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' }} /></View>
    </Pressable>
  );
  return (
    <Sheet visible onClose={onClose}>
      <T v="serif" style={{ fontSize: 24 }}>Rotina diária</T>
      <T style={{ fontSize: 14, color: C.inkSoft }}>Os horários da ração ficam na ficha de saúde. Aqui você ajusta o resto.</T>
      <View>
        <T v="bold" style={{ fontSize: 15.5, marginBottom: 6 }}>Passeios</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {r.walkTimes.map((w) => (
            <Pressable key={w} accessibilityRole="button" accessibilityLabel={`Remover passeio das ${w}`} onPress={() => setR({ ...r, walkTimes: r.walkTimes.filter((x) => x !== w) })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.cover, borderRadius: 10, paddingHorizontal: 12, minHeight: 42 }}>
              <T v="monoBold" style={{ color: C.goldPale, fontSize: 14 }}>{w}</T><Icon name="close" size={14} color={C.goldPale} sw={2.4} />
            </Pressable>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.inkFaint, borderRadius: 10, paddingLeft: 10 }}>
            <TextInput maxFontSizeMultiplier={1.15} value={newWalk} onChangeText={setNewWalk} placeholder="17:30" placeholderTextColor={C.inkFaint} keyboardType="numbers-and-punctuation" onSubmitEditing={addWalk} accessibilityLabel="Novo horário de passeio"
              style={{ width: 60, minHeight: 42, fontFamily: F.monoBold, fontSize: 14, color: C.ink }} />
            <Pressable accessibilityRole="button" accessibilityLabel="Adicionar passeio" onPress={addWalk} style={{ width: 40, height: 42, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={16} color={C.inkSoft} sw={2.4} /></Pressable>
          </View>
        </View>
        {species === 'cat' && !r.walkTimes.length ? <T style={{ fontSize: 14.5, color: C.inkSoft, marginTop: 4 }}>Gatos normalmente não passeiam. Adicione se o seu passeia na guia.</T> : null}
      </View>
      <Toggle on={!!r.playTime} label="Hora de brincar" sub={r.playTime ? `Todo dia às ${r.playTime}` : 'Desligado'} onPress={() => setR({ ...r, playTime: r.playTime ? null : '20:00' })} />
      <Toggle on={r.water} label="Trocar a água" sub="Uma vez por dia" onPress={() => setR({ ...r, water: !r.water })} />
      <Toggle on={r.teeth} label="Escovar os dentes" sub="Previne tártaro" onPress={() => setR({ ...r, teeth: !r.teeth })} />
      {species === 'cat' && <Toggle on={r.litter} label="Limpar a caixa de areia" sub="Todo dia" onPress={() => setR({ ...r, litter: !r.litter })} />}
      <Button label="Salvar rotina" icon="check" onPress={async () => { await useApp.getState().setRoutine(r); onClose(); }} />
    </Sheet>
  );
}
