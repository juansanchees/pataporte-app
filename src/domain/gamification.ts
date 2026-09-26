import { gramsPerMeal } from './catalog';
import { addDays, diffDays, fromDay } from './dates';
import { careStatus } from './itinerary';
import type { Care, LedgerEntry, LedgerOrigin, Mood, Pet, PetData, Plan } from './types';
import { art } from './words';

// ------------------------------------------------------------------ levels (vistos)
export interface Level { n: number; name: string; min: number; reward?: string; perk: string }

/** Níveis do pet: cada um dá um presente para o avatar (vai para a mala do Duty Free de graça). */
export const LEVELS: Level[] = [
  { n: 1, name: 'Filhote Viajante', min: 0, perk: 'Passaporte emitido. A partir daqui, todo cuidado vale milhas.' },
  { n: 2, name: 'Turista', min: 150, reward: 'bandana', perk: 'Ganha a Bandana para o avatar.' },
  { n: 3, name: 'Mochileiro', min: 350, reward: 'gravata', perk: 'Ganha a Gravata-borboleta.' },
  { n: 4, name: 'Explorador', min: 600, reward: 'oculos', perk: 'Ganha os Óculos de aviador.' },
  { n: 5, name: 'Globetrotter', min: 900, reward: 'quepe', perk: 'Ganha o Quepe de piloto.' },
  { n: 6, name: 'Embaixador', min: 1500, reward: 'kit', perk: 'Ganha o Kit Embaixador (quepe + gravata) e o título máximo.' },
];

/** Como ganhar milhas (texto para a tela de níveis). */
export const HOW_TO_EARN: [string, string][] = [
  ['Carimbar uma vacina', '+15'],
  ['Carimbar vermífugo, antipulgas, remédio ou exame', '+10'],
  ['Cada item da rotina do dia (ração, passeio, água…)', '+2'],
  ['Completar a rotina do dia inteira', '+10'],
  ['Registro no diário de vida (até 3 por dia)', '+10'],
  ['Pergunta ao Guia IA (até 3 por dia)', '+10'],
  ['Registrar o peso (1 vez por semana)', '+5'],
];

export function levelFor(totalMiles: number): Level {
  let lv = LEVELS[0];
  for (const l of LEVELS) if (totalMiles >= l.min) lv = l;
  return lv;
}

export function nextLevel(totalMiles: number): Level | null {
  return LEVELS.find((l) => l.min > totalMiles) ?? null;
}

// ------------------------------------------------------------------ miles
export const MILES: Record<Exclude<LedgerOrigin, 'dutyfree'>, number> = {
  boas_vindas: 100,
  cuidado: 10, // default; vacinas use care.miles (15)
  peso: 5,
  foto: 10,
  guia: 10,
  racao: 2,
  rotina: 2,
  dia_completo: 10,
};

export function earned(base: number, plan: Plan, origin: LedgerOrigin): number {
  if (origin === 'boas_vindas' || origin === 'dutyfree') return base;
  return plan === 'economica' ? base : base * 2;
}

export function milesTotals(ledger: LedgerEntry[]) {
  let total = 0;
  let spent = 0;
  for (const e of ledger) {
    if (e.miles >= 0) total += e.miles;
    else spent += -e.miles;
  }
  return { total, spent, balance: total - spent };
}

// ------------------------------------------------------------------ mood
export function moodFor(cares: Care[], today: string): Mood {
  let mood: Mood = 'feliz';
  for (const c of cares) {
    const s = careStatus(c, today);
    if (s === 'atrasado') return 'triste';
    if (s === 'atencao') mood = 'neutro';
  }
  return mood;
}

// ------------------------------------------------------------------ streak
/**
 * Consecutive days (ending today, or yesterday if nothing happened yet today) with at least
 * one earning activity. Any overdue care resets the streak to 0.
 */
export function streakFor(ledger: LedgerEntry[], cares: Care[], today: string): number {
  if (cares.some((c) => careStatus(c, today) === 'atrasado')) return 0;
  const days = new Set(ledger.filter((e) => e.miles > 0 && e.origin !== 'boas_vindas').map((e) => e.day));
  let cursor = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

// ------------------------------------------------------------------ check-in de hoje (missões)
export type CheckinKind = 'racao' | 'peso' | 'foto' | 'guia' | 'carimbo';
export interface Checkin { key: string; kind: CheckinKind; label: string; miles: number; done: boolean; ref?: string }

function seeded(day: string): number {
  let h = 7;
  for (const ch of day) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function checkinsFor(pet: Pet, data: PetData, today: string): Checkin[] {
  const todays = data.ledger.filter((e) => e.day === today && e.miles > 0);
  const has = (origin: LedgerOrigin, ref?: string) => todays.some((e) => e.origin === origin && (ref === undefined || e.ref === ref));
  const list: Checkin[] = [];
  const meal = pet.mealTimes[0];
  const g = gramsPerMeal(pet);
  if (meal) list.push({ key: `racao-${meal}`, kind: 'racao', label: `Dar a ração das ${meal}${g ? ` · ${g} g` : ''}`, miles: MILES.racao, done: has('racao', meal), ref: meal });

  const lastWeigh = [...data.weights].sort((a, b) => b.day.localeCompare(a.day))[0];
  const pool: Checkin[] = [
    { key: 'carimbo', kind: 'carimbo', label: 'Carimbar um cuidado do itinerário', miles: 10, done: has('cuidado') },
    { key: 'foto', kind: 'foto', label: `Escrever no diário de vida ${art(pet).do} ${pet.name}`, miles: MILES.foto, done: has('foto') },
    { key: 'guia', kind: 'guia', label: 'Tirar uma dúvida com o Guia de bordo', miles: MILES.guia, done: has('guia') },
  ];
  if (!lastWeigh || diffDays(lastWeigh.day, today) >= 7 || lastWeigh.day === today) {
    pool.unshift({ key: 'peso', kind: 'peso', label: 'Registrar o peso da semana', miles: MILES.peso, done: has('peso') });
  }
  const seed = seeded(today);
  const rotated = pool.map((c, i) => ({ c, k: (i * 7 + seed) % 11 })).sort((a, b) => a.k - b.k).map((x) => x.c);
  for (const c of rotated) {
    if (list.length >= 3) break;
    list.push(c);
  }
  return list;
}

// ------------------------------------------------------------------ carimbos especiais (página de vistos)
export interface Special {
  id: string;
  top: string;
  bottom: string;
  main: string;
  sub: string;
  color: string;
  shape: 'circle' | 'rect';
  unlocked: boolean;
  progress: { cur: number; goal: number };
  requirement: string;
}

export function specialsFor(pet: Pet, data: PetData, today: string): Special[] {
  const count = (o: LedgerOrigin) => data.ledger.filter((e) => e.origin === o && e.miles > 0).length;
  const stamps = data.stamps.filter((s) => s.kind === 'cuidado').length;
  const vaccines = data.cares.filter((c) => c.category === 'vacina');
  const vaccinesOk = vaccines.length > 0 && vaccines.every((c) => careStatus(c, today) !== 'atrasado' && c.lastDate);
  const { total } = milesTotals(data.ledger);
  const streak = streakFor(data.ledger, data.cares, today);
  const b = fromDay(pet.birthDate);
  const issued = pet.issuedAt ? pet.issuedAt.slice(0, 10) : '';
  const bday = data.ledger.some((e) => {
    if (e.miles <= 0 || e.origin === 'boas_vindas' || e.day <= issued) return false; // não vale no dia da emissão
    const d = fromDay(e.day);
    return d.getMonth() === b.getMonth() && d.getDate() === b.getDate();
  });
  const mk = (id: string, top: string, bottom: string, main: string, sub: string, color: string, shape: 'circle' | 'rect', cur: number, goal: number, requirement: string): Special => ({
    id, top, bottom, main, sub, color, shape, unlocked: cur >= goal, progress: { cur: Math.min(cur, goal), goal }, requirement,
  });
  return [
    mk('primeiro', 'PRIMEIRO CARIMBO', 'PATAPORTE', '1º', '', '#2E5E9E', 'circle', stamps, 1, 'Carimbe o primeiro cuidado'),
    mk('vacinas', 'VACINAS', 'EM DIA', 'OK', '', '#357E4C', 'rect', vaccinesOk ? 1 : 0, 1, 'Todas as vacinas carimbadas e em dia'),
    mk('curioso', 'CURIOSO', '1ª PERGUNTA', 'IA', '', '#6A4C9C', 'circle', count('guia'), 1, 'Faça a primeira pergunta ao Guia'),
    mk('pena', 'PESO PENA', '5 PESAGENS', '5', 'KG', '#B03F29', 'rect', count('peso'), 5, 'Registre o peso 5 vezes'),
    mk('paparazzi', 'CRONISTA', '5 REGISTROS', '5', 'DIÁRIO', '#9E6C06', 'circle', count('foto'), 5, 'Faça 5 registros no diário de vida'),
    mk('maratonista', 'MARATONISTA', '15 DIAS', '15', 'DIAS', '#B03F29', 'circle', streak, 15, '15 dias seguidos sem atraso'),
    mk('globetrotter', 'GLOBETROTTER', '900 MILHAS', '900', 'MI', '#2E5E9E', 'circle', total, 900, 'Junte 900 milhas'),
    mk('aniversario', 'ANIVERSÁRIO', pet.name.toUpperCase(), 'PARABÉNS', '', '#6A4C9C', 'rect', bday ? 1 : 0, 1, 'Cuide do pet no dia do aniversário'),
  ];
}
