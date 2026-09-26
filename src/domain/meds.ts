import { addDays, atTime, fmtWeekdayLong, hhmmOf, hhmmToMin, minToHHMM, toDay } from './dates';
import type { DoseLog, DoseStatus, MedSchedule } from './types';

/**
 * v1.1 — horários de remédio (Lembrete-Remedio, Remedio-Madrugada, Dose-Atrasada).
 * As doses são uma sequência absoluta: 1ª dose em startDate + firstDose, depois a cada `everyHours`,
 * total = doses por dia × dias (uso contínuo = sem fim). Ex.: 8/8h às 08:00, 7 dias a partir de sáb 26/09
 * → 21 doses, a última no sábado, 3 de outubro, 00:00.
 */

/** Opções da tela "De quanto em quanto tempo?". */
export const FREQUENCY_OPTIONS: { everyHours: number; label: string }[] = [
  { everyHours: 24, label: '1x por dia' },
  { everyHours: 12, label: '12 em 12h' },
  { everyHours: 8, label: '8 em 8h' },
  { everyHours: 6, label: '6 em 6h' },
];
/** Opções "Por quantos dias?". */
export const DAYS_OPTIONS: (number | 'continuo')[] = [5, 7, 10, 14, 'continuo'];

/** Madrugada = 00:00–05:59. */
export const NIGHT_END_MIN = 6 * 60;

/** Horários de um dia, na ordem das doses: doseTimes(8, '08:00') → ['08:00','16:00','00:00']. */
export function doseTimes(everyHours: number, firstDose: string): string[] {
  const h = Math.max(1, Math.min(24, everyHours));
  const n = Math.max(1, Math.floor(24 / h));
  const start = hhmmToMin(firstDose);
  return Array.from({ length: n }, (_, k) => minToHHMM(start + k * h * 60));
}

export function everyHoursOf(s: Pick<MedSchedule, 'everyHours' | 'timesPerDay' | 'times'>): number {
  if (s.everyHours) return s.everyHours;
  if (s.timesPerDay) return 24 / s.timesPerDay;
  if (s.times?.length) return 24 / s.times.length;
  return 24;
}

/** Horários do dia do remédio (explícitos em "Outro", senão calculados). */
export function scheduleTimes(s: MedSchedule): string[] {
  if (s.times?.length) return [...s.times];
  return doseTimes(everyHoursOf(s), s.firstDose);
}

export function dosesPerDay(s: MedSchedule): number {
  return scheduleTimes(s).length;
}

/** Algum horário cai entre 00:00 e 05:59? */
export function hasNightDose(times: string[]): boolean {
  return times.some((t) => hhmmToMin(t) < NIGHT_END_MIN);
}

/**
 * Sugere deslocar TODOS os horários (em horas inteiras, primeiro para mais cedo) para caberem em 06:00–23:59.
 * suggestShift(['08:00','16:00','00:00']) → ['07:00','15:00','23:00']. null = impossível (ex.: 6/6h) ou não precisa.
 */
export function suggestShift(times: string[]): string[] | null {
  if (!hasNightDose(times)) return null;
  for (let h = 1; h <= 12; h++) {
    for (const sign of [-1, 1]) {
      const shifted = times.map((t) => minToHHMM(hhmmToMin(t) + sign * h * 60));
      if (!hasNightDose(shifted)) return shifted;
    }
  }
  return null;
}

/** Deslocamento em minutos entre a lista original e a sugerida (para aplicar em firstDose). */
export function shiftMinutes(from: string[], to: string[]): number {
  let d = hhmmToMin(to[0]) - hhmmToMin(from[0]);
  if (d > 720) d -= 1440;
  if (d < -720) d += 1440;
  return d;
}

export interface DoseSlot {
  /** dia da dose YYYY-MM-DD */
  day: string;
  /** "HH:MM" */
  time: string;
  /** Date local */
  at: Date;
  /** 1-based na sequência */
  index: number;
  /** id do DoseLog correspondente */
  key: string;
}

export function doseKey(reminderId: string, day: string, time: string): string {
  return `${reminderId}_${day}_${time.replace(':', '')}`;
}

export function totalDoses(s: MedSchedule): number | null {
  return s.days === 'continuo' ? null : dosesPerDay(s) * s.days;
}

/**
 * Doses entre [from, to) (Dates). Com `times` explícitos, repete os horários todo dia a partir do startDate.
 */
export function dosesBetween(s: MedSchedule, reminderId: string, from: Date, to: Date): DoseSlot[] {
  const out: DoseSlot[] = [];
  const total = totalDoses(s);
  if (s.times?.length) {
    const times = [...s.times].sort();
    const first = atTime(s.startDate, times[0]);
    let idx = 0;
    for (let day = s.startDate; ; day = addDays(day, 1)) {
      for (const t of times) {
        const at = atTime(day, t);
        idx++;
        if (total !== null && idx > total) return out;
        if (at >= to) return out;
        if (at >= from && at >= first) out.push({ day, time: t, at, index: idx, key: doseKey(reminderId, day, t) });
      }
    }
  }
  const stepMs = everyHoursOf(s) * 3600_000;
  const first = atTime(s.startDate, s.firstDose).getTime();
  // pula direto para perto de `from`
  let k = Math.max(0, Math.floor((from.getTime() - first) / stepMs) - 1);
  for (; ; k++) {
    if (total !== null && k >= total) break;
    // soma em horas locais (horário de verão não "empurra" as doses)
    const at = new Date(first);
    at.setMinutes(at.getMinutes() + Math.round(k * everyHoursOf(s) * 60));
    if (at >= to) break;
    if (at >= from) {
      const day = toDay(at);
      const time = hhmmOf(at);
      out.push({ day, time, at, index: k + 1, key: doseKey(reminderId, day, time) });
    }
  }
  return out;
}

/** Doses de um dia (ordem do relógio). */
export function dosesForDay(s: MedSchedule, reminderId: string, day: string): DoseSlot[] {
  return dosesBetween(s, reminderId, atTime(day, '00:00'), atTime(addDays(day, 1), '00:00')).sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Dia da última dose (null = uso contínuo). */
export function lastDoseDay(s: MedSchedule): string | null {
  const total = totalDoses(s);
  if (total === null) return null;
  if (s.times?.length) return addDays(s.startDate, s.days as number - 1);
  const at = atTime(s.startDate, s.firstDose);
  at.setMinutes(at.getMinutes() + Math.round((total - 1) * everyHoursOf(s) * 60));
  return toDay(at);
}

/** "3 doses por dia · até sábado, 3 de outubro · 21 doses no total" / "2 doses por dia · uso contínuo" */
export function summary(s: MedSchedule): string {
  const n = dosesPerDay(s);
  const perDay = `${n} ${n === 1 ? 'dose' : 'doses'} por dia`;
  const total = totalDoses(s);
  const end = lastDoseDay(s);
  if (total === null || !end) return `${perDay} · uso contínuo`;
  return `${perDay} · até ${fmtWeekdayLong(end)} · ${total} ${total === 1 ? 'dose' : 'doses'} no total`;
}

/** Tolerância para contar como "no horário" (milhas) e para ainda não chamar de atrasada. */
export const ON_TIME_MIN = 60;
export const LATE_AFTER_MIN = 15;

export type DoseState = 'atrasada' | 'agora' | 'proxima' | 'fim';

export interface DoseNow {
  state: DoseState;
  /** a dose em questão (atrasada/agora) ou a próxima */
  dose?: DoseSlot;
  /** minutos de atraso (state 'atrasada') */
  minutesLate?: number;
  /** "há 1 h" / "há 20 min" */
  lateLabel?: string;
  /** a próxima dose depois desta ("PRÓXIMA DOSE · 00:00") */
  next?: DoseSlot;
}

export function lateLabel(minutes: number): string {
  if (minutes < 60) return `há ${Math.max(1, Math.round(minutes))} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m >= 10 ? `há ${h} h ${m} min` : `há ${h} h`;
}

/**
 * Situação do remédio agora (cartão AGORA da Home).
 * - 'atrasada': a última dose que já passou (há mais de 15 min) não foi marcada e a seguinte ainda não chegou.
 * - 'agora': dose dentro dos 15 min.
 * - 'proxima': nada pendente; `dose` = próxima.
 * - 'fim': tratamento acabou.
 */
export function doseStatus(s: MedSchedule, reminderId: string, logs: DoseLog[], now: Date): DoseNow {
  const stepMs = everyHoursOf(s) * 3600_000;
  const around = dosesBetween(s, reminderId, new Date(now.getTime() - stepMs - 60_000), new Date(now.getTime() + 2 * stepMs + 60_000));
  const logged = new Set(logs.filter((l) => l.reminderId === reminderId).map((l) => l.id));
  const past = around.filter((d) => d.at.getTime() <= now.getTime());
  const future = around.filter((d) => d.at.getTime() > now.getTime());
  const cur = past[past.length - 1];
  if (cur && !logged.has(cur.key)) {
    const late = (now.getTime() - cur.at.getTime()) / 60_000;
    if (late > LATE_AFTER_MIN) return { state: 'atrasada', dose: cur, minutesLate: Math.round(late), lateLabel: lateLabel(late), next: future[0] };
    return { state: 'agora', dose: cur, next: future[0] };
  }
  if (future[0]) return { state: 'proxima', dose: future[0], next: future[1] };
  return { state: 'fim' };
}

/** Status a gravar ao marcar "dei": 'late' quando passou da tolerância. */
export function statusForGiven(scheduled: Date, givenAt: Date): DoseStatus {
  return (givenAt.getTime() - scheduled.getTime()) / 60_000 > ON_TIME_MIN ? 'late' : 'given';
}

/** Dose dada no horário (vale milhas "remédio no horário"). */
export function onTime(scheduled: Date, givenAt: Date): boolean {
  return Math.abs(givenAt.getTime() - scheduled.getTime()) / 60_000 <= ON_TIME_MIN;
}
