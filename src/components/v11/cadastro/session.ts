import { create } from 'zustand';
import type { CardItem } from '@/shared/aiPrompts';
import type { PaywallTriggerId } from '@/domain/types';

/**
 * Estado de tela do cadastro em 5 capítulos (só na memória, não vai para o servidor).
 * As RESPOSTAS de verdade ficam no `draft` do store (useApp); aqui ficam as marcações de
 * "já respondeu" de perguntas que têm valor padrão, os capítulos concluídos e o paywall
 * que só aparece DEPOIS da emissão.
 */
export interface CadastroSession {
  /** o mapa de capítulos já foi mostrado nesta emissão */
  mapSeen: boolean;
  /** capítulos carimbados (1..5) */
  done: number[];
  /** perguntas respondidas (chave livre por capítulo: 'sexo', 'p:energia', 'c:comida'…) */
  answered: Record<string, string>;
  /** vacinas/parasitas preenchidos pela leitura da carteirinha (para mostrar o selo) */
  fromCard: Record<string, boolean>;
  /** já registrou a 1ª vacina com dose real nesta emissão (analytics + paywall) */
  firstVaccineDone: boolean;
  /** paywall a mostrar depois de emitir (nunca no meio do cadastro) */
  paywallAfter: PaywallTriggerId | null;
  /** carteirinha: foto e itens lidos, entre a tela da câmera e a de conferência */
  card: { uri: string; items: CardItem[] } | null;

  answer(key: string, value: string): void;
  markDone(cap: number): void;
  set(patch: Partial<Omit<CadastroSession, 'answer' | 'markDone' | 'set' | 'reset'>>): void;
  reset(): void;
}

const EMPTY = { mapSeen: false, done: [] as number[], answered: {} as Record<string, string>, fromCard: {} as Record<string, boolean>, firstVaccineDone: false, paywallAfter: null, card: null };

export const useCadastro = create<CadastroSession>((set) => ({
  ...EMPTY,
  answer: (key, value) => set((s) => ({ answered: { ...s.answered, [key]: value } })),
  markDone: (cap) => set((s) => ({ done: s.done.includes(cap) ? s.done : [...s.done, cap] })),
  set: (patch) => set(patch),
  // o paywall pendente sobrevive ao reset: ele é consumido na tela "Passaporte emitido"
  reset: () => set((s) => ({ ...EMPTY, done: [], answered: {}, fromCard: {}, paywallAfter: s.paywallAfter })),
}));
