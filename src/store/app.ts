import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { backend, newId, type AuthUser, type Collection } from '@/data';
import { careTypesFor, emissionCareTypes, foodLabel, milesForCategory, codeFromName, mealTimesFor } from '@/domain/catalog';
import { generateItinerary, historyOf, makeCareStamp, stampCare, rotationFor, type HistoryWhen } from '@/domain/itinerary';
import { earned, levelFor, milesTotals, MILES } from '@/domain/gamification';
import { equip, itemById, itemState, pendingRewards, unequip, LIMITS } from '@/domain/commerce';
import { answerGuide } from '@/domain/guide';
import { aiEnabled, aiErrorText, askGuideAI, imageForAi, readBase64 } from '@/services/ai';
import { newPassportNumber } from '@/domain/mrz';
import { addDays, addRecurrence, ageYears, diffDays, localMonth, parseBR, today } from '@/domain/dates';
import { breedContext } from '@/domain/breeds';
import { EMPTY_PET_DATA, type Care, type CareCategory, type ChatMsg, type DiaryEntry, type DiaryKind, type HistoryAnswer, type Trip, type LedgerEntry, type LedgerOrigin, type Pet, type PetData, type PetDetails, type Plan, type Recurrence, type Species, type Stamp, type TriState, type UserProfile } from '@/domain/types';
import { rescheduleAll } from '@/services/notifications';
import { backupPhoto, hasCloud, splitPhoto } from '@/services/photos';
import { appleSignIn, googleSignIn, socialSignOut } from '@/services/socialAuth';
import { dayRecap, routineItems, routineProgress, type RoutineItem } from '@/domain/routine';
import type { PetSize, Routine } from '@/domain/types';
import { COVER_COLORS } from '@/theme';
import { art } from '@/domain/words';

export interface Draft {
  editingPetId: string | null;
  species: Species;
  breed: string;
  coat: string;
  coatName: string;
  details: PetDetails;
  name: string;
  birth: string; // DD/MM/AAAA
  sex: 'M' | 'F';
  weight: string;
  neutered: TriState;
  allergies: string;
  conditions: string;
  meds: string;
  food: string;
  mealTimes: string[];
  /** refeições por dia; null = não sei */
  mealsPerDay: number | null;
  /** gramas por dia (texto do campo); '' + gramsUnknown = não sei */
  grams: string;
  gramsUnknown: boolean;
  photoUri: string;
  /** texto da IA sobre a foto, quando o avatar foi montado automaticamente */
  aiSummary: string;
  ancestry: string[];
  size: PetSize | null;
  temperament: string[];
  answers: Record<string, HistoryAnswer | undefined>;
  whens: Record<string, HistoryWhen | undefined>;
}

export const EMPTY_DRAFT: Draft = {
  editingPetId: null,
  species: 'dog',
  breed: 'SRD',
  coat: '#C98A54',
  coatName: 'Caramelo',
  details: { manchas: 'Sem manchas', olhos: 'Castanho', orelhas: 'Caídas', pelo: 'Natural', rabo: 'Longo' },
  name: '',
  birth: '',
  sex: 'M',
  weight: '',
  neutered: 'naosei',
  allergies: '',
  conditions: '',
  meds: '',
  food: 'Ração',
  mealTimes: ['07:00', '19:00'],
  mealsPerDay: 2,
  grams: '',
  gramsUnknown: false,
  photoUri: '',
  aiSummary: '',
  ancestry: [],
  size: null,
  temperament: [],
  answers: {},
  whens: {},
};

export interface StampFx { top: string; bottom: string; main: string; sub: string; color: string; miles: number; next?: string | null }

interface State {
  booted: boolean;
  /** o login deu certo, mas os dados não carregaram (sem internet) */
  loadError: boolean;
  retryLoad(): Promise<void>;
  user: AuthUser | null;
  profile: UserProfile | null;
  pets: Pet[];
  activePetId: string | null;
  data: PetData;
  onboardingSeen: boolean;
  notificationsOn: boolean;
  toast: string | null;
  stampFx: StampFx | null;
  /** cuidado aguardando a data do carimbo (abre a folha "Quando tomou?") */
  stampAsk: string | null;
  /** ao corrigir a data: a dose antiga só sai quando a nova for confirmada */
  stampReplace: string | null;
  draft: Draft;

  init(): void;
  seeOnboarding(): Promise<void>;
  signUp(name: string, email: string, pw: string): Promise<void>;
  signIn(email: string, pw: string): Promise<void>;
  /** Login com Google ou Apple. 'cancel' = a pessoa fechou a janela. */
  signInWith(provider: 'google' | 'apple'): Promise<'ok' | 'cancel'>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;

  setActivePet(id: string): Promise<void>;
  setDraft(patch: Partial<Draft>): void;
  startNewPassport(): void;
  startEdit(pet: Pet): void;
  emitPassport(): Promise<Pet>;
  saveEdit(): Promise<void>;

  askStamp(careId: string | null, replaceDay?: string): void;
  checkRoutine(item: RoutineItem, minutes?: string): Promise<void>;
  uncheckRoutine(key: string): Promise<void>;
  setRoutine(r: Routine): Promise<void>;
  updateWeight(id: string, kg: number, day: string): Promise<void>;
  deleteWeight(id: string): Promise<void>;
  updateDiary(e: DiaryEntry): Promise<void>;
  removeDose(careId: string, day: string): Promise<void>;
  stamp(careId: string, day?: string, place?: string): Promise<void>;
  setPetPhoto(uri: string | null): Promise<void>;
  setMicrochip(has: 'sim' | 'nao' | 'naosei', number?: string): Promise<void>;
  saveTrip(t: Trip): Promise<void>;
  deleteTrip(id: string): Promise<void>;
  toggleTripItem(tripId: string, key: string): Promise<void>;
  addReminder(name: string, day: string): Promise<void>;
  addCare(input: { name: string; category: CareCategory; applied: string | null; next: string | null; recurrence: Recurrence; reminders: number[]; place: string }): Promise<void>;
  deleteCare(careId: string): Promise<void>;
  addWeight(kg: number): Promise<void>;
  addDiary(e: { uri: string; note: string; kind: DiaryKind; tags: string[]; mood?: DiaryEntry['mood']; day?: string }): Promise<void>;
  deleteDiary(id: string): Promise<void>;
  ask(text: string, photoUri?: string, audio?: { uri: string; mime: string }): Promise<{ status: 'ok' | 'limit' | 'noai' | 'error'; why?: string }>;
  checkinRacao(time: string): Promise<void>;
  buy(itemId: string): Promise<'ok' | 'no'>;
  toggleEquip(itemId: string): Promise<void>;
  setPlan(plan: Plan): Promise<void>;
  setNotifications(on: boolean, hour?: number): Promise<void>;
  deleteActivePet(): Promise<void>;
  deleteAccount(): Promise<'ok' | 'relogin'>;

  showToast(msg: string): void;
  clearStampFx(): void;
}

const b = () => backend();

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); });
  });
}

function haptic(kind: 'success' | 'light' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}

async function loadPetData(petId: string): Promise<PetData> {
  const colls: Collection[] = ['cares', 'stamps', 'ledger', 'weights', 'diary', 'chat', 'trips'];
  const lists = await Promise.all(colls.map((c) => b().list(petId, c)));
  const d = Object.fromEntries(colls.map((c, i) => [c, lists[i]])) as unknown as PetData;
  d.chat.sort((a, x) => a.at.localeCompare(x.at));
  d.ledger.sort((a, x) => a.at.localeCompare(x.at));
  return d;
}

export const useApp = create<State>((set, get) => {
  // ---------------------------------------------------------------- helpers
  const pet = () => get().pets.find((p) => p.id === get().activePetId) ?? null;
  const plan = (): Plan => get().profile?.plan ?? 'economica';

  /**
   * Grava no banco sem travar a tela: sem internet o Firebase guarda na fila e só confirma depois,
   * então esperamos no máximo 6 s. `forPet` fixa o pet (troca de pet durante uma ação lenta).
   */
  async function persist<T extends { id: string }>(coll: Collection, item: T, forPet?: string) {
    const id = forPet ?? pet()?.id;
    if (!id) return;
    try {
      await withTimeout(b().put(id, coll, item), 6000);
    } catch (e) {
      if (e instanceof Error && e.message === 'timeout') return; // fica na fila offline
      get().showToast('Não foi possível salvar. Verifique a internet.');
    }
  }

  function upsertLocal<K extends Collection>(coll: K, item: PetData[K][number], forPet?: string) {
    if (forPet && get().activePetId !== forPet) return; // o usuário trocou de pet: não mistura os dados
    set((s) => {
      const list = s.data[coll] as { id: string }[];
      const i = list.findIndex((x) => x.id === (item as { id: string }).id);
      const next = i >= 0 ? list.map((x, j) => (j === i ? item : x)) : [...list, item];
      return { data: { ...s.data, [coll]: next } };
    });
  }

  async function earn(origin: LedgerOrigin, base: number, ref?: string): Promise<number> {
    const miles = earned(base, plan(), origin);
    const now = new Date();
    const entry: LedgerEntry = { id: newId(), at: now.toISOString(), day: today(), origin, miles, ref };
    const before = levelFor(milesTotals(get().data.ledger).total);
    upsertLocal('ledger', entry);
    await persist('ledger', entry);
    const after = levelFor(milesTotals(get().data.ledger).total);
    if (after.n > before.n) setTimeout(() => get().showToast(`Subiu de nível! ${get().pets.find((x) => x.id === get().activePetId)?.name ?? 'Seu pet'} agora é ${after.name}.`), 1600);
    await claimRewards();
    return miles;
  }

  async function claimRewards() {
    const p = pet();
    if (!p) return;
    const rewards = pendingRewards(p, get().data.ledger);
    if (!rewards.length) return;
    const updated = { ...p, owned: [...p.owned, ...rewards] };
    await savePet(updated);
    const names = rewards.map((r) => itemById(r)?.name ?? r).join(', ');
    setTimeout(() => get().showToast(`Presente de nível: ${names} já está na mala!`), 2600);
  }

  async function savePet(p: Pet) {
    set((s) => ({ pets: s.pets.map((x) => (x.id === p.id ? p : x)) }));
    try { await withTimeout(b().savePet(p), 6000); } catch (e) { if (!(e instanceof Error && e.message === 'timeout')) get().showToast('Não foi possível salvar. Verifique a internet.'); }
  }

  /** Mantém o peso da ficha igual à pesagem mais recente. */
  async function syncWeight() {
    const p = pet();
    if (!p) return;
    const latest = [...get().data.weights].sort((a, x) => a.day.localeCompare(x.day)).pop();
    const kg = latest?.kg ?? null;
    if (kg !== p.weightKg) await savePet({ ...p, weightKg: kg });
  }

  // ---------------------------------------------------------------- backup das fotos na nuvem
  /** Foto do passaporte: sobe em segundo plano e grava a referência com o link da nuvem. */
  async function cloudPetPhoto(petId: string, refNow: string) {
    if (!refNow || hasCloud(refNow)) return;
    const withCloud = await backupPhoto(refNow);
    if (withCloud === refNow) return;
    const cur = get().pets.find((x) => x.id === petId);
    if (cur && cur.photoUri === refNow) await savePet({ ...cur, photoUri: withCloud });
  }

  /** Foto do diário ou do chat: mesmo processo, gravando no pet certo mesmo se o usuário trocou de pet. */
  async function cloudItemPhoto<K extends 'diary' | 'chat'>(coll: K, petId: string, item: PetData[K][number]) {
    const refNow = coll === 'diary' ? (item as DiaryEntry).uri : (item as ChatMsg).photoUri ?? '';
    if (!refNow || hasCloud(refNow)) return;
    const withCloud = await backupPhoto(refNow);
    if (withCloud === refNow) return;
    const latest = get().activePetId === petId ? (get().data[coll] as { id: string }[]).find((x) => x.id === item.id) ?? item : item;
    const patched = coll === 'diary' ? { ...(latest as DiaryEntry), uri: withCloud } : { ...(latest as ChatMsg), photoUri: withCloud };
    upsertLocal(coll, patched as PetData[K][number], petId);
    await persist(coll, patched, petId);
  }

  /** Fotos antigas (só no aparelho): faz o backup aos poucos ao abrir o app. */
  let syncing = false;
  async function syncPhotos() {
    if (syncing || b().mode !== 'firebase') return;
    syncing = true;
    try {
      for (const p of get().pets) if (p.photoUri && !hasCloud(p.photoUri)) await cloudPetPhoto(p.id, p.photoUri);
      const pid = get().activePetId;
      if (pid) {
        for (const e of get().data.diary) if (e.uri && !hasCloud(e.uri)) await cloudItemPhoto('diary', pid, e);
        for (const m of get().data.chat) if (m.photoUri && !hasCloud(m.photoUri)) await cloudItemPhoto('chat', pid, m);
      }
    } finally { syncing = false; }
  }

  // uma reprogramação por vez (chamadas seguidas não duplicam notificações)
  let emitting = false;
  let signupName = '';
  let scheduling: Promise<void> = Promise.resolve();
  let pendingResched = false;
  async function reschedule() {
    if (pendingResched) return;
    pendingResched = true;
    scheduling = scheduling.then(async () => {
      pendingResched = false;
      const { pets, activePetId, data, notificationsOn, profile } = get();
      // todos os pets: o aberto usa os dados da tela; os outros são lidos do banco
      const list = await Promise.all(pets.map(async (p) => ({
        pet: p,
        cares: p.id === activePetId ? data.cares : await withTimeout(b().list<Care>(p.id, 'cares'), 8000).catch(() => [] as Care[]),
      })));
      await rescheduleAll(list, profile?.notifyHour ?? 9, notificationsOn).catch(() => {});
    });
  }

  async function afterAuth(u: AuthUser | null) {
    if (!u) {
      set({ user: null, profile: null, pets: [], activePetId: null, data: EMPTY_PET_DATA, booted: true });
      return;
    }
    try {
      let profile = await b().getProfile(u.uid);
      if (!profile) {
        profile = { uid: u.uid, name: signupName || u.name || u.email.split('@')[0], email: u.email, plan: 'economica', createdAt: new Date().toISOString(), notifyHour: 9 };
        await b().saveProfile(profile);
        signupName = '';
      }
      const pets = await b().listPets(u.uid);
      const stored = await AsyncStorage.getItem('pp:activePet');
      const activePetId = pets.find((p) => p.id === stored)?.id ?? pets[0]?.id ?? null;
      const data = activePetId ? await loadPetData(activePetId) : EMPTY_PET_DATA;
      set({ user: u, profile, pets, activePetId, data, booted: true, loadError: false });
      reschedule();
      setTimeout(() => { syncPhotos(); }, 4000);
    } catch {
      // não deixa o app achar que não há pet (isso criaria um passaporte duplicado)
      set({ user: u, booted: true, loadError: true });
    }
  }

  return {
    booted: false,
    loadError: false,
    async retryLoad() {
      set({ loadError: false, booted: false });
      await afterAuth(get().user);
    },
    user: null,
    profile: null,
    pets: [],
    activePetId: null,
    data: EMPTY_PET_DATA,
    onboardingSeen: false,
    notificationsOn: true,
    toast: null,
    stampFx: null,
    stampAsk: null,
    stampReplace: null,
    draft: EMPTY_DRAFT,

    init() {
      Promise.all([AsyncStorage.getItem('pp:onboarding'), AsyncStorage.getItem('pp:notifications')]).then(([o, n]) => {
        set({ onboardingSeen: o === '1', notificationsOn: n !== '0' });
        b().onAuth((u) => { afterAuth(u); });
      });
    },
    async seeOnboarding() {
      set({ onboardingSeen: true });
      await AsyncStorage.setItem('pp:onboarding', '1');
    },
    async signUp(name, email, pw) {
      signupName = name.trim();
      await b().signUp(name, email, pw);
      // o login pode ter criado o perfil antes do nome chegar: garante o nome digitado
      const pr = get().profile;
      if (pr && signupName) {
        if (pr.name !== signupName) {
          const fixed = { ...pr, name: signupName };
          set({ profile: fixed });
          await b().saveProfile(fixed).catch(() => {});
        }
        signupName = '';
      }
      // se o perfil ainda está carregando, o afterAuth usa o nome e limpa depois
    },
    async signIn(email, pw) {
      await b().signIn(email, pw);
    },
    async signInWith(provider) {
      const r = provider === 'google' ? await googleSignIn() : await appleSignIn();
      if (!r) return 'cancel';
      if (r.kind === 'apple' && r.name) signupName = r.name; // a Apple só manda o nome na 1ª vez
      try {
        await b().signInSocial(r);
      } catch (e) {
        if (/popup-closed|cancelled-popup/.test(String((e as { code?: string })?.code))) return 'cancel';
        throw e;
      }
      return 'ok';
    },
    async signOut() {
      await socialSignOut();
      await b().signOut();
    },
    async resetPassword(email) {
      await b().resetPassword(email);
    },

    async setActivePet(id) {
      const data = await loadPetData(id);
      set({ activePetId: id, data });
      await AsyncStorage.setItem('pp:activePet', id);
      reschedule();
      syncPhotos();
    },
    setDraft(patch) {
      set((s) => ({ draft: { ...s.draft, ...patch } }));
    },
    startNewPassport() {
      set({ draft: { ...EMPTY_DRAFT, details: { ...EMPTY_DRAFT.details }, answers: {}, whens: {} } });
    },
    startEdit(p) {
      const [y, m, d] = p.birthDate.split('-');
      set({
        draft: {
          editingPetId: p.id, species: p.species, breed: p.breed, coat: p.coat, coatName: p.coatName, details: { ...p.details },
          name: p.name, birth: `${d}/${m}/${y}`, sex: p.sex, weight: p.weightKg ? String(p.weightKg).replace('.', ',') : '', neutered: p.neutered,
          allergies: p.allergies, conditions: p.conditions, meds: p.meds, food: p.food, mealTimes: [...p.mealTimes], answers: {}, whens: {},
          mealsPerDay: p.mealsPerDay === undefined ? p.mealTimes.length || 2 : p.mealsPerDay, grams: p.gramsPerDay ? String(p.gramsPerDay) : '',
          gramsUnknown: p.gramsPerDay === null, photoUri: p.photoUri ?? '', aiSummary: '',
          ancestry: [...(p.ancestry ?? [])], size: p.size ?? null, temperament: [...(p.temperament ?? [])],
        },
      });
    },

    async emitPassport() {
      if (emitting) throw new Error('busy');
      emitting = true;
      try {
      const { draft, user, pets } = get();
      if (!user) throw new Error('not-logged');
      const t = today();
      const now = new Date().toISOString();
      const kg = parseFloat(draft.weight.replace(',', '.'));
      const pet: Pet = {
        id: newId(), ownerId: user.uid, guardianIds: [user.uid], name: draft.name.trim(), species: draft.species, breed: draft.breed,
        coat: draft.coat, coatName: draft.coatName, details: draft.details, birthDate: parseBR(draft.birth) ?? addDays(t, -365),
        sex: draft.sex, weightKg: Number.isFinite(kg) ? kg : null, neutered: draft.neutered, allergies: draft.allergies.trim(),
        conditions: draft.conditions.trim(), meds: draft.meds.trim(), food: draft.food, mealTimes: [...draft.mealTimes].sort(),
        mealsPerDay: draft.mealsPerDay, gramsPerDay: gramsOf(draft), ...(draft.photoUri ? { photoUri: draft.photoUri } : {}),
        ancestry: draft.ancestry, temperament: draft.temperament, ...(draft.size ? { size: draft.size } : {}),
        passportNumber: newPassportNumber(), coverColor: COVER_COLORS[pets.length % COVER_COLORS.length], issuedAt: now,
        owned: [], equipped: [], createdAt: now,
      };
      const types = emissionCareTypes(pet.species, pet.neutered);
      const { cares, stampsFor } = generateItinerary(types, draft.answers, t, newId, draft.whens);
      const stamps: Stamp[] = [
        { id: newId(), kind: 'emissao', code: 'EMI', top: 'PATAPORTE EMITIDO', bottom: 'BEM-VINDO A BORDO', main: 'EMITIDO', sub: t, color: '#B03F29', shape: 'circle', rotation: -14, date: t },
        ...stampsFor.map((c) => makeCareStamp(c, c.lastDate ?? t, pet.name, newId(), 'JÁ APLICADO')),
      ];
      const weights = pet.weightKg ? [{ id: newId(), day: t, kg: pet.weightKg }] : [];
      await b().savePet(pet);
      await Promise.all([
        b().putMany(pet.id, 'cares', cares),
        b().putMany(pet.id, 'stamps', stamps),
        b().putMany(pet.id, 'weights', weights),
      ]);
      set((s) => ({ pets: [...s.pets, pet], activePetId: pet.id, data: { ...EMPTY_PET_DATA, cares, stamps, ledger: [], weights }, draft: EMPTY_DRAFT }));
      await AsyncStorage.setItem('pp:activePet', pet.id);
      reschedule();
      if (pet.photoUri) cloudPetPhoto(pet.id, pet.photoUri);
      return pet;
      } finally { emitting = false; }
    },

    async saveEdit() {
      const { draft } = get();
      const p = get().pets.find((x) => x.id === draft.editingPetId);
      if (!p) return;
      const kg = parseFloat(draft.weight.replace(',', '.'));
      const updated: Pet = {
        ...p, name: draft.name.trim() || p.name, breed: draft.breed, coat: draft.coat, coatName: draft.coatName, details: draft.details,
        birthDate: parseBR(draft.birth) ?? p.birthDate, sex: draft.sex, weightKg: Number.isFinite(kg) ? kg : p.weightKg, neutered: draft.neutered,
        allergies: draft.allergies.trim(), conditions: draft.conditions.trim(), meds: draft.meds.trim(), food: draft.food, mealTimes: [...draft.mealTimes].sort(),
        mealsPerDay: draft.mealsPerDay, gramsPerDay: gramsOf(draft),
        ancestry: draft.ancestry, temperament: draft.temperament, ...(draft.size ? { size: draft.size } : {}),
      };
      await savePet(updated);
      if (updated.photoUri) cloudPetPhoto(updated.id, updated.photoUri);
      if (updated.weightKg && updated.weightKg !== p.weightKg) {
        const t = today();
        const same = get().data.weights.find((x) => x.day === t);
        const w = { id: same?.id ?? newId(), day: t, kg: updated.weightKg };
        upsertLocal('weights', w);
        await persist('weights', w);
      }
      set({ draft: EMPTY_DRAFT });
      reschedule();
      get().showToast('Dados atualizados no passaporte.');
    },

    askStamp(careId, replaceDay) {
      set({ stampAsk: careId, stampReplace: replaceDay ?? null });
    },

    async stamp(careId, day, place) {
      const p = pet();
      const care = get().data.cares.find((c) => c.id === careId);
      if (!p || !care) return;
      const t = day ?? today();
      if (historyOf(care).includes(t)) { set({ stampAsk: null }); get().showToast('Essa dose já está carimbada nessa data.'); return; }
      const withPlace = place?.trim() ? { ...care, place: place.trim() } : care;
      const updated = stampCare(withPlace, t);
      const st = makeCareStamp(care, t, p.name, newId());
      upsertLocal('cares', updated);
      upsertLocal('stamps', st);
      await Promise.all([persist('cares', updated), persist('stamps', st)]);
      const miles = await earn('cuidado', care.miles, `${care.id}:${t}`);
      haptic();
      set({ stampAsk: null, stampFx: { top: st.top, bottom: st.bottom, main: st.main, sub: st.sub, color: st.color, miles, next: updated.nextDate } });
      reschedule();
    },

    async addCare(input) {
      const p = pet();
      if (!p) return;
      const t = today();
      let care: Care = {
        id: newId(), code: codeFromName(input.name), name: input.name.trim(), category: input.category, recurrence: input.recurrence,
        lastDate: null, nextDate: input.next, origin: 'manual', answer: null, place: input.place.trim(), reminders: input.reminders,
        miles: milesForCategory(input.category), active: true, createdAt: new Date().toISOString(),
      };
      if (input.applied && diffDays(input.applied, t) >= 0) {
        care = stampCare(care, input.applied);
        if (input.next) care = { ...care, nextDate: input.next, active: true };
        const st = makeCareStamp(care, input.applied, p.name, newId());
        upsertLocal('cares', care);
        upsertLocal('stamps', st);
        await Promise.all([persist('cares', care), persist('stamps', st)]);
        const miles = await earn('cuidado', care.miles, care.id);
        haptic();
        set({ stampFx: { top: st.top, bottom: st.bottom, main: st.main, sub: st.sub, color: st.color, miles } });
      } else {
        if (!care.nextDate) care = { ...care, nextDate: t };
        upsertLocal('cares', care);
        await persist('cares', care);
        get().showToast('Embarque adicionado ao itinerário.');
      }
      reschedule();
    },

    async deleteCare(careId) {
      const p = pet();
      if (!p) return;
      set((s) => ({ data: { ...s.data, cares: s.data.cares.filter((c) => c.id !== careId) } }));
      try { await b().remove(p.id, 'cares', careId); } catch { /* offline */ }
      reschedule();
    },

    async addWeight(kg) {
      const p = pet();
      if (!p) return;
      const t = today();
      const same = get().data.weights.find((x) => x.day === t);
      const w = { id: same?.id ?? newId(), day: t, kg };
      upsertLocal('weights', w);
      await persist('weights', w);
      await savePet({ ...p, weightKg: kg });
      const recent = get().data.ledger.some((e) => e.origin === 'peso' && diffDays(e.day, t) < 7);
      if (!recent) {
        const m = await earn('peso', MILES.peso);
        get().showToast(`Pesagem registrada · +${m} milhas`);
      } else {
        get().showToast('Pesagem registrada. As milhas de peso são 1 vez por semana.');
      }
    },

    async addDiary({ uri, note, kind, tags, mood, day }) {
      const e: DiaryEntry = { id: newId(), day: day ?? today(), topic: kind, kind, uri, note: note.trim(), tags, ...(mood ? { mood } : {}) };
      upsertLocal('diary', e);
      await persist('diary', e);
      const pidD = get().activePetId;
      if (uri && pidD) cloudItemPhoto('diary', pidD, e);
      const todays = get().data.ledger.filter((x) => x.origin === 'foto' && x.day === today()).length;
      if (todays < 3) {
        const m = await earn('foto', MILES.foto);
        get().showToast(`Registrado no diário de vida · +${m} milhas`);
      } else get().showToast('Registrado no diário de vida.');
    },

    async deleteDiary(id) {
      const p = pet();
      if (!p) return;
      set((s) => ({ data: { ...s.data, diary: s.data.diary.filter((d) => d.id !== id) } }));
      try { await b().remove(p.id, 'diary', id); } catch { /* offline */ }
    },

    async ask(text, photoUri, audio) {
      const p = pet();
      if (!p) return { status: 'ok' };
      const pid = p.id;
      const month = localMonth();
      const used = get().data.chat.filter((m) => m.from === 'user' && localMonth(m.at) === month).length;
      if (used >= LIMITS[plan()].guideMonthly) return { status: 'limit' };
      if (!aiEnabled()) {
        if (audio) return { status: 'noai' };
        const q: ChatMsg = { id: newId(), at: new Date().toISOString(), from: 'user', text: text.trim(), photoUri };
        upsertLocal('chat', q, pid); await persist('chat', q, pid);
        await new Promise((res) => setTimeout(res, 500));
        const a = answerGuide(text, p.name, !!photoUri, p);
        const r: ChatMsg = { id: newId(), at: new Date(Date.now() + 1).toISOString(), from: 'guia', text: a.text, ...(a.level ? { level: a.level } : {}), ...(a.action ? { action: a.action } : {}) };
        upsertLocal('chat', r, pid); await persist('chat', r, pid);
        return { status: 'ok' };
      }
      // com IA: a pergunta só entra no chat quando a resposta chega (se falhar, nada fica pela metade)
      const history = get().data.chat.map((m) => ({ from: m.from, text: m.text }));
      let a: Awaited<ReturnType<typeof askGuideAI>>;
      try {
        const img = photoUri ? await imageForAi(photoUri) : undefined;
        const snd = audio ? await readBase64(audio.uri).then((x) => ({ data: x.data, mime: audio.mime })) : undefined;
        a = await askGuideAI({ question: text, audio: snd, img, context: petContext(p, get().data), history });
      } catch (e) {
        return { status: 'error', why: aiErrorText(e) };
      }
      if (audio && !a.transcript?.trim()) return { status: 'error', why: 'não deu para ouvir a sua voz. Fale mais perto do microfone, por pelo menos 2 segundos' };
      const at = Date.now();
      const q: ChatMsg = { id: newId(), at: new Date(at).toISOString(), from: 'user', text: audio ? `“${a.transcript!.trim()}”` : text.trim(), photoUri };
      const r: ChatMsg = { id: newId(), at: new Date(at + 1).toISOString(), from: 'guia', text: a.text, ...(a.kind === 'saude' ? { level: a.level, action: a.action } : {}) };
      upsertLocal('chat', q, pid); upsertLocal('chat', r, pid);
      await persist('chat', q, pid); await persist('chat', r, pid);
      if (photoUri) cloudItemPhoto('chat', pid, q);
      if (get().activePetId === pid) {
        const todays = get().data.ledger.filter((x) => x.origin === 'guia' && x.day === today()).length;
        if (todays < 3) await earn('guia', MILES.guia);
      }
      return { status: 'ok' };
    },

    async checkinRacao(time) {
      const todays = get().data.ledger.filter((e) => e.origin === 'racao' && e.day === today());
      if (todays.some((e) => e.ref === time)) return;
      // milhas só até o nº de refeições do dia (mudar o horário depois de marcar não dá milhas extras)
      const cap = Math.max(1, pet()?.mealTimes.length ?? 1);
      const paid = todays.filter((e) => e.miles > 0).length;
      const m = await earn('racao', paid >= cap ? 0 : MILES.racao, time);
      haptic('success');
      get().showToast(m ? `Comida das ${time} · +${m} milhas` : `Comida das ${time} marcada`);
    },

    async buy(itemId) {
      const p = pet();
      const item = itemById(itemId);
      if (!p || !item) return 'no';
      if (itemState(item, p, get().data.ledger, plan()) !== 'comprar') return 'no';
      const entry: LedgerEntry = { id: newId(), at: new Date().toISOString(), day: today(), origin: 'dutyfree', miles: -item.price, ref: item.id };
      upsertLocal('ledger', entry);
      await persist('ledger', entry);
      const withItem = { ...p, owned: [...p.owned, item.id] };
      await savePet({ ...withItem, equipped: equip(withItem, item.id) });
      haptic('success');
      get().showToast(`${item.name} foi para a mala e já está ${art(p).no} ${p.name}!`);
      return 'ok';
    },

    async toggleEquip(itemId) {
      const p = pet();
      if (!p || !p.owned.includes(itemId)) return;
      await savePet({ ...p, equipped: p.equipped.includes(itemId) ? unequip(p, itemId) : equip(p, itemId) });
    },

    async setPlan(newPlan) {
      const pr = get().profile;
      if (!pr) return;
      const updated = { ...pr, plan: newPlan };
      set({ profile: updated });
      try { await b().saveProfile(updated); } catch { get().showToast('Não foi possível salvar. Verifique a internet.'); }
    },

    async setNotifications(on, hour) {
      set({ notificationsOn: on });
      await AsyncStorage.setItem('pp:notifications', on ? '1' : '0');
      const pr = get().profile;
      if (pr && hour !== undefined) {
        const updated = { ...pr, notifyHour: hour };
        set({ profile: updated });
        await b().saveProfile(updated).catch(() => {});
      }
      reschedule();
    },

    async deleteAccount() {
      try {
        await b().deleteAccount();
      } catch (e) {
        if ((e as { code?: string })?.code === 'auth/requires-recent-login') return 'relogin';
        throw e;
      }
      await AsyncStorage.multiRemove(['pp:activePet', 'pp:aiConsent']).catch(() => {});
      set({ user: null, profile: null, pets: [], activePetId: null, data: EMPTY_PET_DATA });
      reschedule();
      return 'ok';
    },

    async deleteActivePet() {
      const p = pet();
      if (!p) return;
      // fotos desse pet na nuvem
      const urls = [p.photoUri ?? '', ...get().data.diary.map((e) => e.uri), ...get().data.chat.map((m) => m.photoUri ?? '')]
        .map((r) => splitPhoto(r).cloud).filter(Boolean);
      if (urls.length) await b().deletePhotos(urls).catch(() => undefined);
      await b().deletePet(p.id);
      const pets = get().pets.filter((x) => x.id !== p.id);
      const next = pets[0]?.id ?? null;
      set({ pets, activePetId: next, data: next ? await loadPetData(next) : EMPTY_PET_DATA });
      reschedule();
    },

    async checkRoutine(item, minutes) {
      const p = pet();
      if (!p || item.done) return;
      const t = today();
      // evita milhas em dobro com toque duplo
      if (routineItems(p, get().data.ledger, t).find((i) => i.key === item.key)?.done) return;
      if (item.kind === 'racao' && item.time) {
        await get().checkinRacao(item.time);
      } else {
        const m = await earn('rotina', MILES.rotina, item.key);
        haptic('success');
        get().showToast(`${item.title} · +${m} milhas`);
      }
      if (item.kind === 'passeio') {
        const e: DiaryEntry = { id: `rot-${t}-${item.key}`, day: t, topic: 'passeio', kind: 'passeio', uri: '', note: `${item.title} registrado na rotina.`, tags: minutes ? [minutes] : [] };
        upsertLocal('diary', e);
        await persist('diary', e);
      }
      const items = routineItems(p, get().data.ledger, t);
      const already = get().data.ledger.some((x) => x.origin === 'dia_completo' && x.day === t);
      if (routineProgress(items).complete && !already) {
        const miles = await earn('dia_completo', MILES.dia_completo);
        const e: DiaryEntry = { id: `rot-${t}-dia`, day: t, topic: 'rotina', kind: 'rotina', uri: '', note: dayRecap(items), tags: [], mood: 'feliz' };
        upsertLocal('diary', e);
        await persist('diary', e);
        haptic('success');
        set({ stampFx: { top: 'ROTINA COMPLETA', bottom: `${p.name.toUpperCase()} · DIÁRIO`, main: '100%', sub: t, color: '#357E4C', miles } });
      }
    },

    async uncheckRoutine(key) {
      const p = pet();
      if (!p) return;
      const t = today();
      const mealRef = key.startsWith('racao-') ? key.slice(6) : null;
      const gone = get().data.ledger.filter((e) => e.day === t && (e.origin === 'dia_completo' || (e.origin === 'rotina' && e.ref === key) || (mealRef && e.origin === 'racao' && e.ref === mealRef)));
      if (!gone.length) return;
      const diaryGone = [`rot-${t}-${key}`, `rot-${t}-dia`];
      set((s) => ({ data: { ...s.data, ledger: s.data.ledger.filter((e) => !gone.includes(e)), diary: s.data.diary.filter((d) => !diaryGone.includes(d.id)) } }));
      for (const e of gone) await b().remove(p.id, 'ledger', e.id).catch(() => {});
      for (const id of diaryGone) await b().remove(p.id, 'diary', id).catch(() => {});
      get().showToast('Desmarcado.');
    },

    async updateWeight(id, kg, day) {
      const p = pet();
      if (!p) return;
      const w = { id, day, kg };
      const dup = get().data.weights.filter((x) => x.day === day && x.id !== id);
      if (dup.length) {
        set((s) => ({ data: { ...s.data, weights: s.data.weights.filter((x) => !dup.includes(x)) } }));
        for (const x of dup) await b().remove(p.id, 'weights', x.id).catch(() => {});
      }
      upsertLocal('weights', w);
      await persist('weights', w);
      await syncWeight();
      get().showToast('Pesagem corrigida.');
    },

    async deleteWeight(id) {
      const p = pet();
      if (!p) return;
      set((s) => ({ data: { ...s.data, weights: s.data.weights.filter((w) => w.id !== id) } }));
      try { await b().remove(p.id, 'weights', id); } catch { /* offline */ }
      await syncWeight();
      get().showToast('Pesagem apagada.');
    },

    async updateDiary(e) {
      upsertLocal('diary', e);
      await persist('diary', e);
      get().showToast('Registro atualizado.');
      const pidU = get().activePetId;
      if (e.uri && pidU) cloudItemPhoto('diary', pidU, e);
    },

    async removeDose(careId, day) {
      const p = pet();
      const care = get().data.cares.find((c) => c.id === careId);
      if (!p || !care) return;
      const hist = historyOf(care).filter((d) => d !== day);
      const last = hist[hist.length - 1] ?? null;
      const updated: Care = last
        ? { ...care, history: hist, lastDate: last, nextDate: addRecurrence(last, care.recurrence), active: !!care.recurrence }
        : { ...care, history: [], lastDate: null, nextDate: today(), active: true };
      upsertLocal('cares', updated);
      await persist('cares', updated);
      const miles = get().data.ledger.filter((e) => e.origin === 'cuidado' && e.ref === `${careId}:${day}`);
      if (miles.length) {
        set((s) => ({ data: { ...s.data, ledger: s.data.ledger.filter((e) => !miles.includes(e)) } }));
        for (const e of miles) await b().remove(p.id, 'ledger', e.id).catch(() => {});
      }
      const stamps = get().data.stamps.filter((st) => st.careId === careId && st.date === day);
      set((s) => ({ data: { ...s.data, stamps: s.data.stamps.filter((st) => !stamps.includes(st)) } }));
      await Promise.all(stamps.map((st) => b().remove(p.id, 'stamps', st.id).catch(() => {})));
      reschedule();
      get().showToast('Dose removida. As próximas datas foram recalculadas.');
    },

    async setRoutine(r) {
      const p = pet();
      if (!p) return;
      await savePet({ ...p, routine: r });
      reschedule();
      get().showToast('Rotina atualizada.');
    },

    async setPetPhoto(uri) {
      const p = pet();
      if (!p) return;
      const { photoUri: _old, ...rest } = p;
      await savePet(uri ? { ...rest, photoUri: uri } : rest);
      get().showToast(uri ? 'Foto do passaporte atualizada.' : 'Voltamos para o avatar desenhado.');
      if (uri) cloudPetPhoto(p.id, uri);
    },

    async setMicrochip(has, number) {
      const p = pet();
      if (!p) return;
      await savePet({ ...p, microchip: { has, ...(number?.trim() ? { number: number.trim() } : {}) } });
    },

    async saveTrip(tr) {
      upsertLocal('trips', tr);
      await persist('trips', tr);
    },

    async deleteTrip(id) {
      const p = pet();
      if (!p) return;
      set((s) => ({ data: { ...s.data, trips: s.data.trips.filter((x) => x.id !== id) } }));
      try { await b().remove(p.id, 'trips', id); } catch { /* offline */ }
    },

    async toggleTripItem(tripId, key) {
      const tr = get().data.trips.find((x) => x.id === tripId);
      if (!tr) return;
      const done = tr.done.includes(key) ? tr.done.filter((k) => k !== key) : [...tr.done, key];
      await get().saveTrip({ ...tr, done });
      if (!tr.done.includes(key)) haptic('success');
    },

    async addReminder(name, day) {
      const exists = get().data.cares.some((c) => c.name === name && c.active);
      if (exists) { get().showToast('Esse lembrete já está no itinerário.'); return; }
      await get().addCare({ name, category: 'outro', applied: null, next: day < today() ? today() : day, recurrence: null, reminders: [7, 1, 0], place: '' });
    },

    showToast(msg) {
      set({ toast: msg });
      setTimeout(() => { if (get().toast === msg) set({ toast: null }); }, 2800);
    },
    clearStampFx() {
      set({ stampFx: null });
    },
  };
});

/** Tudo que a IA precisa saber sobre o pet para responder de forma personalizada. */
function petContext(p: Pet, data: PetData): string {
  const t = today();
  const age = ageYears(p.birthDate, t);
  const cares = data.cares.map((c) => `${c.name}: ${c.lastDate ? `tomou ${c.lastDate}` : 'sem registro'}${c.nextDate ? `, próxima ${c.nextDate}` : ''}`).join('; ');
  const recent = [...data.diary].sort((a, x) => x.day.localeCompare(a.day)).slice(0, 5).map((e) => `${e.day} ${e.kind ?? e.topic}: ${[e.tags?.join(', '), e.note].filter(Boolean).join(' — ')}`).join('; ');
  return [
    `${p.name}, ${p.species === 'dog' ? 'cão' : 'gato'}, ${p.sex === 'M' ? 'macho' : 'fêmea'}, ${age} ${age === 1 ? 'ano' : 'anos'}, ${p.weightKg ? `${p.weightKg} kg` : 'peso não informado'}, castrado: ${p.neutered}.`,
    breedContext(p),
    `Alergias: ${p.allergies || 'nenhuma'}. Condições: ${p.conditions || 'nenhuma'}. Remédios: ${p.meds || 'nenhum'}.`,
    `Alimentação: ${foodLabel(p.food).toLowerCase()}, ${p.mealTimes.length}x/dia${p.gramsPerDay ? `, ${p.gramsPerDay} g/dia` : ''}.`,
    cares ? `Vacinas e cuidados: ${cares}.` : '',
    recent ? `Diário recente: ${recent}.` : '',
  ].filter(Boolean).join('\n');
}

function gramsOf(d: Draft): number | null {
  if (d.gramsUnknown) return null;
  const g = parseInt(d.grams.replace(/\D/g, ''), 10);
  return Number.isFinite(g) && g > 0 ? g : null;
}

export { mealTimesFor };

export function useActivePet(): Pet | null {
  return useApp((s) => s.pets.find((p) => p.id === s.activePetId) ?? null);
}

export { rotationFor };
