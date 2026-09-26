export type Species = 'dog' | 'cat';
export type PetSize = 'pequeno' | 'médio' | 'grande';
export type Sex = 'M' | 'F';
export type TriState = 'sim' | 'nao' | 'naosei';
export type Mood = 'feliz' | 'neutro' | 'triste';
export type Plan = 'economica' | 'primeira' | 'familia';
export type CareCategory = 'vacina' | 'vermifugo' | 'antiparasitario' | 'remedio' | 'exame' | 'outro';
export type CareStatus = 'em_dia' | 'atencao' | 'atrasado' | 'carimbado';
export type HistoryAnswer = 'tomei' | 'nao' | 'naosei';
export type UrgencyLevel = 'verde' | 'amarelo' | 'vermelho';

/** Recurrence of a care; null = happens once. */
export type Recurrence = { unit: 'day' | 'month' | 'year'; every: number } | null;

export interface PetDetails {
  manchas: string;
  olhos: string;
  orelhas: string;
  pelo: string;
  rabo: string;
}

export interface Pet {
  id: string;
  ownerId: string;
  guardianIds: string[];
  name: string;
  species: Species;
  breed: string;
  coat: string; // hex color
  coatName: string;
  details: PetDetails;
  birthDate: string; // YYYY-MM-DD
  sex: Sex;
  weightKg: number | null;
  neutered: TriState;
  allergies: string;
  conditions: string;
  meds: string;
  food: string;
  mealTimes: string[]; // "07:00"
  /** refeições por dia; null = não sei */
  mealsPerDay?: number | null;
  /** gramas de ração por dia; null = não sei */
  gramsPerDay?: number | null;
  /** foto real do pet (fica no aparelho); sem foto usa o avatar desenhado */
  photoUri?: string;
  microchip?: { has: TriState; number?: string };
  /** raças que ele "puxou" (vira-lata/mistura) */
  ancestry?: string[];
  size?: PetSize;
  temperament?: string[];
  routine?: Routine;
  passportNumber: string;
  coverColor: string;
  issuedAt: string; // ISO datetime
  owned: string[]; // duty free item ids
  equipped: string[]; // duty free item ids
  createdAt: string;
  /** v1.1: destino do mapa onde o avatar está (ex.: 'paris'); padrão 'rio' */
  at?: string;
}

/** Rotina diária (além das refeições, que vêm de mealTimes). */
export interface Routine {
  walkTimes: string[];
  playTime: string | null;
  water: boolean;
  teeth: boolean;
  litter: boolean;
}

export interface Care {
  id: string;
  code: string; // 3 letters
  name: string;
  category: CareCategory;
  recurrence: Recurrence;
  lastDate: string | null; // YYYY-MM-DD
  nextDate: string | null; // YYYY-MM-DD, null when done and not recurring
  origin: 'requerimento' | 'manual';
  answer: HistoryAnswer | null;
  place: string;
  reminders: number[]; // days before nextDate
  /** todas as datas em que foi carimbado (YYYY-MM-DD), da mais antiga para a mais nova */
  history?: string[];
  miles: number;
  active: boolean;
  createdAt: string;
  // ---- v1.1 (todos opcionais: dados da v1.0 continuam abrindo)
  /** vermífugo/antipulgas: quanto tempo o produto protege (meses). Define a próxima data. */
  durationMonths?: ParasiteMonths;
  /** intervalo fixo em dias (quando não é por meses/anos) */
  intervalDays?: number;
  /** lastDate é aproximado (resposta "sei mais ou menos o mês" / "não lembro") */
  lastApprox?: boolean;
  /** última resposta do cadastro de vacina */
  vaccineAnswer?: VaccineAnswer;
  /** última resposta "Quando foi?" (vermífugo/antipulgas) */
  lastAnswer?: LastAnswer;
  /** doses planejadas ainda por tomar (série de filhote / adulto sem histórico), YYYY-MM-DD em ordem */
  series?: string[];
}

// ------------------------------------------------------------------ v1.1: respostas do cadastro
/** Resposta de "Quando foi?" — vacinas e vermífugo/antipulgas usam o mesmo padrão. */
export type ApproxWithin = 'menos1ano' | 'mais1ano' | 'menos1mes' | 'mais1mes';
export type LastAnswer =
  | { kind: 'data'; date: string } // YYYY-MM-DD
  | { kind: 'mes'; year: number; month: number } // month 1–12; considera o dia 15
  | { kind: 'naolembro'; within: ApproxWithin }
  | { kind: 'nunca' }
  | { kind: 'naosei' };
/** Vacinas: "Sim, sei a data" | "mais ou menos o mês" | "não lembro (menos/mais de 1 ano)" | "Nunca tomou" | "Não sei". */
export type VaccineAnswer = LastAnswer;
/** Quanto tempo o vermífugo/antipulgas protege. 'naosei' = 1 mês por segurança. */
export type ParasiteMonths = 1 | 3 | 8 | 12;
export type ParasiteDuration = ParasiteMonths | 'naosei';

// ------------------------------------------------------------------ v1.1: lembretes e remédios
export type ReminderType = 'remedio' | 'passeio' | 'banho' | 'consulta' | 'comida' | 'outro';
export type ReminderRepeat = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface MedSchedule {
  name: string;
  /** de quanto em quanto tempo (24, 12, 8, 6…). Tem prioridade sobre timesPerDay. */
  everyHours?: number;
  /** alternativa: vezes por dia (vira everyHours = 24 / timesPerDay) */
  timesPerDay?: number;
  /** horário da 1ª dose "HH:MM" (applyNightShift muda este valor) */
  firstDose: string;
  /** "Outro": horários fixos por dia (ignora everyHours) */
  times?: string[];
  /** número de dias, ou 'continuo' (uso contínuo) */
  days: number | 'continuo';
  /** dia da 1ª dose YYYY-MM-DD */
  startDate: string;
  /** texto livre: "1 comprimido", "5 gotas" */
  dose?: string;
}

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  note?: string;
  /** dia (único) ou início da repetição, YYYY-MM-DD */
  date: string;
  /** "HH:MM"; sem horário = qualquer hora do dia */
  time?: string | null;
  repeat: ReminderRepeat;
  /** só para type === 'remedio' */
  med?: MedSchedule;
  /** avisar no celular */
  notify: boolean;
  active: boolean;
  createdAt: string;
}

export type DoseStatus = 'given' | 'skipped' | 'late';

/** Registro de uma dose de remédio (ou de um lembrete marcado como feito). id = `${reminderId}_${day}_${HHMM}` */
export interface DoseLog {
  id: string;
  reminderId: string;
  day: string; // dia da dose programada
  time: string; // "HH:MM" programado
  status: DoseStatus;
  givenAt?: string; // ISO — quando foi dada de fato
  loggedAt: string; // ISO
}

export interface Stamp {
  id: string;
  kind: 'cuidado' | 'emissao' | 'viagem';
  /** v1.1: carimbo de destino do mapa (kind 'viagem') */
  destination?: string;
  careId?: string;
  code: string;
  top: string;
  bottom: string;
  main: string;
  sub: string;
  color: string;
  shape: 'circle' | 'rect';
  rotation: number;
  date: string; // YYYY-MM-DD
}

/**
 * Motivo (código) de cada lançamento de milhas.
 * v1.1: vacina (+100 vacina em dia), remedio (+20 no horário), passeio (+10), foto_dia (+5),
 * sequencia (+50 a cada 7 dias seguidos), indicacao (+300), resgate (negativo: troca por Primeira Classe).
 */
export type LedgerOrigin = 'boas_vindas' | 'cuidado' | 'rotina' | 'dia_completo' | 'peso' | 'foto' | 'guia' | 'racao' | 'dutyfree'
  | 'vacina' | 'remedio' | 'passeio' | 'foto_dia' | 'sequencia' | 'indicacao' | 'resgate';

export interface LedgerEntry {
  id: string;
  at: string; // ISO datetime
  day: string; // YYYY-MM-DD (local)
  origin: LedgerOrigin;
  miles: number; // negative for spending
  ref?: string;
}

export interface WeightLog {
  id: string;
  day: string;
  kg: number;
}

export type DiaryKind = 'rotina' | 'momento' | 'passeio' | 'saude' | 'banho' | 'comportamento' | 'alimentacao' | 'consulta' | 'conquista';

export interface DiaryEntry {
  id: string;
  day: string;
  /** legado: assunto livre das versões antigas */
  topic: string;
  kind?: DiaryKind;
  uri: string; // '' quando não tem foto
  note: string;
  tags?: string[];
  mood?: 'feliz' | 'normal' | 'abatido';
}

export type TripDest = 'brasil' | 'mercosul' | 'ue' | 'eua' | 'outro';
export type TripTransport = 'carro' | 'onibus' | 'aviao';

export interface Trip {
  id: string;
  dest: TripDest;
  country: string;
  date: string; // YYYY-MM-DD
  transport: TripTransport;
  done: string[]; // itens da checklist marcados à mão
  createdAt: string;
}

export interface ChatMsg {
  id: string;
  at: string;
  from: 'user' | 'guia';
  text: string;
  photoUri?: string;
  level?: UrgencyLevel;
  action?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  plan: Plan;
  createdAt: string;
  notifyHour: number;
  // ---- v1.1 (opcionais)
  /** cidade digitada no perfil (ranking por cidade; sem GPS) */
  city?: string;
  /** detalhes da assinatura; `plan` continua sendo a classe "base" */
  planState?: PlanState;
  /** trocas de milhas por 1 mês de Primeira Classe */
  redemptions?: Redemption[];
  /** paywalls já mostrados: gatilho → ISO */
  paywallSeen?: Partial<Record<PaywallTriggerId, string>>;
  /** leituras de carteirinha por foto no mês */
  cardScans?: { month: string; count: number };
}

export type PaywallTriggerId = 'primeira_vacina' | 'ia_4a_pergunta' | 'ia_foto' | 'segundo_pet' | 'compartilhar';

export interface PlanState {
  plan: 'economica' | 'primeira';
  /** teste grátis até (ISO) */
  trialEndsAt?: string;
  /** Primeira Classe paga/trocada até (ISO); ausente = sem prazo (loja renova) */
  until?: string;
  source: 'gratis' | 'trial' | 'loja' | 'milhas' | 'simulado';
  period?: 'mensal' | 'anual';
}

export interface Redemption {
  id: string;
  at: string; // ISO
  miles: number;
  months: number;
  petId: string;
}

export interface PetData {
  cares: Care[];
  stamps: Stamp[];
  ledger: LedgerEntry[];
  weights: WeightLog[];
  diary: DiaryEntry[];
  chat: ChatMsg[];
  trips: Trip[];
  /** v1.1 */
  reminders: Reminder[];
  /** v1.1: doses dadas/puladas e lembretes feitos */
  doses: DoseLog[];
}

export const EMPTY_PET_DATA: PetData = { cares: [], stamps: [], ledger: [], weights: [], diary: [], chat: [], trips: [], reminders: [], doses: [] };

/** Todas as subcoleções de um pet (backend usa para carregar/apagar). */
export const PET_COLLECTIONS = ['cares', 'stamps', 'ledger', 'weights', 'diary', 'chat', 'trips', 'reminders', 'doses'] as const;
