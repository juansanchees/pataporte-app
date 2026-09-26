import { LEVELS, levelFor, milesTotals } from './gamification';
import type { LedgerEntry, Pet, Plan } from './types';

// ------------------------------------------------------------------ classes (planos)
/**
 * v1 grátis: sem planos pagos. Tudo liberado para todos, com um limite justo de uso da IA.
 * Para a v1.1 (cobrança pelas lojas), troque para true.
 */
export const PAID_PLANS = false;
const FREE_V1 = { maxPets: 5, guideMonthly: 30, photoMonthly: 20, pdf: true, exclusive: true, guardians: 1 };
/** Família (vários tutores no mesmo pet) ainda não foi construída: fica escondida. */
export const FAMILY_PLAN = false;
export interface PlanInfo { id: Plan; name: string; seat: string; price: string; cents: string; per: string; yearly?: string; pitch: string; features: string[]; hidden?: boolean }

export const PLANS: PlanInfo[] = [
  { id: 'economica', name: 'Econômica', seat: '32C', price: 'Grátis', cents: '', per: 'para sempre', pitch: 'Para começar e cuidar de 1 pet.', features: ['1 passaporte', 'Vacinas, cronograma e lembretes', 'Rotina do dia e diário de vida', 'Guia IA: 5 perguntas por mês', 'Leitura de foto com IA: 3 por mês', 'Resumo para o vet na tela do celular'] },
  { id: 'primeira', name: 'Primeira Classe', seat: '1A', price: 'R$ 27', cents: ',00', per: 'por mês', yearly: 'ou R$ 197 por ano (sai R$ 16,42 por mês)', pitch: 'Tudo liberado. Teste 7 dias grátis.', features: ['Passaportes ilimitados', 'Guia IA à vontade, com foto e voz', 'Leitura de foto com IA à vontade', 'Resumo em PDF para enviar ao vet', 'Milhas em dobro', 'Itens exclusivos no Duty Free'] },
  { id: 'familia', name: 'Passaporte Família', seat: '2B', price: 'R$ 37', cents: ',00', per: 'por mês', pitch: 'Para dividir os cuidados com a casa toda.', features: ['Tudo da Primeira Classe', 'Até 5 tutores no mesmo pet', 'Rotina e vacinas compartilhadas'], hidden: !FAMILY_PLAN },
];
/** Planos que aparecem na tela "Escolha sua classe". */
export const SHOWN_PLANS = PLANS.filter((p) => !p.hidden);

/** "À vontade" = limite alto de uso justo (a IA custa por uso). */
export const LIMITS: Record<Plan, { maxPets: number; guideMonthly: number; photoMonthly: number; pdf: boolean; exclusive: boolean; guardians: number }> = !PAID_PLANS ? { economica: FREE_V1, primeira: FREE_V1, familia: FREE_V1 } : {
  economica: { maxPets: 1, guideMonthly: 5, photoMonthly: 3, pdf: false, exclusive: false, guardians: 1 },
  primeira: { maxPets: Infinity, guideMonthly: 200, photoMonthly: 50, pdf: true, exclusive: true, guardians: 1 },
  familia: { maxPets: Infinity, guideMonthly: 200, photoMonthly: 50, pdf: true, exclusive: true, guardians: 5 },
};

export function planName(p: Plan): string {
  return PLANS.find((x) => x.id === p)!.name;
}

export function canAddPet(plan: Plan, currentPets: number): boolean {
  return currentPets < LIMITS[plan].maxPets;
}

// ------------------------------------------------------------------ duty free
export type Layer = 'cabeca' | 'olhos' | 'pescoco';
export interface DutyItem { id: string; name: string; price: number; layers: Layer[]; acc: string[]; minLevel?: number; firstClass?: boolean }

export const DUTY_ITEMS: DutyItem[] = [
  { id: 'bandana', name: 'Bandana', price: 150, layers: ['pescoco'], acc: ['bandana'] },
  { id: 'oculos', name: 'Óculos de aviador', price: 200, layers: ['olhos'], acc: ['oculos'] },
  { id: 'gravata', name: 'Gravata-borboleta', price: 250, layers: ['pescoco'], acc: ['gravata'] },
  { id: 'quepe', name: 'Quepe de piloto', price: 300, layers: ['cabeca'], acc: ['quepe'] },
  { id: 'coleira', name: 'Coleira dourada', price: 400, layers: ['pescoco'], acc: ['coleira'], firstClass: true },
  { id: 'kit', name: 'Kit Embaixador', price: 1500, layers: ['cabeca', 'pescoco'], acc: ['quepe', 'gravata'], minLevel: 6 },
];

export function itemById(id: string): DutyItem | undefined {
  return DUTY_ITEMS.find((i) => i.id === id);
}

export type ItemState = 'equipado' | 'na_mala' | 'comprar' | 'sem_saldo' | 'bloqueado_nivel' | 'bloqueado_classe';

export function itemState(item: DutyItem, pet: Pet, ledger: LedgerEntry[], plan: Plan): ItemState {
  if (pet.equipped.includes(item.id)) return 'equipado';
  if (pet.owned.includes(item.id)) return 'na_mala';
  const { total, balance } = milesTotals(ledger);
  if (PAID_PLANS && item.firstClass && plan === 'economica') return 'bloqueado_classe';
  if (item.minLevel && levelFor(total).n < item.minLevel) return 'bloqueado_nivel';
  if (balance < item.price) return 'sem_saldo';
  return 'comprar';
}

/** Equip an owned item, replacing any other equipped item on the same layer. */
export function equip(pet: Pet, itemId: string): string[] {
  const item = itemById(itemId);
  if (!item) return pet.equipped;
  const kept = pet.equipped.filter((id) => {
    const other = itemById(id);
    return other && !other.layers.some((l) => item.layers.includes(l));
  });
  return [...kept, itemId];
}

export function unequip(pet: Pet, itemId: string): string[] {
  return pet.equipped.filter((id) => id !== itemId);
}

/** Accessory drawing ids for the avatar from equipped items. */
export function accessoriesFor(equipped: string[]): string[] {
  const out = new Set<string>();
  for (const id of equipped) itemById(id)?.acc.forEach((a) => out.add(a));
  return [...out];
}

/** Level rewards the pet has earned but does not own yet. */
export function pendingRewards(pet: Pet, ledger: LedgerEntry[]): string[] {
  const { total } = milesTotals(ledger);
  return LEVELS.filter((l) => l.reward && total >= l.min && !pet.owned.includes(l.reward)).map((l) => l.reward!) ;
}
