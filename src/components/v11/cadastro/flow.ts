import { router } from 'expo-router';
import { useApp, type Draft } from '@/store/app';
import { track } from '@/services/analytics';
import { MONTH_NAMES, parseBR, today, addDays, fromDay } from '@/domain/dates';
import type { Pet, VaccineAnswer } from '@/domain/types';
import { vaccinesFor } from '@/domain/vaccines';
import { useCadastro } from './session';

/** O pet "de mentira" montado a partir do rascunho (para as regras de vacina e as frases). */
export function draftPet(d: Draft): Pick<Pet, 'species' | 'birthDate' | 'name' | 'sex'> {
  return { species: d.species, birthDate: parseBR(d.birth) ?? addDays(today(), -365), name: d.name.trim() || (d.species === 'dog' ? 'seu cão' : 'seu gato'), sex: d.sex };
}

/** "o Thor" / "a Mel" / "o seu pet" */
export function petRef(d: Pick<Draft, 'name' | 'sex' | 'species'>): { o: string; do: string; nome: string; O: string } {
  const n = d.name.trim();
  if (!n) return { o: 'o seu pet', do: 'do seu pet', nome: 'seu pet', O: 'O seu pet' };
  const f = d.sex === 'F';
  return { o: `${f ? 'a' : 'o'} ${n}`, do: `${f ? 'da' : 'do'} ${n}`, nome: n, O: `${f ? 'A' : 'O'} ${n}` };
}

/** "26 SET 2026" */
export function stampDate(day: string): string {
  const d = fromDay(day);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTH_NAMES[d.getMonth()].slice(0, 3).toUpperCase()} ${d.getFullYear()}`;
}

/** "20 ago" */
export function shortDate(day: string): string {
  const d = fromDay(day);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
}

/** Abre o 1º passo de um capítulo. */
export function startChapter(n: number) {
  switch (n) {
    case 1: return router.push('/emissao/foto');
    case 2: return router.push({ pathname: '/emissao/personalidade', params: { q: '0' } });
    case 3: return router.push({ pathname: '/emissao/mapa', params: { cap: '3' } });
    case 4: return router.push({ pathname: '/emissao/parasita', params: { kind: 'antipulgas', fase: 'quando' } });
    default: return router.push({ pathname: '/emissao/cuidados', params: { q: 'checkup' } });
  }
}

/** 1ª pergunta do capítulo de vacinas (depois da carteirinha, abre direto na pergunta se já veio preenchida). */
export function startVaccines(replace = false) {
  const d = useApp.getState().draft;
  const first = vaccinesFor(d.species)[0];
  const pre = !!d.vaccineAnswers?.[first.id];
  const href = { pathname: '/emissao/vacina' as const, params: { i: '0', fase: pre ? 'pergunta' : 'explica' } };
  if (replace) router.replace(href); else router.push(href);
}

/** Fecha o capítulo: analytics + tela do carimbo. */
export function finishChapter(cap: number) {
  useCadastro.getState().markDone(cap);
  track('cadastro_capitulo_concluido', { capitulo: cap });
  router.push({ pathname: '/emissao/carimbo', params: { cap: String(cap) } });
}

/** Resposta com dose de verdade (data ou mês). */
export function isRealDose(a: VaccineAnswer | undefined | null): boolean {
  return !!a && (a.kind === 'data' || a.kind === 'mes');
}

/**
 * Registrou uma vacina com dose real durante o cadastro: analytics e, na 1ª vez, pergunta ao domínio
 * se há paywall "primeira_vacina". O paywall NÃO aparece agora: fica guardado para depois da emissão.
 */
export function noteVaccine(id: string, a: VaccineAnswer) {
  if (!isRealDose(a)) return;
  track('vacina_registrada', { vacina: id, origem: 'cadastro' });
  notePrimeira();
}

/** 1ª vacina com dose real nesta emissão: evento + paywall guardado para depois de emitir. */
export function notePrimeira() {
  const s = useCadastro.getState();
  if (s.firstVaccineDone) return;
  s.set({ firstVaccineDone: true });
  track('primeira_vacina', { origem: 'cadastro' });
  const pw = useApp.getState().paywallFor('primeira_vacina');
  if (pw) s.set({ paywallAfter: pw });
}
