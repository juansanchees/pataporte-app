import { addMonths, diffDays, fmtDayMonth, fmtExtenso, relativeLong } from './dates';
import { resolveLast } from './vaccines';
import type { Care, LastAnswer, ParasiteDuration, ParasiteMonths } from './types';

/**
 * v1.1 — vermífugo e antipulgas (capítulo 4, SEPARADOS).
 * "Quando foi?" (mesmo padrão das vacinas, com "menos/mais de 1 mês") → "Quanto tempo ele protege?"
 * → "Próximo: 20 de dezembro · daqui a 12 semanas".
 */

export type ParasiteKind = 'vermifugo' | 'antipulgas';
/** code do Care no catálogo */
export const PARASITE_CODE: Record<ParasiteKind, 'VRM' | 'APG'> = { vermifugo: 'VRM', antipulgas: 'APG' };

export interface DurationOption { value: ParasiteDuration; label: string; sub: string }

/** Opções da tela "Quanto tempo ele protege?" (Dur-Duracao). */
export const DURATION_OPTIONS: DurationOption[] = [
  { value: 1, label: '1 mês', sub: 'comprimido mensal, pipeta' },
  { value: 3, label: '3 meses', sub: 'comprimido trimestral' },
  { value: 8, label: '8 meses', sub: 'coleira antipulgas' },
  { value: 12, label: '1 ano', sub: 'injeção anual' },
  { value: 'naosei', label: 'Não sei', sub: 'vamos usar 1 mês por segurança' },
];

/** 'naosei' = 1 mês por segurança. */
export function durationMonths(d: ParasiteDuration | undefined | null): ParasiteMonths {
  return d === undefined || d === null || d === 'naosei' ? 1 : d;
}

/** "Protege 3 meses" / "Protege 1 ano" */
export function durationLabel(m: number): string {
  return m === 12 ? 'Protege 1 ano' : m === 1 ? 'Protege 1 mês' : `Protege ${m} meses`;
}

/** Duração padrão de itens antigos (v1.0) sem duração: vermífugo 3 meses, antipulgas 1 mês. */
export function defaultDuration(category: Care['category']): ParasiteMonths {
  return category === 'vermifugo' ? 3 : 1;
}

/** Duração (meses) de um item de vermífugo/antipulgas: a salva, senão a da recorrência, senão o padrão. */
export function careDurationMonths(c: Pick<Care, 'durationMonths' | 'recurrence' | 'category'>): number {
  if (c.durationMonths) return c.durationMonths;
  if (c.recurrence?.unit === 'month') return c.recurrence.every;
  if (c.recurrence?.unit === 'year') return c.recurrence.every * 12;
  return defaultDuration(c.category);
}

export interface ParasiteNext {
  /** próxima aplicação YYYY-MM-DD */
  next: string;
  /** última aplicação usada no cálculo (pode ser estimada) */
  last?: string;
  approx: boolean;
  /** já passou da data (ou nunca tomou / não sabe) → fazer agora */
  overdue: boolean;
  months: ParasiteMonths;
  /** "20 de dezembro" */
  label: string;
  /** "20 de dezembro de 2026" */
  labelLong: string;
  /** "daqui a 12 semanas" · "hoje" */
  relLabel: string;
}

/**
 * Próxima data a partir da última aplicação e da duração.
 * `last` pode ser uma data YYYY-MM-DD, uma resposta "Quando foi?" ou null (nunca/não sabe = hoje).
 */
export function nextFromDuration(last: string | LastAnswer | null | undefined, months: ParasiteDuration, today: string): ParasiteNext {
  const m = durationMonths(months);
  const r = typeof last === 'string' ? { date: last, approx: false } : resolveLast(last ?? undefined, today);
  let next = r.date ? addMonths(r.date, m) : today;
  const overdue = next < today || !r.date;
  if (next < today) next = today;
  return {
    next,
    ...(r.date ? { last: r.date } : {}),
    approx: r.approx,
    overdue,
    months: m,
    label: fmtDayMonth(next),
    labelLong: fmtExtenso(next),
    relLabel: relativeLong(today, next),
  };
}

/** Próximas `count` datas depois da próxima (linha do tempo do resultado). */
export function parasiteTimeline(next: string, months: ParasiteDuration, count = 3): string[] {
  const m = durationMonths(months);
  return Array.from({ length: count }, (_, i) => addMonths(next, i * m));
}

/** Aviso padrão (Dur-Resultado): "Vamos te lembrar 3 dias antes." */
export const PARASITE_REMINDER_DAYS = [3, 0];

/** Dias até a próxima (negativo = atrasado). */
export function daysUntil(next: string, today: string): number {
  return diffDays(today, next);
}

