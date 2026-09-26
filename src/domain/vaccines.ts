import { addDays, addMonths, ageMonths, diffDays, fmtExtenso, fmtMonthYear, fmtStep, fromDay, nextSaturday } from './dates';
import type { Care, HistoryAnswer, LastAnswer, Pet, Species, VaccineAnswer } from './types';

/**
 * v1.1 — catálogo de vacinas com textos educativos e o "Plano do {pet}".
 * Regras gerais (spec §3), sempre com "confirme com o veterinário":
 * - Filhote (< 4 meses): V10 3 doses a cada 21 dias (gato: V4/V5 2–3 doses); antirrábica a partir de ~12 semanas;
 *   vermífugo todo mês até 6 meses.
 * - Adulto sem histórico (nunca / não sei): 2 doses com 21 dias e depois 1 por ano (antirrábica: 1 dose).
 * - Adulto com data: reforço 1 ano depois da última dose; se já passou, 1 dose o quanto antes.
 */

export type VaccineId = 'V10' | 'V4F' | 'ARB' | 'GRP' | 'GIA';
export type VaccineTier = 'essencial' | 'recomendada' | 'opcional';

export interface VaccineEducation {
  /** "O que é a V10?" */
  title: string;
  /** "A vacina que protege contra as doenças mais perigosas" */
  subtitle: string;
  /** 3 linhas curtas */
  lines: [string, string, string];
  /** texto do quadro "Você sabia?" (sem o prefixo) */
  didYouKnow: string;
}

export interface VaccineInfo {
  /** igual ao `code` do Care (CARE_TYPES) */
  id: VaccineId;
  species: Species[];
  /** nome curto grande na tela: "V10", "V4 ou V5", "Antirrábica" */
  short: string;
  /** nome completo (igual ao do cuidado) */
  name: string;
  /** "(Polivalente)" */
  aka?: string;
  tier: VaccineTier;
  /** 1 linha para a pergunta "O Thor já tomou a V10?" */
  protects: string;
  edu: VaccineEducation;
  /** doses da primeira vez (adulto sem histórico) */
  adultSeriesDoses: number;
  /** doses de filhote (< 4 meses); gato: 3 se < 3 meses, senão 2 */
  puppyDoses: number;
  /** intervalo entre doses da série */
  seriesIntervalDays: number;
  /** reforço (meses) */
  boosterMonths: number;
  /** filhote: idade mínima (semanas) para a 1ª dose */
  minWeeks?: number;
}

export const TIER_TAG: Record<VaccineTier, string> = { essencial: 'ESSENCIAL', recomendada: 'RECOMENDADA', opcional: 'OPCIONAL' };

/** "ESSENCIAL · TODO CÃO PRECISA" */
export function tierLabel(tier: VaccineTier, species: Species): string {
  if (tier === 'essencial') return `ESSENCIAL · TODO ${species === 'dog' ? 'CÃO' : 'GATO'} PRECISA`;
  if (tier === 'recomendada') return 'RECOMENDADA · CONVIVE COM OUTROS CÃES';
  return 'OPCIONAL · PERGUNTE AO VETERINÁRIO';
}

export const VACCINES: VaccineInfo[] = [
  {
    id: 'V10', species: ['dog'], short: 'V10', name: 'V8 ou V10 (múltipla)', aka: '(Polivalente)', tier: 'essencial',
    protects: 'Protege contra cinomose e parvovirose',
    edu: {
      title: 'O que é a V10?',
      subtitle: 'A vacina que protege contra as doenças mais perigosas',
      lines: ['Protege contra cinomose, parvovirose e mais 8 doenças', 'Essas doenças podem matar, principalmente filhotes', 'Filhote: 3 doses. Depois: 1 vez por ano'],
      didYouKnow: 'Muita gente só dá a antirrábica. A V10 é tão importante quanto.',
    },
    adultSeriesDoses: 2, puppyDoses: 3, seriesIntervalDays: 21, boosterMonths: 12, minWeeks: 6,
  },
  {
    id: 'ARB', species: ['dog', 'cat'], short: 'Antirrábica', name: 'Antirrábica', tier: 'essencial',
    protects: 'Protege contra a raiva',
    edu: {
      title: 'O que é a antirrábica?',
      subtitle: 'A vacina contra a raiva',
      lines: ['A raiva não tem cura e também pega em pessoas', 'É obrigatória por lei e pedida em qualquer viagem', 'Filhote: 1 dose a partir de 3 meses. Depois: 1 vez por ano'],
      didYouKnow: 'Vacinar o pet contra a raiva protege a família toda.',
    },
    adultSeriesDoses: 1, puppyDoses: 1, seriesIntervalDays: 21, boosterMonths: 12, minWeeks: 12,
  },
  {
    id: 'GRP', species: ['dog'], short: 'Gripe canina', name: 'Gripe canina', tier: 'recomendada',
    protects: 'Protege contra a tosse dos canis',
    edu: {
      title: 'O que é a gripe canina?',
      subtitle: 'A vacina contra a tosse dos canis',
      lines: ['Protege contra uma tosse forte que passa de cão para cão', 'Importante para quem vai a creche, hotel, banho e tosa ou parque', 'Primeira vez: 2 doses. Depois: 1 vez por ano'],
      didYouKnow: 'A tosse dos canis pega pelo ar, como a nossa gripe.',
    },
    adultSeriesDoses: 2, puppyDoses: 2, seriesIntervalDays: 21, boosterMonths: 12, minWeeks: 8,
  },
  {
    id: 'GIA', species: ['dog'], short: 'Giárdia', name: 'Giárdia', tier: 'opcional',
    protects: 'Ajuda a prevenir a giárdia',
    edu: {
      title: 'O que é a vacina da giárdia?',
      subtitle: 'Ajuda contra um parasita que causa diarreia',
      lines: ['A giárdia é um parasita do intestino que causa diarreia', 'Pega pela água, terra ou fezes contaminadas', 'Primeira vez: 2 doses. Depois: 1 vez por ano'],
      didYouKnow: 'Nem todo cão precisa. Pergunte ao veterinário se vale para o seu.',
    },
    adultSeriesDoses: 2, puppyDoses: 2, seriesIntervalDays: 21, boosterMonths: 12, minWeeks: 8,
  },
  {
    id: 'V4F', species: ['cat'], short: 'V4 ou V5', name: 'V4 ou V5 felina (múltipla)', tier: 'essencial',
    protects: 'Protege contra rinotraqueíte, calicivírus e panleucopenia',
    edu: {
      title: 'O que é a V4/V5?',
      subtitle: 'A vacina principal do gato',
      lines: ['Protege contra rinotraqueíte, calicivírus e panleucopenia', 'A V5 protege também contra a leucemia felina (FeLV)', 'Filhote: 2 a 3 doses. Depois: 1 vez por ano'],
      didYouKnow: 'Gato que não sai de casa também precisa: o vírus entra na roupa e no sapato.',
    },
    adultSeriesDoses: 2, puppyDoses: 3, seriesIntervalDays: 21, boosterMonths: 12, minWeeks: 8,
  },
];

/** Vacinas da espécie, na ordem das telas do cadastro (essenciais primeiro). */
export function vaccinesFor(species: Species): VaccineInfo[] {
  const order: VaccineId[] = species === 'dog' ? ['V10', 'ARB', 'GRP', 'GIA'] : ['V4F', 'ARB'];
  return order.map((id) => VACCINES.find((v) => v.id === id)!);
}

export function vaccineById(id: string): VaccineInfo | undefined {
  return VACCINES.find((v) => v.id === id);
}

/** "O Thor já tomou a V10?" */
export function vaccineQuestion(pet: Pick<Pet, 'name' | 'sex'>, v: VaccineInfo): string {
  const o = pet.sex === 'F' ? 'A' : 'O';
  const a = v.id === 'ARB' ? 'a antirrábica' : v.id === 'GRP' ? 'a vacina da gripe' : v.id === 'GIA' ? 'a vacina da giárdia' : `a ${v.short}`;
  return `${o} ${pet.name} já tomou ${a}?`;
}

// ------------------------------------------------------------------ idade
/** Filhote = menos de 4 meses (regra das vacinas de filhote). */
export function isPuppy(pet: Pick<Pet, 'birthDate'>, today: string): boolean {
  return !!pet.birthDate && ageMonths(pet.birthDate, today) < 4;
}

/** Menos de 6 meses (vermífugo todo mês). */
export function isYoung(pet: Pick<Pet, 'birthDate'>, today: string): boolean {
  return !!pet.birthDate && ageMonths(pet.birthDate, today) < 6;
}

/** "3 meses", "1 ano", "3 anos" */
export function ageLabel(birth: string, today: string): string {
  const m = ageMonths(birth, today);
  if (m < 1) { const w = Math.max(0, Math.floor(diffDays(birth, today) / 7)); return `${w} ${w === 1 ? 'semana' : 'semanas'}`; }
  if (m < 12) return `${m} ${m === 1 ? 'mês' : 'meses'}`;
  const y = Math.floor(m / 12);
  return `${y} ${y === 1 ? 'ano' : 'anos'}`;
}

// ------------------------------------------------------------------ respostas
export interface ResolvedLast {
  /** data (real ou estimada) da última dose */
  date?: string;
  approx: boolean;
  /** true = tomou; false = nunca; undefined = não sabe */
  had?: boolean;
}

/**
 * Converte a resposta "Quando foi?" numa data.
 * - data: a própria data · mes: dia 15 daquele mês (nunca no futuro)
 * - não lembro · menos de 1 ano: ~6 meses atrás · menos de 1 mês: ~15 dias atrás
 * - não lembro · mais de 1 ano / mais de 1 mês: sem data (tomou, mas venceu)
 */
export function resolveLast(a: LastAnswer | undefined, today: string): ResolvedLast {
  if (!a) return { approx: false };
  switch (a.kind) {
    case 'data': return { date: a.date > today ? today : a.date, approx: false, had: true };
    case 'mes': {
      const d = `${a.year}-${String(a.month).padStart(2, '0')}-15`;
      return { date: d > today ? today : d, approx: true, had: true };
    }
    case 'naolembro':
      if (a.within === 'menos1ano') return { date: addMonths(today, -6), approx: true, had: true };
      if (a.within === 'menos1mes') return { date: addDays(today, -15), approx: true, had: true };
      return { approx: true, had: true };
    case 'nunca': return { approx: false, had: false };
    default: return { approx: false };
  }
}

// ------------------------------------------------------------------ plano
export type PlanStatus = 'em_dia' | 'faltando' | 'opcional';

export interface PlanOptions {
  /** datas sugeridas caem no sábado (padrão true). false = a partir de amanhã. */
  saturdays?: boolean;
}

/** Grade de datas sugeridas: 1º sábado depois de hoje e a cada 21 dias. */
export function planSlots(today: string, count = 8, opts: PlanOptions = {}, interval = 21): string[] {
  const first = opts.saturdays === false ? addDays(today, 1) : nextSaturday(today);
  return Array.from({ length: count }, (_, i) => addDays(first, i * interval));
}

export interface PlanItem {
  vaccine: VaccineInfo;
  status: PlanStatus;
  answer?: VaccineAnswer;
  last?: string;
  lastApprox: boolean;
  /** doses sugeridas ainda por tomar (vazio se em dia ou opcional) */
  doses: string[];
  /** próxima data: 1ª dose sugerida (faltando) ou reforço (em dia) */
  nextDate?: string;
  /** reforço anual depois da série */
  boosterDate?: string;
  /** "Em dia · reforço em março de 2027" · "Faltando · 2 doses" · "Opcional · pergunte ao veterinário" */
  line: string;
}

export interface PlanDose {
  vaccineId: VaccineId;
  short: string;
  dose: number; // 1-based
  totalDoses: number;
  tier: VaccineTier;
  /** "V10 · 1ª dose" */
  label: string;
}

export interface PlanStep {
  n: number;
  date: string;
  /** "Sáb, 3 de outubro" */
  dateLabel: string;
  doses: PlanDose[];
  /** "Vermífugo" (filhote) */
  extras: string[];
  /** "V10 · 2ª dose · Gripe canina · 1ª dose" / "V10 · 1ª dose + Vermífugo" */
  title: string;
  /** maior prioridade do passo */
  tier: VaccineTier;
}

export interface VaccinePlan {
  puppy: boolean;
  counts: { emDia: number; faltando: number; opcional: number };
  items: PlanItem[];
  steps: PlanStep[];
  /** filhote: vermífugo todo mês até esta data */
  puppyDeworm?: { until: string; label: string };
  /** chips do plano do filhote: [{ value: '3 doses', label: 'V10' }, …] */
  chips: { value: string; label: string }[];
  /** SEMPRE true: mostrar "Leve este plano ao veterinário. Ele pode ajustar as datas." */
  confirmWithVet: true;
  vetNote: string;
}

const ORD = (n: number) => `${n}ª dose`;
const TIER_RANK: Record<VaccineTier, number> = { essencial: 0, recomendada: 1, opcional: 2 };

function firstSlotIndex(slots: string[], minDate: string | undefined): number {
  if (!minDate) return 0;
  const i = slots.findIndex((s) => s >= minDate);
  return i < 0 ? slots.length - 1 : i;
}

function puppyDosesFor(v: VaccineInfo, pet: Pick<Pet, 'birthDate' | 'species'>, today: string): number {
  if (v.id === 'V4F') return ageMonths(pet.birthDate, today) < 3 ? 3 : 2;
  return v.puppyDoses;
}

interface Eval { status: PlanStatus; last?: string; approx: boolean; had?: boolean; mode: 'em_dia' | 'reforco' | 'serie' }

function evaluate(v: VaccineInfo, answer: VaccineAnswer | undefined, today: string, puppy: boolean): Eval {
  const r = resolveLast(answer, today);
  if (r.date) {
    const next = addMonths(r.date, v.boosterMonths);
    // filhote com 1 dose registrada ainda precisa terminar a série
    if (puppy && v.id !== 'ARB') return { status: v.tier === 'opcional' ? 'opcional' : 'faltando', last: r.date, approx: r.approx, had: true, mode: 'serie' };
    if (next >= today) return { status: 'em_dia', last: r.date, approx: r.approx, had: true, mode: 'em_dia' };
    return { status: v.tier === 'opcional' ? 'opcional' : 'faltando', last: r.date, approx: r.approx, had: true, mode: 'reforco' };
  }
  if (r.had) return { status: v.tier === 'opcional' ? 'opcional' : 'faltando', approx: true, had: true, mode: puppy ? 'serie' : 'reforco' };
  return { status: v.tier === 'opcional' ? 'opcional' : 'faltando', approx: false, had: r.had, mode: 'serie' };
}

/**
 * Plano de vacinas a partir das respostas do cadastro (Vac-Plano / Filhote-Plano).
 * `answers` é indexado pelo id da vacina ('V10', 'ARB', …). Sem resposta = "não sei".
 */
export function vaccinePlan(pet: Pick<Pet, 'species' | 'birthDate' | 'name'>, answers: Partial<Record<string, VaccineAnswer>>, today: string, opts: PlanOptions = {}): VaccinePlan {
  const puppy = isPuppy(pet, today);
  const slots = planSlots(today, 12, opts);
  const list = vaccinesFor(pet.species);
  const items: PlanItem[] = [];
  const placed: { v: VaccineInfo; slot: number; dose: number; total: number }[] = [];
  const minAge = (v: VaccineInfo) => (v.minWeeks && pet.birthDate ? addDays(pet.birthDate, v.minWeeks * 7) : undefined);

  // 1) essenciais múltiplas (V10 / V4-V5)
  let lastMultiSlot = -1;
  let anyAtZero = false;
  const evals = new Map<VaccineId, Eval>();
  for (const v of list) evals.set(v.id, evaluate(v, answers[v.id], today, puppy));

  const schedule = (v: VaccineInfo, startSlot: number, total: number, firstDoseNumber = 1) => {
    const dates: string[] = [];
    for (let k = 0; k < total; k++) {
      const s = Math.min(startSlot + k, slots.length - 1);
      placed.push({ v, slot: s, dose: firstDoseNumber + k, total: firstDoseNumber - 1 + total });
      dates.push(slots[s]);
      if (s === 0) anyAtZero = true;
    }
    return dates;
  };

  const doses = new Map<VaccineId, string[]>();
  for (const v of list.filter((x) => x.tier === 'essencial' && x.id !== 'ARB')) {
    const e = evals.get(v.id)!;
    if (e.status !== 'faltando') continue;
    let start = firstSlotIndex(slots, minAge(v));
    let total = e.mode === 'reforco' ? 1 : puppy ? puppyDosesFor(v, pet, today) : v.adultSeriesDoses;
    let firstNumber = 1;
    if (puppy && e.last) {
      // já tomou 1 dose: continua a série 21 dias depois
      total = Math.max(1, total - 1);
      firstNumber = 2;
      start = Math.max(start, firstSlotIndex(slots, addDays(e.last, v.seriesIntervalDays)));
    }
    const ds = schedule(v, start, total, firstNumber);
    doses.set(v.id, ds);
    lastMultiSlot = Math.max(lastMultiSlot, slots.indexOf(ds[ds.length - 1]));
  }

  // 2) antirrábica: adulto no 1º passo; filhote junto com a última dose da múltipla (nunca antes de 12 semanas)
  const arb = list.find((v) => v.id === 'ARB')!;
  const eArb = evals.get('ARB')!;
  if (eArb.status === 'faltando') {
    const minSlot = firstSlotIndex(slots, minAge(arb));
    const slot = puppy ? Math.max(minSlot, lastMultiSlot) : Math.max(0, pet.birthDate ? minSlot : 0);
    doses.set('ARB', schedule(arb, slot, 1));
  }

  // 3) recomendadas: começam no passo seguinte ao das essenciais (adulto) ou junto da última dose (filhote)
  for (const v of list.filter((x) => x.tier === 'recomendada')) {
    const e = evals.get(v.id)!;
    if (e.status !== 'faltando') continue;
    const base = puppy ? Math.max(0, lastMultiSlot) : anyAtZero ? 1 : 0;
    const start = Math.max(base, firstSlotIndex(slots, minAge(v)));
    const total = e.mode === 'reforco' ? 1 : v.adultSeriesDoses;
    doses.set(v.id, schedule(v, start, total));
  }

  // 4) itens (na ordem das telas)
  const counts = { emDia: 0, faltando: 0, opcional: 0 };
  for (const v of list) {
    const e = evals.get(v.id)!;
    const ds = doses.get(v.id) ?? [];
    let nextDate: string | undefined;
    let boosterDate: string | undefined;
    let line: string;
    if (e.status === 'em_dia') {
      counts.emDia++;
      nextDate = addMonths(e.last!, v.boosterMonths);
      line = `Em dia · reforço em ${fmtMonthYear(nextDate)}`;
    } else if (e.status === 'opcional') {
      counts.opcional++;
      line = 'Opcional · pergunte ao veterinário';
    } else {
      counts.faltando++;
      nextDate = ds[0];
      boosterDate = ds.length ? addMonths(ds[ds.length - 1], v.boosterMonths) : undefined;
      line = ds.length > 1 ? `Faltando · ${ds.length} doses` : e.mode === 'reforco' ? 'Reforço atrasado · 1 dose' : 'Faltando · 1 dose';
    }
    items.push({ vaccine: v, status: e.status, answer: answers[v.id], last: e.last, lastApprox: e.approx, doses: ds, nextDate, boosterDate, line });
  }

  // 5) passos da linha do tempo
  const bySlot = new Map<number, PlanDose[]>();
  for (const p of placed) {
    const d: PlanDose = { vaccineId: p.v.id, short: p.v.short, dose: p.dose, totalDoses: p.total, tier: p.v.tier, label: p.total > 1 || p.dose > 1 ? `${p.v.short} · ${ORD(p.dose)}` : p.v.short };
    bySlot.set(p.slot, [...(bySlot.get(p.slot) ?? []), d]);
  }
  const young = isYoung(pet, today);
  const steps: PlanStep[] = [...bySlot.entries()].sort((a, b) => a[0] - b[0]).map(([slot, ds], i) => {
    ds.sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]);
    const extras = puppy && young && i === 0 ? ['Vermífugo'] : [];
    const title = [ds.map((d) => d.label).join(' · '), ...extras].join(' + ');
    return { n: i + 1, date: slots[slot], dateLabel: fmtStep(slots[slot]), doses: ds, extras, title, tier: ds[0].tier };
  });

  const chips: { value: string; label: string }[] = [];
  if (puppy) {
    for (const it of items) if (it.doses.length && it.vaccine.tier === 'essencial') chips.push({ value: `${it.doses.length} ${it.doses.length === 1 ? 'dose' : 'doses'}`, label: it.vaccine.id === 'ARB' ? 'antirrábica' : it.vaccine.short });
    if (young) chips.push({ value: 'todo mês', label: 'vermífugo' });
  }

  return {
    puppy,
    counts,
    items,
    steps,
    ...(puppy && young && pet.birthDate ? { puppyDeworm: { until: addMonths(pet.birthDate, 6), label: 'Todo mês até 6 meses' } } : {}),
    chips,
    confirmWithVet: true,
    vetNote: puppy ? 'O veterinário pode ajustar as datas pela idade exata.' : 'Leve este plano ao veterinário. Ele pode ajustar as datas.',
  };
}

export interface NextDose {
  /** YYYY-MM-DD; undefined = opcional / sem sugestão */
  date?: string;
  /** "14 de março de 2027" · "por volta de março de 2027" · "Pergunte ao veterinário" */
  label: string;
  status: PlanStatus;
  approx: boolean;
  /** o reforço já venceu (a data é a sugestão para tomar logo) */
  overdue: boolean;
}

/**
 * "Próxima dose: …" mostrado na hora, logo depois de responder uma vacina.
 * Usa as mesmas regras do vaccinePlan (vacina isolada; antirrábica de filhote não espera a múltipla).
 */
export function nextDoseFromAnswer(answer: VaccineAnswer | undefined, vaccine: VaccineInfo | VaccineId, pet: Pick<Pet, 'species' | 'birthDate' | 'name'>, today: string, opts: PlanOptions = {}): NextDose {
  const v = typeof vaccine === 'string' ? vaccineById(vaccine)! : vaccine;
  const plan = vaccinePlan({ ...pet, species: v.species.includes(pet.species) ? pet.species : v.species[0] }, { [v.id]: answer }, today, opts);
  const it = plan.items.find((x) => x.vaccine.id === v.id)!;
  const e = evaluate(v, answer, today, plan.puppy);
  let date = it.nextDate;
  // vacina isolada: a antirrábica do filhote vai para o 1º sábado com 12 semanas
  if (v.id === 'ARB' && plan.puppy && it.status === 'faltando' && pet.birthDate && v.minWeeks) {
    const min = addDays(pet.birthDate, v.minWeeks * 7);
    const first = planSlots(today, 1, opts)[0];
    date = min <= first ? first : opts.saturdays === false ? min : nextSaturday(addDays(min, -1));
  }
  if (it.status === 'opcional' && !date) {
    return { label: 'Pergunte ao veterinário', status: 'opcional', approx: false, overdue: false };
  }
  const approxLabel = it.status === 'em_dia' && answer?.kind === 'naolembro';
  return {
    date,
    label: date ? (approxLabel ? `por volta de ${fmtMonthYear(date)}` : fmtExtenso(date)) : 'Pergunte ao veterinário',
    status: it.status,
    approx: e.approx,
    overdue: e.mode === 'reforco' && it.status !== 'em_dia',
  };
}

/** Datas que viram agenda ao tocar "Colocar tudo na agenda": por vacina, a série sugerida. */
export function planSeries(plan: VaccinePlan): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const it of plan.items) if (it.doses.length) out[it.vaccine.id] = [...it.doses];
  return out;
}

/** Utilitário para testes/telas: dia da semana 0–6 de um YYYY-MM-DD. */
export function weekday(day: string): number {
  return fromDay(day).getDay();
}


// ------------------------------------------------------------------ resposta → cuidado (Care)
export function historyAnswerOf(a: VaccineAnswer | undefined): HistoryAnswer | null {
  if (!a) return null;
  if (a.kind === 'nunca') return 'nao';
  if (a.kind === 'naosei') return 'naosei';
  return 'tomei';
}

/**
 * Aplica a resposta da vacina ao cuidado (Care) correspondente.
 * - data/mês: entra no histórico (mês = aproximado); próxima = reforço ou série.
 * - "não lembro": sem dose com data inventada; próxima estimada (lastApprox).
 * - nunca/não sei: próxima = 1ª dose sugerida; `series` guarda as doses seguintes planejadas.
 * - opcional não tomada: fica inativa (sem data) — "pergunte ao veterinário".
 * `seriesDates` (do vaccinePlan) substitui a data isolada quando informado.
 */
export function applyVaccineAnswer(care: Care, answer: VaccineAnswer, pet: Pick<Pet, 'species' | 'birthDate' | 'name'>, today: string, seriesDates?: string[], opts: PlanOptions = {}): Care {
  const v = vaccineById(care.code);
  const r = resolveLast(answer, today);
  const nd = v ? nextDoseFromAnswer(answer, v, pet, today, opts) : undefined;
  const realDate = answer.kind === 'data' || answer.kind === 'mes' ? r.date : undefined;
  const history = realDate ? Array.from(new Set([...(care.history ?? (care.lastDate ? [care.lastDate] : [])), realDate])).sort() : care.history ?? (care.lastDate ? [care.lastDate] : []);
  const last = history.length ? history[history.length - 1] : null;
  const { series: _old, lastApprox: _a, ...rest } = care;
  const out: Care = { ...rest, vaccineAnswer: answer, answer: historyAnswerOf(answer), history, lastDate: last };
  if (r.approx) out.lastApprox = true;
  const dates = seriesDates?.length ? seriesDates : nd?.date ? [nd.date] : [];
  if (nd?.status === 'opcional' && !dates.length) return { ...out, nextDate: null, active: false };
  out.nextDate = dates[0] ?? addDays(today, 14);
  out.active = true;
  if (dates.length > 1) out.series = dates;
  return out;
}
