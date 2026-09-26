import { DESTINATIONS, LEVELS, levelFor, milesTotals, type DestinationId } from './gamification';
import type { LedgerEntry, PaywallTriggerId, Pet, Plan, UserProfile } from './types';

// ------------------------------------------------------------------ classes (planos)
/**
 * v1 grátis: sem planos pagos. Tudo liberado para todos, com um limite justo de uso da IA.
 * v1.1: todo o código de cobrança está pronto; troque para true quando os produtos existirem nas lojas.
 */
export const PAID_PLANS = false;
/** Família (vários tutores no mesmo pet) ainda não foi construída: fica escondida. */
export const FAMILY_PLAN = false;

/** Preços (spec §6). */
export const PRICES = {
  monthly: 27,
  yearly: 197,
  trialDays: 7,
  /** R$ 197 / 52 semanas */
  weeklyFromYearly: 3.79,
  monthlyLabel: 'R$ 27/mês',
  yearlyLabel: 'R$ 197/ano',
  weeklyLabel: 'R$ 3,79 por semana',
  /** "R$ 16,42 por mês" no anual */
  yearlyPerMonthLabel: 'R$ 16,42 por mês',
} as const;

export interface PlanInfo { id: Plan; name: string; seat: string; price: string; cents: string; per: string; yearly?: string; pitch: string; features: string[]; hidden?: boolean }

export const PLANS: PlanInfo[] = [
  { id: 'economica', name: 'Econômica', seat: '32C', price: 'Grátis', cents: '', per: 'para sempre', pitch: 'Para começar e cuidar de 1 pet.', features: ['1 pet', 'Registrar e ver vacinas e remédios', 'Guia IA: 3 perguntas por mês (só texto)', 'Leitura da carteirinha por foto: 3 por mês', 'Passaporte dentro do app', 'Avatar básico'] },
  { id: 'primeira', name: 'Primeira Classe', seat: '1A', price: 'R$ 27', cents: ',00', per: 'por mês', yearly: 'ou R$ 197 por ano (sai R$ 16,42 por mês)', pitch: 'Tudo liberado. Teste 7 dias grátis.', features: ['Lembrete de vacina 7 dias antes e no dia', 'Alarme de cada dose: remédio, vermífugo e antipulgas', 'Guia IA à vontade, com foto (receita, exame, bula)', 'Gráfico de peso', 'Passaporte com QR code e PDF', 'Cartão de emergência', 'Até 5 pets e compartilhar com outra pessoa', 'Acessórios do avatar e carimbos por conquista'] },
  { id: 'familia', name: 'Passaporte Família', seat: '2B', price: 'R$ 37', cents: ',00', per: 'por mês', pitch: 'Para dividir os cuidados com a casa toda.', features: ['Tudo da Primeira Classe', 'Até 5 tutores no mesmo pet', 'Rotina e vacinas compartilhadas'], hidden: !FAMILY_PLAN },
];
/** Planos que aparecem na tela "Escolha sua classe". */
export const SHOWN_PLANS = PLANS.filter((p) => !p.hidden);

/** Limites por classe. Campos da v1.0 (photoMonthly, pdf, exclusive, guardians) continuam para as telas antigas. */
export interface PlanLimits {
  maxPets: number;
  /** perguntas ao Guia IA por mês */
  guideMonthly: number;
  /** Guia só aceita texto (sem foto/voz) */
  guideTextOnly: boolean;
  /** foto para a IA (receita, exame, bula) */
  photoAi: boolean;
  /** leitura da carteirinha de vacina por foto (liberada para todos, com limite) */
  cardScanMonthly: number;
  /** notificações de vacina (7 dias, 1 dia, no dia) */
  vaccineReminders: boolean;
  /** alarmes de dose (remédio, vermífugo, antipulgas) */
  medAlarms: boolean;
  weightChart: boolean;
  passportQrPdf: boolean;
  emergencyCard: boolean;
  share: boolean;
  avatarPremium: boolean;
  // ---- v1.0
  photoMonthly: number;
  pdf: boolean;
  exclusive: boolean;
  guardians: number;
}

/** v1 grátis (PAID_PLANS = false): tudo liberado para todos. */
const FREE_V1: PlanLimits = {
  maxPets: 5, guideMonthly: 30, guideTextOnly: false, photoAi: true, cardScanMonthly: 20, vaccineReminders: true, medAlarms: true,
  weightChart: true, passportQrPdf: true, emergencyCard: true, share: true, avatarPremium: true,
  photoMonthly: 20, pdf: true, exclusive: true, guardians: 1,
};

/** Limites da cobrança real (spec §6). Exportado para testes e para telas de comparação. */
export const PAID_LIMITS: Record<Plan, PlanLimits> = {
  economica: {
    maxPets: 1, guideMonthly: 3, guideTextOnly: true, photoAi: false, cardScanMonthly: 3, vaccineReminders: false, medAlarms: false,
    weightChart: false, passportQrPdf: false, emergencyCard: false, share: false, avatarPremium: false,
    photoMonthly: 3, pdf: false, exclusive: false, guardians: 1,
  },
  primeira: {
    maxPets: 5, guideMonthly: 200, guideTextOnly: false, photoAi: true, cardScanMonthly: 20, vaccineReminders: true, medAlarms: true,
    weightChart: true, passportQrPdf: true, emergencyCard: true, share: true, avatarPremium: true,
    photoMonthly: 50, pdf: true, exclusive: true, guardians: 1,
  },
  familia: {
    maxPets: 5, guideMonthly: 200, guideTextOnly: false, photoAi: true, cardScanMonthly: 20, vaccineReminders: true, medAlarms: true,
    weightChart: true, passportQrPdf: true, emergencyCard: true, share: true, avatarPremium: true,
    photoMonthly: 50, pdf: true, exclusive: true, guardians: 5,
  },
};

/** "À vontade" = limite alto de uso justo (a IA custa por uso). */
export const LIMITS: Record<Plan, PlanLimits> = !PAID_PLANS ? { economica: FREE_V1, primeira: FREE_V1, familia: FREE_V1 } : PAID_LIMITS;

/** Limites efetivos (respeita o flag; `paid` força a regra da cobrança, útil em testes). */
export function limitsFor(plan: Plan, paid: boolean = PAID_PLANS): PlanLimits {
  return paid ? PAID_LIMITS[plan] : FREE_V1;
}

export type BoolFeature = { [K in keyof PlanLimits]: PlanLimits[K] extends boolean ? K : never }[keyof PlanLimits];

/** O plano libera o recurso? (com PAID_PLANS = false, sempre true). guideTextOnly é invertido: can(…,'guideTextOnly') = só texto. */
export function can(plan: Plan, feature: BoolFeature, paid: boolean = PAID_PLANS): boolean {
  return limitsFor(plan, paid)[feature];
}

/**
 * Classe que vale AGORA: teste grátis ou mês trocado por milhas contam como Primeira Classe até vencer.
 */
export function effectivePlan(profile: Pick<UserProfile, 'plan' | 'planState'> | null | undefined, now: Date = new Date()): Plan {
  if (!profile) return 'economica';
  const st = profile.planState;
  if (st) {
    const t = now.getTime();
    if (st.trialEndsAt && new Date(st.trialEndsAt).getTime() > t) return 'primeira';
    if (st.plan === 'primeira' && (!st.until || new Date(st.until).getTime() > t)) return 'primeira';
    if (st.until && new Date(st.until).getTime() > t) return 'primeira';
  }
  return profile.plan;
}

/** Dias restantes do teste grátis (0 = sem teste). */
export function trialDaysLeft(profile: Pick<UserProfile, 'planState'> | null | undefined, now: Date = new Date()): number {
  const end = profile?.planState?.trialEndsAt;
  if (!end) return 0;
  return Math.max(0, Math.ceil((new Date(end).getTime() - now.getTime()) / 86400000));
}

// ------------------------------------------------------------------ paywall (spec §6)
export type PaywallEvent = PaywallTriggerId | 'home';

/** Tela de cada gatilho (mockups Paywall-*): 8a principal, 8c IA, 8d foto, 8e pet, 8f compartilhar. */
export const PAYWALL_SCREENS: Record<PaywallTriggerId, { design: string; title: (pet: string) => string }> = {
  primeira_vacina: { design: 'Paywall-Primeira (8a)', title: (pet) => `Nunca mais esqueça uma vacina ${pet ? `do ${pet}` : 'do seu pet'}` },
  ia_4a_pergunta: { design: 'Paywall-IA (8c)', title: () => 'Você usou as 3 perguntas do mês' },
  ia_foto: { design: 'Paywall-Foto (8d)', title: () => 'Mande a foto da receita, do exame ou da bula' },
  segundo_pet: { design: 'Paywall-Pet (8e)', title: () => 'Cuide de até 5 pets' },
  compartilhar: { design: 'Paywall-Compartilhar (8f)', title: () => 'Compartilhe o passaporte' },
};

export interface PaywallState {
  plan: Plan;
  /** paywalls já vistos (profile.paywallSeen) */
  seen?: Partial<Record<PaywallTriggerId, string>>;
  /** perguntas ao Guia já feitas neste mês (antes da nova) */
  guideUsedThisMonth?: number;
  /** pets que a conta já tem */
  petCount?: number;
  /** vacinas registradas (com data ou resposta) — só para 'primeira_vacina' */
  vaccinesRegistered?: number;
  /** força a regra da cobrança (testes); padrão = PAID_PLANS */
  paid?: boolean;
}

/**
 * Deve abrir um paywall? Retorna o gatilho (id da tela) ou null. NUNCA na 1ª Home.
 * - primeira_vacina: depois da 1ª vacina registrada, 1 vez só.
 * - ia_4a_pergunta: ao tentar a 4ª pergunta do mês na Econômica.
 * - ia_foto: ao anexar foto ao Guia na Econômica.
 * - segundo_pet: ao adicionar pet além do limite.
 * - compartilhar: ao tocar "Compartilhar passaporte" na Econômica.
 */
export function paywallTrigger(event: PaywallEvent, state: PaywallState): PaywallTriggerId | null {
  const paid = state.paid ?? PAID_PLANS;
  if (!paid || event === 'home') return null;
  if (state.plan !== 'economica') return null;
  const L = limitsFor(state.plan, paid);
  switch (event) {
    case 'primeira_vacina':
      if (state.seen?.primeira_vacina) return null;
      return (state.vaccinesRegistered ?? 1) >= 1 ? 'primeira_vacina' : null;
    case 'ia_4a_pergunta':
      return (state.guideUsedThisMonth ?? 0) >= L.guideMonthly ? 'ia_4a_pergunta' : null;
    case 'ia_foto':
      return L.photoAi ? null : 'ia_foto';
    case 'segundo_pet':
      return (state.petCount ?? 0) >= L.maxPets ? 'segundo_pet' : null;
    case 'compartilhar':
      return L.share ? null : 'compartilhar';
    default:
      return null;
  }
}

/** Saldo depois de comprar (Loja: "Saldo após a compra"). */
export function balanceAfter(item: DutyItem, ledger: LedgerEntry[]): number {
  return milesTotals(ledger).balance - item.price;
}

export function planName(p: Plan): string {
  return PLANS.find((x) => x.id === p)!.name;
}

export function canAddPet(plan: Plan, currentPets: number): boolean {
  return currentPets < LIMITS[plan].maxPets;
}

// ------------------------------------------------------------------ duty free
export type Layer = 'cabeca' | 'olhos' | 'pescoco' | 'corpo';
/** Abas da Loja do avatar. */
export type ShopCategory = 'chapeus' | 'oculos' | 'lencos' | 'viagem';
export const SHOP_CATEGORIES: { id: ShopCategory; label: string }[] = [
  { id: 'chapeus', label: 'Chapéus' }, { id: 'oculos', label: 'Óculos' }, { id: 'lencos', label: 'Lenços' }, { id: 'viagem', label: 'Roupas de viagem' },
];
export interface DutyItem {
  id: string; name: string; price: number; layers: Layer[];
  /** ids de desenho do Avatar (src/art/Avatar.tsx). Itens novos da v1.1 ainda precisam do desenho. */
  acc: string[];
  minLevel?: number; firstClass?: boolean;
  /** v1.1: aba da loja */
  category?: ShopCategory;
  /** v1.1: item de viagem — só libera depois de chegar nesse destino do mapa (milhas acumuladas) */
  destination?: DestinationId;
}

export const DUTY_ITEMS: DutyItem[] = [
  { id: 'bandana', name: 'Bandana', price: 150, layers: ['pescoco'], acc: ['bandana'] },
  { id: 'oculos', name: 'Óculos de aviador', price: 200, layers: ['olhos'], acc: ['oculos'] },
  { id: 'gravata', name: 'Gravata-borboleta', price: 250, layers: ['pescoco'], acc: ['gravata'] },
  { id: 'quepe', name: 'Quepe de piloto', price: 300, layers: ['cabeca'], acc: ['quepe'] },
  { id: 'coleira', name: 'Coleira dourada', price: 400, layers: ['pescoco'], acc: ['coleira'], firstClass: true },
  { id: 'kit', name: 'Kit Embaixador', price: 1500, layers: ['cabeca', 'pescoco'], acc: ['quepe', 'gravata'], minLevel: 6 },
  // ---- v1.1: Loja do avatar
  { id: 'chapeu_viagem', name: 'Chapéu de viagem', price: 300, layers: ['cabeca'], acc: ['chapeu_viagem'], category: 'chapeus' },
  { id: 'bone', name: 'Boné', price: 150, layers: ['cabeca'], acc: ['bone'], category: 'chapeus' },
  { id: 'gorro', name: 'Gorro', price: 120, layers: ['cabeca'], acc: ['gorro'], category: 'chapeus' },
  { id: 'coroa', name: 'Coroa', price: 1500, layers: ['cabeca'], acc: ['coroa'], category: 'chapeus', firstClass: true },
  // itens de viagem: liberam ao chegar no destino (o mapa usa milhas ACUMULADAS; comprar gasta o saldo)
  { id: 'chapeu_palha', name: 'Chapéu de palha', price: 200, layers: ['cabeca'], acc: ['chapeu_palha'], category: 'viagem', destination: 'rio' },
  { id: 'lenco_tango', name: 'Lenço de tango', price: 250, layers: ['pescoco'], acc: ['lenco_tango'], category: 'viagem', destination: 'buenos_aires' },
  { id: 'cachecol_lisboa', name: 'Cachecol de Lisboa', price: 300, layers: ['pescoco'], acc: ['cachecol_lisboa'], category: 'viagem', destination: 'lisboa' },
  { id: 'boina', name: 'Boina francesa', price: 350, layers: ['cabeca'], acc: ['boina'], category: 'viagem', destination: 'paris' },
  { id: 'bandana_toquio', name: 'Bandana de Tóquio', price: 400, layers: ['cabeca'], acc: ['bandana_toquio'], category: 'viagem', destination: 'toquio' },
];

/** Categoria do item (itens antigos: pela camada). */
export function shopCategoryOf(item: DutyItem): ShopCategory {
  if (item.category) return item.category;
  if (item.layers.includes('olhos')) return 'oculos';
  if (item.layers.includes('cabeca')) return 'chapeus';
  return 'lencos';
}

export function itemById(id: string): DutyItem | undefined {
  return DUTY_ITEMS.find((i) => i.id === id);
}

export type ItemState = 'equipado' | 'na_mala' | 'comprar' | 'sem_saldo' | 'bloqueado_nivel' | 'bloqueado_classe' | 'bloqueado_destino';

export function itemState(item: DutyItem, pet: Pet, ledger: LedgerEntry[], plan: Plan): ItemState {
  if (pet.equipped.includes(item.id)) return 'equipado';
  if (pet.owned.includes(item.id)) return 'na_mala';
  const { total, balance } = milesTotals(ledger);
  if (PAID_PLANS && item.firstClass && plan === 'economica') return 'bloqueado_classe';
  if (item.destination) {
    const d = DESTINATIONS.find((x) => x.id === item.destination);
    if (d && total < d.min) return 'bloqueado_destino';
  }
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
