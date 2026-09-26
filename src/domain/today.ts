import { addDays, addMonths, atTime, diffDays, fmtDayMonth, fromDay, hhmmOf, monthTitle, toDay, weekdayMini } from './dates';
import { careStatus, projected, recurrenceLabel } from './itinerary';
import { doseKey, doseStatus, dosesForDay, lateLabel, type DoseNow } from './meds';
import { careDurationMonths, durationLabel } from './parasites';
import { routineItems, NOW_WINDOW_MIN, type RoutineItem } from './routine';
import type { Care, DoseLog, Pet, PetData, Reminder, ReminderType } from './types';

/**
 * v1.1 — Home ("Hoje", cartão AGORA, anel "2 de 5", Próxima vacina) e aba Agenda.
 * Funções puras: recebem os dados do pet e o relógio.
 */

// ------------------------------------------------------------------ lembretes (não-remédio)
export const REMINDER_TYPES: { type: ReminderType; label: string }[] = [
  { type: 'remedio', label: 'Remédio' },
  { type: 'passeio', label: 'Passeio' },
  { type: 'banho', label: 'Banho e tosa' },
  { type: 'consulta', label: 'Consulta' },
  { type: 'comida', label: 'Comida' },
  { type: 'outro', label: 'Outro' },
];

export function reminderTypeLabel(t: ReminderType): string {
  return REMINDER_TYPES.find((x) => x.type === t)?.label ?? 'Lembrete';
}

/** O lembrete (não-remédio) acontece neste dia? */
export function occursOn(r: Reminder, day: string): boolean {
  if (!r.active || day < r.date) return false;
  switch (r.repeat) {
    case 'once': return day === r.date;
    case 'daily': return true;
    case 'weekly': return diffDays(r.date, day) % 7 === 0;
    case 'monthly': {
      const a = fromDay(r.date); const b = fromDay(day);
      const last = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate();
      return b.getDate() === Math.min(a.getDate(), last);
    }
    case 'yearly': { const a = fromDay(r.date); const b = fromDay(day); return a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
    default: return false;
  }
}

/** Próximas ocorrências (até `count`) a partir de `from` (inclusive), olhando no máximo `horizonDays`. */
export function nextOccurrences(r: Reminder, from: string, count = 3, horizonDays = 400): string[] {
  const out: string[] = [];
  if (r.repeat === 'once') return r.date >= from && r.active ? [r.date] : [];
  for (let i = 0, d = from < r.date ? r.date : from; i < horizonDays && out.length < count; i++, d = addDays(d, 1)) if (occursOn(r, d)) out.push(d);
  return out;
}

// ------------------------------------------------------------------ Hoje
export type TodayKind = 'comida' | 'passeio' | 'remedio' | 'lembrete';
export type TodayStatus = 'feito' | 'pulado' | 'atrasado' | 'agora' | 'pendente';

export type TodaySource =
  | { type: 'routine'; item: RoutineItem }
  | { type: 'dose'; reminderId: string; day: string; time: string; at: string }
  | { type: 'reminder'; reminderId: string; day: string; time: string };

export interface TodayItem {
  /** único no dia */
  key: string;
  kind: TodayKind;
  /** tipo do lembrete (banho, consulta…) quando kind = 'lembrete' */
  reminderType?: ReminderType;
  time: string | null;
  title: string;
  sub: string;
  done: boolean;
  status: TodayStatus;
  /** minutos de atraso (status 'atrasado') */
  minutesLate?: number;
  source: TodaySource;
}

export interface TodayState {
  data: Pick<PetData, 'ledger' | 'cares'> & Partial<Pick<PetData, 'reminders' | 'doses'>>;
}

const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
/** Item com horário passa a "atrasado" depois disto (remédio usa 15 min; resto usa a janela da rotina). */
const LATE_MIN_ROUTINE = NOW_WINDOW_MIN;

function statusFor(done: boolean, time: string | null, now: Date, lateAfter: number): { status: TodayStatus; minutesLate?: number } {
  if (done) return { status: 'feito' };
  if (!time) return { status: 'pendente' };
  const diff = minutesOf(now) - toMin(time);
  if (diff > lateAfter) return { status: 'atrasado', minutesLate: diff };
  if (diff >= -30) return { status: 'agora' };
  return { status: 'pendente' };
}

/**
 * Lista "Hoje" da Home: comida + passeio (rotina), lembretes do dia e doses de remédio, em ordem de horário
 * (itens sem horário no fim), com `done`. Doses/lembretes usam o DoseLog (coleção 'doses').
 */
export function todayItems(state: TodayState, pet: Pet, now: Date): TodayItem[] {
  const day = toDay(now);
  const logs = state.data.doses ?? [];
  const out: TodayItem[] = [];

  for (const it of routineItems(pet, state.data.ledger, day)) {
    if (it.kind !== 'racao' && it.kind !== 'passeio') continue;
    const kind: TodayKind = it.kind === 'racao' ? 'comida' : 'passeio';
    out.push({ key: `rot:${it.key}`, kind, time: it.time, title: it.title, sub: it.sub, done: it.done, ...statusFor(it.done, it.time, now, LATE_MIN_ROUTINE), source: { type: 'routine', item: it } });
  }

  for (const r of state.data.reminders ?? []) {
    if (!r.active) continue;
    if (r.type === 'remedio' && r.med) {
      for (const d of dosesForDay(r.med, r.id, day)) {
        const log = logs.find((l) => l.id === d.key);
        const done = !!log && log.status !== 'skipped';
        const st: { status: TodayStatus; minutesLate?: number } = log?.status === 'skipped' ? { status: 'pulado' } : statusFor(done, d.time, now, 15);
        out.push({ key: d.key, kind: 'remedio', time: d.time, title: r.med.name || r.title, sub: r.med.dose ?? 'Remédio', done: done || log?.status === 'skipped', ...st, source: { type: 'dose', reminderId: r.id, day, time: d.time, at: d.at.toISOString() } });
      }
      continue;
    }
    if (!occursOn(r, day)) continue;
    const time = r.time ?? '';
    const key = doseKey(r.id, day, time || '0000');
    const log = logs.find((l) => l.id === key);
    const done = !!log && log.status !== 'skipped';
    const st: { status: TodayStatus; minutesLate?: number } = log?.status === 'skipped' ? { status: 'pulado' } : statusFor(done, r.time ?? null, now, LATE_MIN_ROUTINE);
    out.push({
      key, kind: r.type === 'passeio' ? 'passeio' : r.type === 'comida' ? 'comida' : 'lembrete', reminderType: r.type, time: r.time ?? null,
      title: r.title, sub: r.note ?? reminderTypeLabel(r.type), done: done || log?.status === 'skipped', ...st,
      source: { type: 'reminder', reminderId: r.id, day, time: time || '0000' },
    });
  }

  return out.sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'));
}

/** "2 de 5" (anel do cartão do pet). */
export function progress(items: TodayItem[]): { done: number; total: number; label: string; ratio: number } {
  const done = items.filter((i) => i.done).length;
  const total = items.length;
  return { done, total, label: `${done} de ${total}`, ratio: total ? done / total : 0 };
}

export interface Agora {
  item: TodayItem;
  state: 'atrasado' | 'agora' | 'proximo';
  /** "ATRASADA · 16:00 (HÁ 1 H)" */
  badge: string;
  minutesLate?: number;
  /** botão: "Dar" (remédio) ou "Feito" */
  action: 'Dar' | 'Feito';
}

/**
 * Cartão AGORA: 1) remédio atrasado (vermelho); 2) qualquer item "agora"; 3) outro atrasado; 4) próximo com horário;
 * 5) primeiro pendente sem horário. null = tudo feito.
 */
export function agoraItem(items: TodayItem[], now: Date): Agora | null {
  const pend = items.filter((i) => !i.done);
  const pick = (i: TodayItem, state: Agora['state']): Agora => {
    const isMed = i.kind === 'remedio';
    const badge = state === 'atrasado'
      ? `${isMed ? 'ATRASADA' : 'ATRASADO'} · ${i.time} (${lateLabel(i.minutesLate ?? 0).toUpperCase()})`
      : state === 'agora' ? `AGORA${i.time ? ` · ${i.time}` : ''}` : `PRÓXIMO${i.time ? ` · ${i.time}` : ''}`;
    return { item: i, state, badge, ...(i.minutesLate ? { minutesLate: i.minutesLate } : {}), action: isMed ? 'Dar' : 'Feito' };
  };
  // a dose atrasada MAIS RECENTE (as mais antigas já foram "engolidas" pela seguinte)
  const lateMed = [...pend].reverse().find((i) => i.kind === 'remedio' && i.status === 'atrasado');
  if (lateMed) return pick(lateMed, 'atrasado');
  const nowI = pend.find((i) => i.status === 'agora');
  if (nowI) return pick(nowI, 'agora');
  const hhmm = hhmmOf(now);
  const next = pend.find((i) => i.time && i.time >= hhmm);
  const late = pend.find((i) => i.status === 'atrasado');
  if (late) return pick(late, 'atrasado');
  if (next) return pick(next, 'proximo');
  const any = pend[0];
  return any ? pick(any, any.status === 'atrasado' ? 'atrasado' : 'proximo') : null;
}

/** Situação de cada remédio ativo agora (usa meds.doseStatus). */
export function medsNow(reminders: Reminder[], logs: DoseLog[], now: Date): { reminder: Reminder; status: DoseNow }[] {
  return reminders.filter((r) => r.active && r.type === 'remedio' && r.med).map((r) => ({ reminder: r, status: doseStatus(r.med!, r.id, logs, now) }));
}

// ------------------------------------------------------------------ vacinas
export type DueStatus = 'atrasado' | 'este_mes' | 'em_dia';
export const DUE_LABEL: Record<DueStatus, string> = { atrasado: 'Atrasado', este_mes: 'Este mês', em_dia: 'Em dia' };

export function dueStatus(day: string, today: string): DueStatus {
  if (day < today) return 'atrasado';
  if (day.slice(0, 7) === today.slice(0, 7)) return 'este_mes';
  return 'em_dia';
}

export interface NextVaccine {
  care: Care;
  name: string;
  date: string;
  /** "12 de outubro" */
  dateLabel: string;
  daysUntil: number;
  status: DueStatus;
}

/** Cartão lilás "Próxima vacina" (atrasadas primeiro). */
export function nextVaccine(cares: Care[], today: string): NextVaccine | null {
  const v = cares.filter((c) => c.category === 'vacina' && c.active && c.nextDate).sort((a, b) => a.nextDate!.localeCompare(b.nextDate!))[0];
  if (!v) return null;
  return { care: v, name: v.name, date: v.nextDate!, dateLabel: fmtDayMonth(v.nextDate!), daysUntil: diffDays(today, v.nextDate!), status: dueStatus(v.nextDate!, today) };
}

/** Chip "Vacinas 2 de 3": vacinas em dia (não atrasadas e já com dose) de todas as vacinas ativas. */
export function vaccinesSummary(cares: Care[], today: string): { ok: number; total: number; label: string } {
  // vacina opcional que nunca tomou (inativa e sem dose) não entra na conta: "2 de 3", não "2 de 4"
  const vs = cares.filter((c) => c.category === 'vacina' && (c.active || !!c.lastDate || (c.history?.length ?? 0) > 0));
  const ok = vs.filter((c) => careStatus(c, today) !== 'atrasado' && (c.lastDate || (c.history?.length ?? 0) > 0)).length;
  return { ok, total: vs.length, label: `${ok} de ${vs.length}` };
}

// ------------------------------------------------------------------ Agenda
export type AgendaFilter = 'tudo' | 'vacinas' | 'remedios';
export type AgendaKind = 'vacina' | 'vermifugo' | 'antipulgas' | 'remedio' | 'exame' | 'consulta' | 'banho' | 'outro';

export interface AgendaEvent {
  key: string;
  day: string;
  /** "10" */
  dayNum: string;
  /** "qui" */
  weekday: string;
  title: string;
  /** "Dose anual" · "A cada 3 meses" · "Protege 3 meses" · "Venceu há 16 dias" */
  sub: string;
  kind: AgendaKind;
  status: DueStatus;
  statusLabel: string;
  careId?: string;
  reminderId?: string;
}

export interface AgendaGroup {
  /** 'atrasados' ou "2026-10" */
  id: string;
  /** "Atrasados" · "Outubro 2026" */
  title: string;
  events: AgendaEvent[];
}

function careKind(c: Care): AgendaKind {
  switch (c.category) {
    case 'vacina': return 'vacina';
    case 'vermifugo': return 'vermifugo';
    case 'antiparasitario': return 'antipulgas';
    case 'remedio': return 'remedio';
    case 'exame': return 'exame';
    default: return 'outro';
  }
}

function careSub(c: Care): string {
  if (c.category === 'vermifugo' || c.category === 'antiparasitario') return durationLabel(careDurationMonths(c));
  if (c.series && c.series.length > 0) return 'Dose da série';
  if (c.category === 'vacina' && c.recurrence?.unit === 'year' && c.recurrence.every === 1) return 'Dose anual';
  if (c.category === 'exame') return 'Consulta anual';
  return recurrenceLabel(c.recurrence);
}

function matches(filter: AgendaFilter, kind: AgendaKind): boolean {
  if (filter === 'tudo') return true;
  if (filter === 'vacinas') return kind === 'vacina';
  return kind === 'remedio' || kind === 'vermifugo' || kind === 'antipulgas';
}

/**
 * Aba Agenda: grupo "Atrasados" (se houver) + um grupo por mês (próximos `months` meses).
 * Cuidados (vacinas, vermífugo, antipulgas, exames) pelas datas previstas + lembretes com data (consulta, banho…)
 * + o fim de cada tratamento de remédio.
 */
export function agendaByMonth(state: TodayState, _pet: Pet | null, today: string, filter: AgendaFilter = 'tudo', months = 12): AgendaGroup[] {
  const end = addMonths(today, months);
  const events: AgendaEvent[] = [];
  const mk = (e: Omit<AgendaEvent, 'dayNum' | 'weekday' | 'status' | 'statusLabel'>): AgendaEvent => {
    const status = dueStatus(e.day, today);
    return { ...e, dayNum: e.day.slice(8, 10), weekday: weekdayMini(e.day), status, statusLabel: DUE_LABEL[status] };
  };

  for (const c of state.data.cares) {
    if (!c.active || !c.nextDate) continue;
    const kind = careKind(c);
    if (!matches(filter, kind)) continue;
    const dates = [...new Set([c.nextDate, ...(c.series ?? []), ...projected(c, 6)])].sort();
    let pastShown = false;
    for (const d of dates) {
      if (d > end) break;
      if (d < today) { if (pastShown) continue; pastShown = true; }
      const late = d < today;
      events.push(mk({ key: `${c.id}:${d}`, day: d, title: c.name, sub: late ? `Venceu há ${diffDays(d, today)} ${diffDays(d, today) === 1 ? 'dia' : 'dias'}` : careSub(c), kind, careId: c.id }));
    }
  }

  const logs = state.data.doses ?? [];
  for (const r of state.data.reminders ?? []) {
    if (!r.active) continue;
    if (r.type === 'remedio') {
      if (!matches(filter, 'remedio') || !r.med) continue;
      const endDay = r.med.days === 'continuo' ? null : addDays(r.med.startDate, r.med.days - 1);
      if (endDay && endDay >= today && endDay <= end) events.push(mk({ key: `${r.id}:fim`, day: endDay, title: r.med.name || r.title, sub: 'Último dia do remédio', kind: 'remedio', reminderId: r.id }));
      continue;
    }
    if (r.repeat === 'daily' || r.type === 'passeio' || r.type === 'comida') continue; // rotina fica na Home
    const kind: AgendaKind = r.type === 'consulta' ? 'consulta' : r.type === 'banho' ? 'banho' : 'outro';
    if (filter !== 'tudo') continue;
    for (const d of nextOccurrences(r, today, 3)) {
      if (d > end) break;
      const done = logs.some((l) => l.reminderId === r.id && l.day === d && l.status !== 'skipped');
      if (done) continue;
      events.push(mk({ key: `${r.id}:${d}`, day: d, title: r.title, sub: r.time ? `${reminderTypeLabel(r.type)} · ${r.time}` : reminderTypeLabel(r.type), kind, reminderId: r.id }));
    }
  }

  events.sort((a, b) => a.day.localeCompare(b.day));
  const groups: AgendaGroup[] = [];
  const late = events.filter((e) => e.status === 'atrasado');
  if (late.length) groups.push({ id: 'atrasados', title: 'Atrasados', events: late });
  const byMonth = new Map<string, AgendaEvent[]>();
  for (const e of events) if (e.status !== 'atrasado') byMonth.set(e.day.slice(0, 7), [...(byMonth.get(e.day.slice(0, 7)) ?? []), e]);
  for (const [m, evs] of byMonth) groups.push({ id: m, title: monthTitle(m), events: evs });
  return groups;
}

/** Data/hora de um item de hoje (para marcar dose "que horas?"). */
export function scheduledAt(item: TodayItem): Date | null {
  if (!item.time) return null;
  const day = item.source.type === 'routine' ? toDay(new Date()) : item.source.day;
  return atTime(day, item.time);
}
