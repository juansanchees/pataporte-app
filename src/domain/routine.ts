import { foodLabel, gramsPerMeal } from './catalog';
import type { LedgerEntry, Pet, Routine, Species } from './types';

/** Rotina do dia: refeições + água + passeios + brincadeira + (dentes, caixa de areia, remédio). */

export function defaultRoutine(species: Species): Routine {
  return species === 'dog'
    ? { walkTimes: ['08:00', '18:00'], playTime: '20:00', water: true, teeth: false, litter: false }
    : { walkTimes: [], playTime: '20:00', water: true, teeth: false, litter: true };
}

export function routineOf(pet: Pet): Routine {
  return pet.routine ?? defaultRoutine(pet.species);
}

export type RoutineKind = 'racao' | 'agua' | 'passeio' | 'brincar' | 'dentes' | 'caixa' | 'remedio';

export interface RoutineItem {
  key: string; // único no dia (ex.: "racao-07:00", "passeio-18:00")
  kind: RoutineKind;
  time: string | null;
  title: string;
  sub: string;
  done: boolean;
  miles: number;
}

export const ROUTINE_ICON: Record<RoutineKind, 'bowl' | 'drop' | 'map' | 'star' | 'sparkle' | 'paw' | 'heart'> = {
  racao: 'bowl', agua: 'drop', passeio: 'map', brincar: 'star', dentes: 'sparkle', caixa: 'paw', remedio: 'heart',
};

export function routineItems(pet: Pet, ledger: LedgerEntry[], today: string): RoutineItem[] {
  const r = routineOf(pet);
  const todays = ledger.filter((e) => e.day === today && e.miles >= 0);
  const done = (key: string) => todays.some((e) => (e.origin === 'rotina' || e.origin === 'passeio' || e.origin === 'racao') && (e.ref === key || (e.origin === 'racao' && `racao-${e.ref}` === key)));
  const g = gramsPerMeal(pet);
  const items: RoutineItem[] = [];
  pet.mealTimes.forEach((t, i) => items.push({
    key: `racao-${t}`, kind: 'racao', time: t,
    title: pet.mealTimes.length > 1 ? `${i + 1}ª refeição` : 'Refeição do dia',
    sub: g ? `Servir ${g} g · ${foodLabel(pet.food).toLowerCase()}` : foodLabel(pet.food),
    done: false, miles: 2,
  }));
  if (r.water) items.push({ key: 'agua', kind: 'agua', time: null, title: 'Trocar a água', sub: 'Água fresca e pote limpo', done: false, miles: 2 });
  r.walkTimes.forEach((t, i) => items.push({ key: `passeio-${t}`, kind: 'passeio', time: t, title: r.walkTimes.length > 1 ? `Passeio ${t < '12:00' ? 'da manhã' : t < '19:00' ? 'da tarde' : 'da noite'}${r.walkTimes.filter((x) => (x < '12:00') === (t < '12:00') && (x < '19:00') === (t < '19:00')).length > 1 ? ` (${t})` : ''}` : 'Passeio', sub: 'Toque quando voltar', done: false, miles: 2 }));
  if (r.playTime) items.push({ key: 'brincar', kind: 'brincar', time: r.playTime, title: 'Hora de brincar', sub: 'Pelo menos 15 minutos de brincadeira', done: false, miles: 2 });
  if (r.litter) items.push({ key: 'caixa', kind: 'caixa', time: null, title: 'Limpar a caixa de areia', sub: 'Tirar os torrões e completar a areia', done: false, miles: 2 });
  if (r.teeth) items.push({ key: 'dentes', kind: 'dentes', time: null, title: 'Escovar os dentes', sub: 'Pasta de pet, 1 a 2 minutos', done: false, miles: 2 });
  if (pet.meds.trim()) items.push({ key: 'remedio', kind: 'remedio', time: null, title: 'Dar o remédio', sub: pet.meds.trim(), done: false, miles: 2 });
  let withDone = items.map((it) => ({ ...it, done: done(it.key) }));
  // 1º dia: o que já tinha passado antes de criar o passaporte não entra (ninguém começa "devendo")
  const start = issuedLocal(pet.issuedAt);
  if (start && start.day === today) withDone = withDone.filter((it) => it.done || !it.time || it.time >= start.hhmm);
  return withDone.sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'));
}

export function routineProgress(items: RoutineItem[]) {
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length, complete: items.length > 0 && done === items.length };
}

function issuedLocal(iso: string | undefined): { day: string; hhmm: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, '0');
  return { day: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, hhmm: `${p(d.getHours())}:${p(d.getMinutes())}` };
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
/** Quanto tempo um horário continua "agora" depois que passa. */
export const NOW_WINDOW_MIN = 90;

/**
 * Organiza a rotina pelo relógio: o que fazer AGORA, mais tarde, a qualquer hora,
 * o que já passou (sem marcar) e o que já foi feito.
 */
export function routineSections(items: RoutineItem[], nowHHMM: string) {
  const now = toMin(nowHHMM);
  const pend = items.filter((i) => !i.done);
  const timed = pend.filter((i) => i.time);
  const passed = timed.filter((i) => toMin(i.time!) < now - NOW_WINDOW_MIN);
  const upcoming = timed.filter((i) => toMin(i.time!) >= now - NOW_WINDOW_MIN);
  const anytime = pend.filter((i) => !i.time);
  const next = upcoming[0] ?? null;
  return { next, later: upcoming.slice(1), anytime, passed, done: items.filter((i) => i.done) };
}

/** Próxima tarefa pendente, considerando o horário atual (para a "fala" do pet). */
export function nextPending(items: RoutineItem[], nowHHMM: string): RoutineItem | null {
  const s = routineSections(items, nowHHMM);
  return s.next ?? s.anytime[0] ?? null;
}

export function greeting(hour: number): string {
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
}

/** Texto para o diário quando a rotina do dia fica completa. */
export function dayRecap(items: RoutineItem[]): string {
  const meals = items.filter((i) => i.kind === 'racao').length;
  const walks = items.filter((i) => i.kind === 'passeio').length;
  const parts = [`comeu ${meals}x`];
  if (walks) parts.push(`${walks} ${walks === 1 ? 'passeio' : 'passeios'}`);
  if (items.some((i) => i.kind === 'brincar')) parts.push('brincou');
  if (items.some((i) => i.kind === 'agua')) parts.push('água trocada');
  if (items.some((i) => i.kind === 'remedio')) parts.push('tomou o remédio');
  if (items.some((i) => i.kind === 'dentes')) parts.push('dentes escovados');
  if (items.some((i) => i.kind === 'caixa')) parts.push('caixa limpa');
  return `Rotina completa: ${parts.join(', ')}.`;
}
