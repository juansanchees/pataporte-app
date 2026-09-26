import type { Recurrence } from './types';

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

/** Local calendar day as YYYY-MM-DD. */
export function toDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function fromDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function today(): string {
  return toDay(new Date());
}

export function addDays(day: string, n: number): string {
  const d = fromDay(day);
  d.setDate(d.getDate() + n);
  return toDay(d);
}

export function addRecurrence(day: string, rec: Recurrence): string | null {
  if (!rec) return null;
  const d = fromDay(day);
  if (rec.unit === 'day') d.setDate(d.getDate() + rec.every);
  if (rec.unit === 'month') {
    const target = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + rec.every);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(target, last));
  }
  if (rec.unit === 'year') {
    // 29/02 + 1 ano = 28/02 (não "pula" para março)
    const m = d.getMonth();
    d.setFullYear(d.getFullYear() + rec.every);
    if (d.getMonth() !== m) d.setDate(0);
  }
  return toDay(d);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((fromDay(b).getTime() - fromDay(a).getTime()) / 86400000);
}

export function fmtShort(day: string): string {
  const d = fromDay(day);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`;
}

export function fmtLong(day: string): string {
  const d = fromDay(day);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtBR(day: string): string {
  const [y, m, d] = day.split('-');
  return `${d}/${m}/${y}`;
}

export function monthLabel(day: string): string {
  const d = fromDay(day);
  const names = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  return `${names[d.getMonth()]} ${d.getFullYear()}`;
}

export function weekdayShort(day: string): string {
  return WEEKDAYS[fromDay(day).getDay()];
}

/** Relative wording for a due date, e.g. "HOJE", "AMANHÃ", "EM 4 DIAS", "HÁ 2 DIAS". */
export function relative(from: string, to: string): string {
  const n = diffDays(from, to);
  if (n === 0) return 'HOJE';
  if (n === 1) return 'AMANHÃ';
  if (n === -1) return 'ONTEM';
  if (n > 1) return `EM ${n} DIAS`;
  return `HÁ ${-n} DIAS`;
}

export function ageYears(birth: string, on: string): number {
  const b = fromDay(birth);
  const t = fromDay(on);
  let age = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
  return Math.max(0, age);
}

/** Parse "DD/MM/AAAA" into YYYY-MM-DD, or null when invalid. */
export function parseBR(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  const date = new Date(y, mo - 1, d, 12);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return toDay(date);
}

export function weekOf(day: string): string[] {
  const d = fromDay(day);
  const dow = (d.getDay() + 6) % 7; // monday = 0
  const monday = addDays(day, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** "AAAA-MM" no fuso do celular (um ISO em UTC pode cair no mês seguinte à noite). */
export function localMonth(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
