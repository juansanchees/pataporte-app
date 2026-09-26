import { addDays, addRecurrence, diffDays } from './dates';
import type { CareType } from './catalog';
import type { Care, CareStatus, HistoryAnswer, Stamp } from './types';

export const STATUS_WINDOW_DAYS = 3;
/** Prazo dado a quem respondeu "Ainda não" ou "Não sei" no cadastro. */
export const FIRST_DUE_DAYS = 14;

export function careStatus(care: Care, today: string): CareStatus {
  if (!care.active || !care.nextDate) return 'carimbado';
  const n = diffDays(today, care.nextDate);
  if (n < 0) return 'atrasado';
  if (n <= STATUS_WINDOW_DAYS) return 'atencao';
  return 'em_dia';
}

export const STAMP_COLORS = ['#2E5E9E', '#357E4C', '#6A4C9C', '#B03F29', '#9E6C06'];

export function rotationFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return (Math.abs(h) % 29) - 14;
}

export function makeCareStamp(care: Care, day: string, petName: string, id: string, note?: string): Stamp {
  const color = care.category === 'vacina' ? '#2E5E9E' : care.category === 'vermifugo' ? '#357E4C' : care.category === 'antiparasitario' ? '#6A4C9C' : '#B03F29';
  return {
    id,
    kind: 'cuidado',
    careId: care.id,
    code: care.code,
    top: care.name.toUpperCase().slice(0, 22),
    bottom: note ?? `${petName.toUpperCase()} · PATAPORTE`,
    main: care.code,
    sub: day,
    color,
    shape: 'circle',
    rotation: rotationFor(id),
    date: day,
  };
}

/** Quando foi a última dose, respondido no requerimento. */
export type HistoryWhen = 'mes' | 'semestre' | 'ano' | 'mais' | 'naolembro';

export const WHEN_OPTIONS: { k: HistoryWhen; label: string }[] = [
  { k: 'mes', label: 'Este mês' },
  { k: 'semestre', label: '1 a 6 meses' },
  { k: 'ano', label: '6 a 12 meses' },
  { k: 'mais', label: 'Mais de 1 ano' },
  { k: 'naolembro', label: 'Não lembro' },
];

/** Data aproximada da última dose a partir da resposta. */
export function dayForWhen(when: HistoryWhen | undefined, today: string): string {
  switch (when) {
    case 'semestre': return addDays(today, -90);
    case 'ano': return addDays(today, -270);
    case 'mais': return addDays(today, -400);
    default: return today;
  }
}

export interface GeneratedItinerary {
  cares: Care[];
  stampsFor: Care[]; // cares that should get an "already applied" stamp
}

/**
 * Turns the answers from the "Carimbos anteriores" step into the pet's itinerary.
 * - tomei:  considered applied today (tutor can fix the date later) → stamp + next date by recurrence
 * - nao:    overdue (due yesterday) → urgent reminder
 * - naosei: attention (due in 3 days) → reminder to confirm with the vet
 * - no answer: suggestion due in 30 days
 */
export function generateItinerary(
  types: CareType[],
  answers: Record<string, HistoryAnswer | undefined>,
  today: string,
  makeId: () => string,
  whens: Record<string, HistoryWhen | undefined> = {},
): GeneratedItinerary {
  const cares: Care[] = [];
  const stampsFor: Care[] = [];
  for (const t of types) {
    const answer = answers[t.code];
    const base: Care = {
      id: makeId(),
      code: t.code,
      name: t.name,
      category: t.category,
      recurrence: t.recurrence,
      lastDate: null,
      nextDate: null,
      origin: 'requerimento',
      answer: answer ?? null,
      place: '',
      reminders: [3, 1],
      miles: t.miles,
      active: true,
      createdAt: new Date().toISOString(),
    };
    if (answer === 'tomei' && whens[t.code] === 'naolembro') {
      // tomou mas não lembra quando: sem carimbo com data inventada; pede para confirmar com o vet em 7 dias
      base.nextDate = addDays(today, 7);
    } else if (answer === 'tomei') {
      const when = whens[t.code];
      const day = dayForWhen(when, today);
      base.lastDate = day;
      base.history = [day];
      base.nextDate = addRecurrence(day, t.recurrence);
      base.active = base.nextDate !== null;
      stampsFor.push(base);
    } else if (answer === 'nao' || answer === 'naosei') {
      // sem culpa no 1º dia: vira "agendar nos próximos 14 dias", com lembrete antes
      base.nextDate = addDays(today, FIRST_DUE_DAYS);
    } else {
      base.nextDate = addDays(today, 30);
    }
    cares.push(base);
  }
  return { cares, stampsFor };
}

/** Marks a care as done on `day`. Returns the updated care. */
export function stampCare(care: Care, day: string): Care {
  const history = Array.from(new Set([...(care.history ?? (care.lastDate ? [care.lastDate] : [])), day])).sort();
  const last = history[history.length - 1];
  // carimbar uma data antiga não pode "voltar" o calendário
  if (last !== day) return { ...care, history };
  // v1.1: série planejada (filhote / adulto sem histórico) — a próxima dose mantém o intervalo planejado a partir de hoje
  if (care.series?.length) {
    const [taken, ...rest] = care.series;
    const shifted = rest.map((d) => addDays(day, Math.max(1, diffDays(taken, d))));
    if (shifted.length) {
      const { series: _s, lastApprox: _a, ...base } = care;
      return { ...base, lastDate: day, nextDate: shifted[0], active: true, history, series: shifted };
    }
    const { series: _s, lastApprox: _a, ...base } = care;
    const next = addRecurrence(day, care.recurrence);
    return { ...base, lastDate: day, nextDate: next, active: next !== null, history };
  }
  const next = care.intervalDays ? addDays(day, care.intervalDays) : addRecurrence(day, care.recurrence);
  const { lastApprox: _a, ...base } = care;
  return { ...base, lastDate: day, nextDate: next, active: next !== null, history };
}

/** Datas já aplicadas (mais antiga primeiro). */
export function historyOf(care: Care): string[] {
  return care.history?.length ? [...care.history].sort() : care.lastDate ? [care.lastDate] : [];
}

/** Próximas `count` datas previstas pela recorrência, a partir da próxima dose. */
export function projected(care: Care, count = 3): string[] {
  if (!care.active || !care.nextDate) return [];
  const out = [care.nextDate];
  const rec = care.recurrence;
  // sempre a partir da data base (evita o dia "escorregar" 31 → 28 → 28…)
  for (let k = 1; out.length < count && rec; k++) {
    const n = addRecurrence(care.nextDate, { unit: rec.unit, every: rec.every * k });
    if (!n) break;
    out.push(n);
  }
  return out;
}

export function recurrenceLabel(rec: Care['recurrence']): string {
  if (!rec) return 'Dose única';
  if (rec.unit === 'year') return rec.every === 1 ? 'Todo ano' : `A cada ${rec.every} anos`;
  if (rec.unit === 'month') return rec.every === 1 ? 'Todo mês' : `A cada ${rec.every} meses`;
  return rec.every === 1 ? 'Todo dia' : `A cada ${rec.every} dias`;
}

/** Cronograma: doses previstas nos próximos `months` meses, agrupadas por mês (YYYY-MM). */
export function timeline(cares: Care[], today: string, months = 12): { month: string; items: { care: Care; day: string }[] }[] {
  const end = addDays(today, Math.round(months * 30.5));
  const all: { care: Care; day: string }[] = [];
  for (const c of cares) {
    if (!c.active || !c.nextDate) continue;
    let pastShown = false;
    for (const d of projected(c, 24)) {
      if (d > end) break;
      // de uma dose atrasada, mostra só a primeira data (as outras "passadas" não fazem sentido)
      if (d < today) { if (pastShown) continue; pastShown = true; }
      all.push({ care: c, day: d });
    }
  }
  all.sort((a, b) => a.day.localeCompare(b.day));
  const map = new Map<string, { care: Care; day: string }[]>();
  for (const it of all) {
    const k = it.day.slice(0, 7);
    map.set(k, [...(map.get(k) ?? []), it]);
  }
  return [...map.entries()].map(([month, items]) => ({ month, items }));
}

export function sortByDue(cares: Care[]): Care[] {
  return [...cares].sort((a, b) => (a.nextDate ?? '9999').localeCompare(b.nextDate ?? '9999'));
}

export function groupItinerary(cares: Care[], today: string) {
  const late: Care[] = [];
  const upcoming: Care[] = [];
  const done: Care[] = [];
  for (const c of sortByDue(cares)) {
    const s = careStatus(c, today);
    if (s === 'atrasado') late.push(c);
    else if (s === 'carimbado') done.push(c);
    else upcoming.push(c);
  }
  // recurring cares that were stamped at least once also appear in "carimbados" history
  const stampedRecurring = cares.filter((c) => c.lastDate && c.active);
  return { late, upcoming, done: [...done, ...stampedRecurring.filter((c) => !done.includes(c))] };
}
