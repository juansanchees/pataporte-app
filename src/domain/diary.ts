import { diffDays } from './dates';
import type { DiaryEntry, DiaryKind, PetData } from './types';

/** Diário de vida: cada tipo de registro tem uma pergunta e opções prontas. */
export interface DiaryKindDef {
  k: DiaryKind;
  label: string;
  short: string;
  icon: 'star' | 'map' | 'heart' | 'drop' | 'paw' | 'bowl' | 'doc' | 'trophy' | 'check';
  question: string;
  placeholder: string;
  tags: string[];
  multi: boolean;
}

export const DIARY_KINDS: DiaryKindDef[] = [
  { k: 'momento', label: 'Momento especial', short: 'Especial', icon: 'star', question: 'O que aconteceu de especial?', placeholder: 'Ex.: primeiro dia na praia, conheceu o primo…', tags: ['Aniversário', 'Primeira vez', 'Visita', 'Presente', 'Viagem'], multi: true },
  { k: 'passeio', label: 'Passeio', short: 'Passeio', icon: 'map', question: 'Como foi o passeio?', placeholder: 'Ex.: pracinha, trilha, praia…', tags: ['15 min', '30 min', '1 hora', 'Mais de 1 hora'], multi: false },
  { k: 'saude', label: 'Saúde', short: 'Saúde', icon: 'heart', question: 'O que você notou?', placeholder: 'Descreva o que viu e desde quando', tags: ['Vômito', 'Diarreia', 'Coceira', 'Tosse', 'Mancando', 'Machucado', 'Sem apetite'], multi: true },
  { k: 'banho', label: 'Banho e tosa', short: 'Banho', icon: 'drop', question: 'O que foi feito?', placeholder: 'Onde foi? Algum produto novo?', tags: ['Banho', 'Tosa', 'Unhas', 'Ouvidos', 'Dentes'], multi: true },
  { k: 'comportamento', label: 'Comportamento', short: 'Humor', icon: 'paw', question: 'Como foi o comportamento?', placeholder: 'Ex.: ficou com medo dos fogos', tags: ['Brincalhão', 'Calmo', 'Ansioso', 'Com medo', 'Bravo', 'Carente'], multi: true },
  { k: 'alimentacao', label: 'Alimentação', short: 'Comida', icon: 'bowl', question: 'Como está comendo?', placeholder: 'Ex.: trocou para ração de adulto', tags: ['Comeu tudo', 'Comeu pouco', 'Não comeu', 'Trocou a ração', 'Petisco novo'], multi: true },
  { k: 'consulta', label: 'Consulta no vet', short: 'Vet', icon: 'doc', question: 'O que o veterinário disse?', placeholder: 'Motivo, diagnóstico e o que receitou', tags: ['Rotina', 'Vacina', 'Exame', 'Emergência', 'Retorno'], multi: true },
  { k: 'conquista', label: 'Conquista', short: 'Conquista', icon: 'trophy', question: 'O que aprendeu de novo?', placeholder: 'Ex.: aprendeu a dar a pata', tags: ['Sentar', 'Dar a pata', 'Xixi no lugar', 'Andar na guia', 'Ficar sozinho'], multi: true },
];

const ROTINA_DEF: DiaryKindDef = { k: 'rotina', label: 'Rotina do dia', short: 'Rotina', icon: 'check', question: 'Como foi o dia?', placeholder: 'Algo diferente hoje?', tags: [], multi: true };

export function kindDef(k: DiaryKind | undefined): DiaryKindDef {
  if (k === 'rotina') return ROTINA_DEF;
  return DIARY_KINDS.find((d) => d.k === k) ?? DIARY_KINDS[0];
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function monthTitle(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} de ${y}`;
}

export interface Chapter {
  month: string; // YYYY-MM
  number: number; // capítulo 1, 2, 3… contando do primeiro mês do pet
  entries: DiaryEntry[];
  stamped: { name: string; day: string }[];
  weight: { from: number; to: number } | null;
  moods: Record<'feliz' | 'normal' | 'abatido', number>;
  summary: string[];
}

/** Capítulos do mês: o que aconteceu, vacinas carimbadas e peso, do mais recente ao mais antigo. */
export function chapters(data: Pick<PetData, 'diary' | 'stamps' | 'weights'>, firstDay: string, today: string): Chapter[] {
  // capítulo 1 = mês em que o passaporte foi emitido (datas antigas do requerimento não abrem capítulos)
  const start = firstDay.slice(0, 7);
  const months = new Set<string>([today.slice(0, 7)]);
  data.diary.forEach((e) => months.add(e.day.slice(0, 7)));
  data.stamps.filter((s) => s.kind === 'cuidado').forEach((s) => months.add(s.date.slice(0, 7)));
  data.weights.forEach((w) => months.add(w.day.slice(0, 7)));
  [...months].forEach((m) => { if (m < start && !data.diary.some((e) => e.day.startsWith(m))) months.delete(m); });
  const first = [start, ...months].sort()[0];
  const idx = (ym: string) => {
    const [y1, m1] = first.split('-').map(Number);
    const [y2, m2] = ym.split('-').map(Number);
    return (y2 - y1) * 12 + (m2 - m1) + 1;
  };
  const weights = [...data.weights].sort((a, b) => a.day.localeCompare(b.day));
  return [...months].sort().reverse().map((month) => {
    const entries = data.diary.filter((e) => e.day.slice(0, 7) === month).sort((a, b) => b.day.localeCompare(a.day) || b.id.localeCompare(a.id));
    const stamped = data.stamps.filter((s) => s.kind === 'cuidado' && s.date.slice(0, 7) === month).map((s) => ({ name: s.top.charAt(0) + s.top.slice(1).toLowerCase(), day: s.date }));
    const inMonth = weights.filter((w) => w.day.slice(0, 7) === month);
    const before = weights.filter((w) => w.day.slice(0, 7) < month).pop();
    const start = before ?? inMonth[0];
    const end = inMonth[inMonth.length - 1];
    const weight = end && start ? { from: start.kg, to: end.kg } : null;
    const moods = { feliz: 0, normal: 0, abatido: 0 };
    entries.forEach((e) => { if (e.mood) moods[e.mood]++; });
    const summary: string[] = [];
    if (stamped.length) summary.push(`${stamped.length} ${stamped.length === 1 ? 'cuidado carimbado' : 'cuidados carimbados'}`);
    if (weight && inMonth.length) {
      const d = weight.to - weight.from;
      summary.push(Math.abs(d) < 0.05 ? `peso estável (${fmtKg(weight.to)})` : `${d > 0 ? 'ganhou' : 'perdeu'} ${fmtKg(Math.abs(d))}`);
    }
    const full = entries.filter((e) => e.kind === 'rotina').length;
    if (full) summary.push(`${full} ${full === 1 ? 'dia' : 'dias'} com a rotina completa`);
    const walks = entries.filter((e) => e.kind === 'passeio').length;
    if (walks) summary.push(`${walks} ${walks === 1 ? 'passeio' : 'passeios'}`);
    const health = entries.filter((e) => e.kind === 'saude' || e.kind === 'consulta').length;
    if (health) summary.push(`${health} ${health === 1 ? 'registro de saúde' : 'registros de saúde'}`);
    return { month, number: idx(month), entries, stamped, weight, moods, summary };
  });
}

export function fmtKg(kg: number): string {
  return `${(Math.round(kg * 10) / 10).toString().replace('.', ',')} kg`;
}

/** Variação de peso nos últimos ~30 dias (para o card do início). */
export function weightTrend(weights: PetData['weights'], today: string): { last: number; delta: number | null; days: number } | null {
  const list = [...weights].sort((a, b) => a.day.localeCompare(b.day));
  const last = list[list.length - 1];
  if (!last) return null;
  const ref = [...list].reverse().find((w) => diffDays(w.day, last.day) >= 21);
  return { last: last.kg, delta: ref ? last.kg - ref.kg : null, days: diffDays(last.day, today) };
}
