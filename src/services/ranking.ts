import { getApps } from 'firebase/app';
import {
  collection, deleteDoc, doc, getCountFromServer, getDocs, getFirestore, limit, orderBy, query, setDoc, where, type Firestore,
} from 'firebase/firestore';
import { backend } from '@/data';
import { seasonLevel, type SeasonLevelId } from '@/domain/gamification';
import type { Pet, Species } from '@/domain/types';

/**
 * Ranking semanal por cidade e por raça (spec §7). Temporada = mês ("2026-10"); pontuação = milhas da temporada.
 * Firestore: ranking/{season}/entries/{uid}_{petId}. PRIVACIDADE: só o nome do pet, espécie, raça, cidade,
 * milhas e nível — nunca nome/e-mail do tutor. As regras (firestore.rules) validam o formato.
 *
 * Índices compostos recomendados (firestore.indexes.json): entries (cityKey ASC, seasonMiles DESC) e
 * (breedKey ASC, seasonMiles DESC). Sem eles, a consulta cai no modo simples (filtra e ordena no aparelho).
 */
export type RankingScope = 'cidade' | 'raca';

export interface RankingEntry {
  /** `${uid}_${petId}` */
  id: string;
  petName: string;
  species: Species;
  breed: string;
  city: string;
  cityKey: string;
  breedKey: string;
  seasonMiles: number;
  level: SeasonLevelId;
  season: string;
  updatedAt: string;
}

export interface RankingResult {
  entries: RankingEntry[];
  /** posição do pet do usuário (1 = primeiro), null se não publicou */
  myRank: number | null;
  mine: RankingEntry | null;
  /** 'mock' = dados de exemplo (modo local em desenvolvimento) */
  source: 'firebase' | 'mock';
}

export const TOP_N = 50;

/** "2026-10" */
export function seasonId(day: string): string {
  return day.slice(0, 7);
}

/** Dias até o fim da temporada (mês): "termina em 5 dias". */
export function seasonDaysLeft(day: string): number {
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7));
  const d = Number(day.slice(8, 10));
  const last = new Date(y, m, 0).getDate();
  return Math.max(0, last - d);
}

/** Chave de comparação: minúsculas, sem acento, espaços simples ("São  Paulo" → "sao paulo"). */
export function normKey(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 60);
}

export function breedLabel(breed: string): string {
  return !breed || breed === 'SRD' ? 'Vira-lata' : breed;
}

export function breedKeyOf(species: Species, breed: string): string {
  return `${species}:${normKey(breedLabel(breed))}`;
}

export function entryId(uid: string, petId: string): string {
  return `${uid}_${petId}`;
}

/** Monta o documento público do ranking (sem dados do tutor). */
export function buildEntry(uid: string, pet: Pick<Pet, 'id' | 'name' | 'species' | 'breed'>, city: string, seasonMiles: number, day: string): RankingEntry {
  const c = city.trim().slice(0, 40);
  return {
    id: entryId(uid, pet.id),
    petName: pet.name.trim().slice(0, 40) || 'Pet',
    species: pet.species,
    breed: breedLabel(pet.breed).slice(0, 60),
    city: c,
    cityKey: normKey(c),
    breedKey: breedKeyOf(pet.species, pet.breed),
    seasonMiles: Math.max(0, Math.min(100000, Math.round(seasonMiles))),
    level: seasonLevel(seasonMiles).id,
    season: seasonId(day),
    updatedAt: new Date().toISOString(),
  };
}

/** Ordena por milhas (desc) e desempata pelo nome. */
export function sortEntries(list: RankingEntry[]): RankingEntry[] {
  return [...list].sort((a, b) => b.seasonMiles - a.seasonMiles || a.petName.localeCompare(b.petName));
}

/** O ranking online existe? (backend Firebase; no modo local não há servidor) */
export function rankingOnline(): boolean {
  return backend().mode === 'firebase' && getApps().length > 0;
}

function db(): Firestore {
  return getFirestore(getApps()[0]);
}

function entriesCol(season: string) {
  return collection(db(), 'ranking', season, 'entries');
}

/** Publica/atualiza a pontuação do pet do usuário. */
export async function publishEntry(e: RankingEntry): Promise<void> {
  if (!rankingOnline()) return;
  const { id, ...data } = e;
  await setDoc(doc(entriesCol(e.season), id), data);
}

/** Remove as entradas do usuário (ex.: ao excluir pet/conta). */
export async function removeEntries(uid: string, petIds: string[], season: string): Promise<void> {
  if (!rankingOnline()) return;
  await Promise.all(petIds.map((p) => deleteDoc(doc(entriesCol(season), entryId(uid, p))).catch(() => {})));
}

/** Top N por cidade ou raça + posição do usuário. */
export async function fetchRanking(scope: RankingScope, key: string, season: string, mine: RankingEntry | null): Promise<RankingResult> {
  const field = scope === 'cidade' ? 'cityKey' : 'breedKey';
  const col = entriesCol(season);
  let entries: RankingEntry[];
  let myRank: number | null = null;
  try {
    // caminho rápido (precisa do índice composto)
    const snap = await getDocs(query(col, where(field, '==', key), orderBy('seasonMiles', 'desc'), limit(TOP_N)));
    entries = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RankingEntry, 'id'>) }));
    if (mine) {
      const idx = entries.findIndex((x) => x.id === mine.id);
      if (idx >= 0) myRank = idx + 1;
      else {
        const above = await getCountFromServer(query(col, where(field, '==', key), where('seasonMiles', '>', mine.seasonMiles)));
        myRank = above.data().count + 1;
      }
    }
  } catch {
    // sem índice: filtra no servidor só por igualdade e ordena aqui
    const snap = await getDocs(query(col, where(field, '==', key), limit(500)));
    const all = sortEntries(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RankingEntry, 'id'>) })));
    if (mine) {
      const idx = all.findIndex((x) => x.id === mine.id);
      myRank = idx >= 0 ? idx + 1 : null;
    }
    entries = all.slice(0, TOP_N);
  }
  if (mine && myRank === null) myRank = entries.filter((x) => x.seasonMiles > mine.seasonMiles).length + 1;
  return { entries, myRank, mine, source: 'firebase' };
}

// ------------------------------------------------------------------ dados de exemplo (modo local, só __DEV__)
const MOCK: [string, Species, string, number][] = [
  ['Luna', 'dog', 'Spitz Alemão', 3420], ['Bob', 'dog', 'Vira-lata', 2980], ['Mel', 'cat', 'Siamês', 2760],
  ['Pipoca', 'dog', 'Vira-lata', 2310], ['Nina', 'dog', 'Poodle', 1940], ['Fred', 'dog', 'Beagle', 1720],
  ['Amora', 'dog', 'Labrador', 1530], ['Tom', 'cat', 'Vira-lata', 1320], ['Bidu', 'dog', 'Spitz Alemão', 980],
  ['Frida', 'cat', 'Persa', 640], ['Toddy', 'dog', 'Shih Tzu', 410],
];

export function mockRanking(scope: RankingScope, mine: RankingEntry): RankingResult {
  const base = MOCK.map(([name, species, breed, miles], i) => ({
    id: `mock_${i}`, petName: name, species, breed, city: mine.city, cityKey: mine.cityKey, breedKey: breedKeyOf(species, breed),
    seasonMiles: miles, level: seasonLevel(miles).id, season: mine.season, updatedAt: mine.updatedAt,
  }));
  const list = scope === 'cidade' ? base : base.map((b) => ({ ...b, breed: mine.breed, breedKey: mine.breedKey }));
  const all = sortEntries([...list, mine]);
  return { entries: all.slice(0, TOP_N), myRank: all.findIndex((x) => x.id === mine.id) + 1, mine, source: 'mock' };
}
