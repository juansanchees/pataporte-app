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
}

export interface Stamp {
  id: string;
  kind: 'cuidado' | 'emissao';
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

export type LedgerOrigin = 'boas_vindas' | 'cuidado' | 'rotina' | 'dia_completo' | 'peso' | 'foto' | 'guia' | 'racao' | 'dutyfree';

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
}

export interface PetData {
  cares: Care[];
  stamps: Stamp[];
  ledger: LedgerEntry[];
  weights: WeightLog[];
  diary: DiaryEntry[];
  chat: ChatMsg[];
  trips: Trip[];
}

export const EMPTY_PET_DATA: PetData = { cares: [], stamps: [], ledger: [], weights: [], diary: [], chat: [], trips: [] };
