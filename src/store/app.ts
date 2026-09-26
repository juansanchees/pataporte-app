import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { backend, newId, type AuthUser, type Collection } from '@/data';
import { careTypesFor, emissionCareTypes, foodLabel, milesForCategory, codeFromName, mealTimesFor } from '@/domain/catalog';
import { generateItinerary, historyOf, makeCareStamp, setNextDate, stampCare, rotationFor, type HistoryWhen } from '@/domain/itinerary';
import { canRedeemMonth, destinationById, earned, EXTRA_WALK_REF, extraWalkEarns, levelFor, mapProgress, milesSummary, milesTotals, MILES, REDEEM_COST, REDEEM_MONTHS, streakBonusDue, type DestinationId, type MapProgress, type MilesReason, type MilesSummary, type RedeemCheck } from '@/domain/gamification';
import { effectivePlan, equip, itemById, syncedStorePlan, itemState, limitsFor, paywallTrigger, pendingRewards, trialNoticeAt, unequip, PRICES, type PaywallEvent, type PlanLimits } from '@/domain/commerce';
import { applyVaccineAnswer, planSeries, vaccineById, vaccinePlan, nextDoseFromAnswer, type NextDose, type PlanOptions, type VaccineId, type VaccinePlan } from '@/domain/vaccines';
import { durationMonths, nextFromDuration, PARASITE_CODE, type ParasiteKind, type ParasiteNext } from '@/domain/parasites';
import { doseKey, onTime, scheduleTimes, shiftMinutes, statusForGiven, suggestShift } from '@/domain/meds';
import { type TodayItem } from '@/domain/today';
import { migratePetData, migrateProfile } from '@/domain/migrate';
import { answerGuide } from '@/domain/guide';
import { aiEnabled, aiErrorText, askGuideAI, imageForAi, readBase64 } from '@/services/ai';
import { newPassportNumber } from '@/domain/mrz';
import { addDays, addRecurrence, ageYears, atTime, diffDays, fmtBR, hhmmToMin, localMonth, minToHHMM, parseBR, today } from '@/domain/dates';
import { breedContext } from '@/domain/breeds';
import { EMPTY_PET_DATA, PET_COLLECTIONS, type Care, type CareCategory, type ChatMsg, type DiaryEntry, type DiaryKind, type DoseLog, type HistoryAnswer, type LastAnswer, type ParasiteDuration, type PaywallTriggerId, type Reminder, type ReminderRepeat, type ReminderType, type MedSchedule, type Trip, type LedgerEntry, type LedgerOrigin, type Pet, type PetData, type PetDetails, type Plan, type PlanState, type Recurrence, type Species, type Stamp, type TeethCare, type TriState, type UserProfile, type VaccineAnswer } from '@/domain/types';
import { registerNotificationHandler, rescheduleAll, snoozeDose, type NotificationActionEvent } from '@/services/notifications';
import { backupPhoto, hasCloud, splitPhoto } from '@/services/photos';
import { removeEntries, seasonId } from '@/services/ranking';
import { appleSignIn, googleSignIn, socialSignOut } from '@/services/socialAuth';
import { dayRecap, defaultRoutine, routineItems, routineProgress, type RoutineItem } from '@/domain/routine';
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
  /** v1.1 cadastro · capítulo 3: resposta de cada vacina ('V10', 'ARB', …) */
  vaccineAnswers?: Partial<Record<string, VaccineAnswer>>;
  /** v1.1 cadastro · capítulo 4: vermífugo e antipulgas (separados) */
  parasites?: Partial<Record<ParasiteKind, { last: LastAnswer; duration: ParasiteDuration }>>;
  /** v1.1 cadastro · capítulo 5: "Você escova os dentes?" (escova = liga "Escovar os dentes" na rotina) */
  teethCare?: TeethCare;
}

/** Entrada de "+ Lembrete". Remédio: passe `med` (title vira o nome do remédio se vazio). */
export interface NewReminder {
  type: ReminderType;
  title?: string;
  note?: string;
  /** YYYY-MM-DD (padrão hoje) */
  date?: string;
  time?: string | null;
  repeat?: ReminderRepeat;
  med?: Omit<MedSchedule, 'startDate'> & { startDate?: string };
  notify?: boolean;
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
  vaccineAnswers: {},
  parasites: {},
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
  addCare(input: { name: string; category: CareCategory; applied: string | null; next: string | null; recurrence: Recurrence; reminders: number[]; place: string }): Promise<void>;
  deleteCare(careId: string): Promise<void>;
  addWeight(kg: number): Promise<void>;
  addDiary(e: { uri: string; note: string; kind: DiaryKind; tags: string[]; mood?: DiaryEntry['mood']; day?: string }): Promise<void>;
  deleteDiary(id: string): Promise<void>;
  ask(text: string, photoUri?: string, audio?: { uri: string; mime: string }): Promise<{ status: 'ok' | 'limit' | 'noai' | 'error'; why?: string; paywall?: PaywallTriggerId }>;
  checkinRacao(time: string): Promise<void>;
  buy(itemId: string): Promise<'ok' | 'no'>;
  toggleEquip(itemId: string): Promise<void>;
  setPlan(plan: Plan): Promise<void>;
  setNotifications(on: boolean, hour?: number): Promise<void>;
  deleteActivePet(): Promise<void>;
  deleteAccount(): Promise<'ok' | 'relogin'>;

  showToast(msg: string): void;
  clearStampFx(): void;

  // ================================================================ v1.1
  /** paywall pedido por uma ação da store (ex.: 1ª vacina registrada). A UI mostra e chama markPaywallSeen. */
  pendingPaywall: PaywallTriggerId | null;
  /** classe que vale agora (teste grátis / mês trocado por milhas contam como Primeira Classe) */
  plan(): Plan;
  limits(): PlanLimits;
  /** Deve abrir paywall para este evento? (não marca como visto) */
  paywallFor(event: PaywallEvent): PaywallTriggerId | null;
  markPaywallSeen(trigger: PaywallTriggerId): Promise<void>;
  /** Teste grátis de 7 dias (simulado enquanto não há SDK de compras). */
  startTrial(period?: 'mensal' | 'anual'): Promise<void>;
  /** Pode adicionar pet? Se não, qual paywall. */
  canAddPetNow(): { ok: boolean; paywall: PaywallTriggerId | null };
  /** Conta 1 leitura de carteirinha por foto (limite mensal da classe). */
  consumeCardScan(): Promise<'ok' | 'limit'>;
  setCity(city: string): Promise<void>;
  /** Veterinário de confiança (tela de Emergência). null apaga. */
  setVet(vet: { name?: string; phone: string } | null): Promise<void>;
  /** Compra real na loja (RevenueCat): grava planState.source='loja' + until (e o fim do teste, se for teste). */
  applyStorePurchase(p: { isTrial: boolean; expiresAt: string | null; period?: 'mensal' | 'anual' }): Promise<void>;
  /**
   * Estado atual da assinatura na loja (RevenueCat), lido ao abrir o app, ao voltar para ele e quando a loja avisa.
   * Ativa → renova a validade (applyStorePurchase). Inativa → quem era assinante da loja volta para a Econômica.
   * Teste simulado, mês comprado com milhas e modo simulado não são tocados.
   */
  syncStorePlan(s: { active: boolean; isTrial: boolean; expiresAt: string | null }): Promise<void>;

  setDraftVaccine(id: string, answer: VaccineAnswer): NextDose;
  setDraftParasite(kind: ParasiteKind, last: LastAnswer, duration: ParasiteDuration): ParasiteNext;
  /** Plano de vacinas do pet ativo (ou do rascunho, durante o cadastro). */
  vaccinePlanNow(opts?: PlanOptions): VaccinePlan | null;
  /** Pet já cadastrado: registra/atualiza a resposta da vacina (cria o cuidado se faltar). */
  registerVaccineAnswer(id: VaccineId, answer: VaccineAnswer): Promise<{ next: NextDose; paywall: PaywallTriggerId | null } | null>;
  /** "Colocar tudo na agenda": grava as doses sugeridas do plano nos cuidados de vacina. */
  applyVaccinePlan(opts?: PlanOptions): Promise<void>;
  /** Vermífugo/antipulgas: última vez (data ou resposta) + duração → próxima data. */
  setParasiteLast(kind: ParasiteKind, last: string | LastAnswer, duration: ParasiteDuration): Promise<ParasiteNext | null>;

  addReminder(input: NewReminder): Promise<Reminder | null>;
  updateReminder(id: string, patch: Partial<Omit<Reminder, 'id' | 'createdAt'>>): Promise<void>;
  deleteReminder(id: string): Promise<void>;
  /** v1.0: lembrete de data vira um cuidado "outro" no itinerário (usado pela checklist de viagem). */
  addDateReminder(name: string, day: string): Promise<void>;
  /** Marca dose: 'given' (at = quando deu; atraso > 60 min grava 'late') ou 'skipped'. */
  markDose(reminderId: string, day: string, time: string, status: 'given' | 'skipped', at?: Date | string): Promise<DoseLog | null>;
  unmarkDose(reminderId: string, day: string, time: string): Promise<void>;
  /** Aplica a sugestão de horários fora da madrugada (muda med.firstDose). false = não precisa/impossível. */
  applyNightShift(reminderId: string): Promise<boolean>;
  /** Passeio extra agora (sem horário na rotina nem lembrete): +10 milhas (até 3 por dia) e vai para o diário. */
  recordWalk(minutes?: string): Promise<number>;
  /** "Mudar data": muda a data da próxima dose de um cuidado (sem carimbar). */
  setCareNextDate(careId: string, day: string): Promise<void>;
  /** Marca um item da lista "Hoje" (rotina, dose ou lembrete). */
  markTodayItem(item: TodayItem, opts?: { at?: Date | string; minutes?: string }): Promise<void>;
  unmarkTodayItem(item: TodayItem): Promise<void>;

  /** Ganha milhas pela tabela v1.1 (dobro na Primeira Classe). Com `ref`, não repete. Retorna o ganho (0 = repetido). */
  earnMiles(reason: MilesReason, ref?: string): Promise<number>;
  milesNow(): MilesSummary;
  mapNow(): MapProgress & { at: DestinationId };
  /** Viaja no mapa (não gasta milhas). 1ª chegada ganha o carimbo do destino. */
  travelTo(dest: DestinationId): Promise<'ok' | 'bloqueado'>;
  buyShopItem(itemId: string): Promise<'ok' | 'no'>;
  /** Troca 2.000 milhas por 1 mês de Primeira Classe (1 vez a cada 12 meses). */
  redeemMonth(): Promise<RedeemCheck>;

  /** Trata botões das notificações. A store já trata 'dei' e 'adiar15'; devolve `route` sugerida para a UI. */
  handleNotificationAction(e: NotificationActionEvent): Promise<{ route?: string; petId?: string }>;
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
  const colls: Collection[] = [...PET_COLLECTIONS];
  const lists = await Promise.all(colls.map((c) => b().list(petId, c)));
  const d = migratePetData(Object.fromEntries(colls.map((c, i) => [c, lists[i]])) as unknown as Partial<PetData>);
  d.chat.sort((a, x) => a.at.localeCompare(x.at));
  d.ledger.sort((a, x) => a.at.localeCompare(x.at));
  return d;
}

export const useApp = create<State>((set, get) => {
  // ---------------------------------------------------------------- helpers
  const pet = () => get().pets.find((p) => p.id === get().activePetId) ?? null;
  const plan = (): Plan => effectivePlan(get().profile);

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
    // v1.1: +50 a cada 7 dias seguidos com cuidado
    if (origin !== 'sequencia' && miles >= 0 && streakBonusDue(get().data.ledger, today())) {
      const bonus = await earn('sequencia', MILES.sequencia);
      setTimeout(() => get().showToast(`7 dias seguidos! +${bonus} milhas`), 2200);
    }
    return miles;
  }

  async function saveProfile(p: UserProfile) {
    set({ profile: p });
    try { await withTimeout(b().saveProfile(p), 6000); } catch (e) { if (!(e instanceof Error && e.message === 'timeout')) get().showToast('Não foi possível salvar. Verifique a internet.'); }
  }

  /** Grava um cuidado (Care) do pet ativo. */
  async function saveCare(c: Care) {
    upsertLocal('cares', c);
    await persist('cares', c);
  }

  /** Cuidado do catálogo (cria se o pet ainda não tem). */
  function careFor(code: string): Care | null {
    const p = pet();
    if (!p) return null;
    const found = get().data.cares.find((c) => c.code === code);
    if (found) return found;
    const t = careTypesFor(p.species, p.neutered).find((x) => x.code === code);
    if (!t) return null;
    return { id: newId(), code: t.code, name: t.name, category: t.category, recurrence: t.recurrence, lastDate: null, nextDate: null, origin: 'manual', answer: null, place: '', reminders: t.category === 'vacina' ? [7, 1, 0] : [3, 0], miles: t.miles, active: true, createdAt: new Date().toISOString() };
  }

  function vaccineAnswersOf(cares: Care[]): Partial<Record<string, VaccineAnswer>> {
    const out: Partial<Record<string, VaccineAnswer>> = {};
    for (const c of cares) if (c.category === 'vacina' && c.vaccineAnswer) out[c.code] = c.vaccineAnswer;
    return out;
  }

  /** Cuidado de vermífugo/antipulgas a partir da última vez e da duração. */
  function parasiteCare(c: Care, last: string | LastAnswer, duration: ParasiteDuration, t: string): { care: Care; next: ParasiteNext; stampDay: string | null } {
    const next = nextFromDuration(last, duration, t);
    const months = durationMonths(duration);
    const realDay = typeof last === 'string' ? last : last.kind === 'data' ? last.date : last.kind === 'mes' ? next.last ?? null : null;
    const history = realDay ? Array.from(new Set([...(c.history ?? (c.lastDate ? [c.lastDate] : [])), realDay])).sort() : c.history ?? [];
    const { lastApprox: _a, ...rest } = c;
    const care: Care = {
      ...rest, durationMonths: months, recurrence: { unit: 'month', every: months }, history, lastDate: history[history.length - 1] ?? null,
      nextDate: next.next, active: true, ...(typeof last === 'string' ? {} : { lastAnswer: last }), ...(next.approx ? { lastApprox: true } : {}),
      answer: typeof last === 'string' ? 'tomei' : last.kind === 'nunca' ? 'nao' : last.kind === 'naosei' ? 'naosei' : 'tomei',
    };
    return { care, next, stampDay: realDay && !(c.history ?? []).includes(realDay) ? realDay : null };
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

  /** Tira os pets do ranking público (temporada atual e a anterior). Nunca trava a exclusão. */
  async function dropRanking(petIds: string[]) {
    const uid = get().user?.uid;
    if (!uid || !petIds.length) return;
    const t = today();
    const seasons = [seasonId(t), seasonId(addDays(`${seasonId(t)}-01`, -1))];
    try { await withTimeout(Promise.all(seasons.map((s) => removeEntries(uid, petIds, s))), 5000); } catch { /* sem internet: fica para depois */ }
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
      const list = await Promise.all(pets.map(async (p) => p.id === activePetId
        ? { pet: p, cares: data.cares, reminders: data.reminders, doses: data.doses }
        : {
          pet: p,
          cares: await withTimeout(b().list<Care>(p.id, 'cares'), 8000).catch(() => [] as Care[]),
          reminders: await withTimeout(b().list<Reminder>(p.id, 'reminders'), 8000).catch(() => [] as Reminder[]),
          doses: await withTimeout(b().list<DoseLog>(p.id, 'doses'), 8000).catch(() => [] as DoseLog[]),
        }));
      const hour = profile?.notifyHour ?? 9;
      await rescheduleAll(list, hour, notificationsOn, { plan: effectivePlan(profile), trialNoticeAt: trialNoticeAt(profile?.planState, hour) }).catch(() => {});
    });
  }

  async function afterAuth(u: AuthUser | null) {
    if (!u) {
      set({ user: null, profile: null, pets: [], activePetId: null, data: EMPTY_PET_DATA, booted: true });
      return;
    }
    try {
      let profile = await b().getProfile(u.uid);
      if (profile) profile = migrateProfile(profile);
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
        // botões "Dei" / "Adiar 15 min" das notificações de remédio
        registerNotificationHandler((e) => {
          if (e.action === 'dei' || e.action === 'adiar15') return get().handleNotificationAction(e).then(() => undefined);
        });
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
      set({ draft: { ...EMPTY_DRAFT, details: { ...EMPTY_DRAFT.details }, answers: {}, whens: {}, vaccineAnswers: {}, parasites: {} } });
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
          ...(p.teethCare ? { teethCare: p.teethCare } : {}),
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
        ...(draft.teethCare ? { teethCare: draft.teethCare } : {}),
        ...(draft.teethCare === 'escova' ? { routine: { ...defaultRoutine(draft.species), teeth: true } } : {}),
        passportNumber: newPassportNumber(), coverColor: COVER_COLORS[pets.length % COVER_COLORS.length], issuedAt: now,
        owned: [], equipped: [], createdAt: now,
      };
      const types = emissionCareTypes(pet.species, pet.neutered);
      const gen = generateItinerary(types, draft.answers, t, newId, draft.whens);
      let cares = gen.cares;
      const stampsFor = [...gen.stampsFor];
      // v1.1: respostas novas do cadastro (vacinas com plano + vermífugo/antipulgas com duração)
      const vAns = draft.vaccineAnswers ?? {};
      if (Object.keys(vAns).length) {
        const series = planSeries(vaccinePlan(pet, vAns, t));
        cares = cares.map((c) => {
          const a = vAns[c.code];
          if (!a || c.category !== 'vacina') return c;
          const updated = applyVaccineAnswer({ ...c, reminders: [7, 1, 0] }, a, pet, t, series[c.code]);
          const i = stampsFor.findIndex((x) => x.id === c.id);
          if (i >= 0) stampsFor.splice(i, 1);
          if ((a.kind === 'data' || a.kind === 'mes') && updated.lastDate) stampsFor.push(updated);
          return updated;
        });
      }
      for (const kind of ['vermifugo', 'antipulgas'] as ParasiteKind[]) {
        const ans = draft.parasites?.[kind];
        if (!ans) continue;
        cares = cares.map((c) => {
          if (c.code !== PARASITE_CODE[kind]) return c;
          const r = parasiteCare(c, ans.last, ans.duration, t);
          const i = stampsFor.findIndex((x) => x.id === c.id);
          if (i >= 0) stampsFor.splice(i, 1);
          if (r.care.lastDate) stampsFor.push(r.care);
          return r.care;
        });
      }
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
        ...(draft.teethCare ? { teethCare: draft.teethCare } : {}),
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
      // v1.1: vacina em dia vale +100
      const miles = care.category === 'vacina' ? await earn('vacina', MILES.vacina, `${care.id}:${t}`) : await earn('cuidado', care.miles, `${care.id}:${t}`);
      haptic();
      set({ stampAsk: null, stampFx: { top: st.top, bottom: st.bottom, main: st.main, sub: st.sub, color: st.color, miles, next: updated.nextDate } });
      if (care.category === 'vacina') {
        const pw = get().paywallFor('primeira_vacina');
        if (pw) set({ pendingPaywall: pw });
      }
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
      // v1.1: foto do dia vale +5 (1 vez por dia); registro sem foto não dá milhas
      const photoToday = get().data.ledger.some((x) => x.origin === 'foto_dia' && x.day === today());
      if (uri && !photoToday) {
        const m = await earn('foto_dia', MILES.foto_dia);
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
      const lim = limitsFor(plan());
      if (used >= lim.guideMonthly) {
        const pw = paywallTrigger('ia_4a_pergunta', { plan: plan(), guideUsedThisMonth: used, seen: get().profile?.paywallSeen });
        return { status: 'limit', ...(pw ? { paywall: pw } : {}) };
      }
      if ((photoUri || audio) && lim.guideTextOnly) {
        const pw = paywallTrigger('ia_foto', { plan: plan() });
        return { status: 'limit', ...(pw ? { paywall: pw } : {}) };
      }
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
      // simulado (sem SDK de compras): troca a classe base; teste/milhas continuam em planState
      const st = pr.planState;
      const updated: UserProfile = { ...pr, plan: newPlan, planState: { ...(st ?? {}), plan: newPlan === 'economica' ? 'economica' : 'primeira', source: newPlan === 'economica' ? 'gratis' : 'simulado' } };
      set({ profile: updated });
      try { await b().saveProfile(updated); } catch { get().showToast('Não foi possível salvar. Verifique a internet.'); }
      reschedule();
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
      await dropRanking(get().pets.map((x) => x.id));
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
      await dropRanking([p.id]);
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
        // v1.1: passeio vale +10
        const m = item.kind === 'passeio' ? await earn('passeio', MILES.passeio, item.key) : await earn('rotina', MILES.rotina, item.key);
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
      const gone = get().data.ledger.filter((e) => e.day === t && (e.origin === 'dia_completo' || ((e.origin === 'rotina' || e.origin === 'passeio') && e.ref === key) || (mealRef && e.origin === 'racao' && e.ref === mealRef)));
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

    async addDateReminder(name, day) {
      const exists = get().data.cares.some((c) => c.name === name && c.active);
      if (exists) { get().showToast('Esse lembrete já está no itinerário.'); return; }
      await get().addCare({ name, category: 'outro', applied: null, next: day < today() ? today() : day, recurrence: null, reminders: [7, 1, 0], place: '' });
    },

    // ================================================================ v1.1
    pendingPaywall: null,

    plan() {
      return plan();
    },
    limits() {
      return limitsFor(plan());
    },
    paywallFor(event) {
      const { profile, pets, data } = get();
      const month = localMonth();
      return paywallTrigger(event, {
        plan: plan(),
        seen: profile?.paywallSeen,
        petCount: pets.length,
        guideUsedThisMonth: data.chat.filter((m) => m.from === 'user' && localMonth(m.at) === month).length,
        vaccinesRegistered: data.cares.filter((c) => c.category === 'vacina' && (c.lastDate || c.vaccineAnswer)).length,
      });
    },
    async markPaywallSeen(trigger) {
      const pr = get().profile;
      if (get().pendingPaywall === trigger) set({ pendingPaywall: null });
      if (!pr) return;
      await saveProfile({ ...pr, paywallSeen: { ...(pr.paywallSeen ?? {}), [trigger]: new Date().toISOString() } });
    },
    async startTrial(period = 'anual') {
      const pr = get().profile;
      if (!pr) return;
      if (pr.planState?.trialEndsAt) { get().showToast('O teste grátis já foi usado nesta conta.'); return; }
      const end = new Date(Date.now() + PRICES.trialDays * 86400000).toISOString();
      await saveProfile({ ...pr, planState: { ...(pr.planState ?? {}), plan: pr.planState?.plan ?? 'economica', trialEndsAt: end, source: 'trial', period } });
      reschedule();
    },
    canAddPetNow() {
      const ok = get().pets.length < limitsFor(plan()).maxPets;
      return { ok, paywall: ok ? null : get().paywallFor('segundo_pet') };
    },
    async consumeCardScan() {
      const pr = get().profile;
      if (!pr) return 'limit';
      const month = localMonth();
      const cur = pr.cardScans?.month === month ? pr.cardScans.count : 0;
      if (cur >= limitsFor(plan()).cardScanMonthly) return 'limit';
      await saveProfile({ ...pr, cardScans: { month, count: cur + 1 } });
      return 'ok';
    },
    async setCity(city) {
      const pr = get().profile;
      if (!pr) return;
      await saveProfile({ ...pr, city: city.trim() });
    },
    async setVet(vet) {
      const pr = get().profile;
      if (!pr) return;
      const { vet: _old, ...rest } = pr;
      const phone = vet?.phone.trim() ?? '';
      const name = vet?.name?.trim() ?? '';
      await saveProfile(phone ? { ...rest, vet: { phone, ...(name ? { name } : {}) } } : rest);
    },
    async applyStorePurchase({ isTrial, expiresAt, period }) {
      const pr = get().profile;
      if (!pr) return;
      const st = pr.planState;
      const trialEnd = isTrial && expiresAt ? expiresAt : st?.trialEndsAt;
      const planState: PlanState = {
        plan: 'primeira', source: 'loja',
        ...(expiresAt ? { until: expiresAt } : {}),
        ...(trialEnd ? { trialEndsAt: trialEnd } : {}),
        ...(period ?? st?.period ? { period: period ?? st?.period } : {}),
      };
      await saveProfile({ ...pr, planState });
      reschedule();
    },
    async syncStorePlan(status) {
      const pr = get().profile;
      if (!pr) return;
      const next = syncedStorePlan(pr, status);
      if (!next) return;
      await saveProfile({ ...pr, ...next });
      reschedule();
    },

    // ---------------------------------------------------------------- cadastro: vacinas e parasitas
    setDraftVaccine(id, answer) {
      const d = get().draft;
      set({ draft: { ...d, vaccineAnswers: { ...(d.vaccineAnswers ?? {}), [id]: answer } } });
      const birth = parseBR(d.birth) ?? addDays(today(), -365);
      return nextDoseFromAnswer(answer, id as VaccineId, { species: d.species, birthDate: birth, name: d.name }, today());
    },
    setDraftParasite(kind, last, duration) {
      const d = get().draft;
      set({ draft: { ...d, parasites: { ...(d.parasites ?? {}), [kind]: { last, duration } } } });
      return nextFromDuration(last, duration, today());
    },
    vaccinePlanNow(opts) {
      const p = pet();
      const d = get().draft;
      const t = today();
      if (p && d.editingPetId !== null) return vaccinePlan(p, vaccineAnswersOf(get().data.cares), t, opts);
      if (!p || Object.keys(d.vaccineAnswers ?? {}).length) {
        const birth = parseBR(d.birth) ?? addDays(t, -365);
        return vaccinePlan({ species: d.species, birthDate: birth, name: d.name }, d.vaccineAnswers ?? {}, t, opts);
      }
      return vaccinePlan(p, vaccineAnswersOf(get().data.cares), t, opts);
    },
    async registerVaccineAnswer(id, answer) {
      const p = pet();
      const base = careFor(id);
      const v = vaccineById(id);
      if (!p || !base || !v) return null;
      const t = today();
      const answers = { ...vaccineAnswersOf(get().data.cares), [id]: answer };
      const series = planSeries(vaccinePlan(p, answers, t))[id];
      const hadDose = !!(base.history?.length || base.lastDate);
      const updated = applyVaccineAnswer({ ...base, reminders: [7, 1, 0] }, answer, p, t, series);
      await saveCare(updated);
      const next = nextDoseFromAnswer(answer, v, p, t);
      // dose com data real: carimbo "JÁ APLICADO" + milhas de vacina em dia
      const realDay = (answer.kind === 'data' || answer.kind === 'mes') ? updated.lastDate : null;
      if (realDay && !get().data.stamps.some((st) => st.careId === updated.id && st.date === realDay)) {
        const st = makeCareStamp(updated, realDay, p.name, newId(), 'JÁ APLICADO');
        upsertLocal('stamps', st);
        await persist('stamps', st);
        if (next.status === 'em_dia' && !get().data.ledger.some((e) => e.ref === `vac:${updated.id}:${realDay}`)) await earn('vacina', MILES.vacina, `vac:${updated.id}:${realDay}`);
      }
      let paywall: PaywallTriggerId | null = null;
      if (!hadDose && (answer.kind === 'data' || answer.kind === 'mes' || answer.kind === 'naolembro')) {
        paywall = get().paywallFor('primeira_vacina');
        if (paywall) set({ pendingPaywall: paywall });
      }
      reschedule();
      return { next, paywall };
    },
    async applyVaccinePlan(opts) {
      const p = pet();
      if (!p) return;
      const t = today();
      const answers = vaccineAnswersOf(get().data.cares);
      const plan = vaccinePlan(p, answers, t, opts);
      for (const it of plan.items) {
        if (!it.doses.length) continue;
        const c = careFor(it.vaccine.id);
        if (!c) continue;
        const { series: _s, ...rest } = c;
        await saveCare({ ...rest, nextDate: it.doses[0], active: true, reminders: [7, 1, 0], ...(it.doses.length > 1 ? { series: [...it.doses] } : {}) });
      }
      reschedule();
      get().showToast('Plano colocado na agenda.');
    },
    async setParasiteLast(kind, last, duration) {
      const p = pet();
      const c = careFor(PARASITE_CODE[kind]);
      if (!p || !c) return null;
      const t = today();
      const r = parasiteCare(c, last, duration, t);
      await saveCare(r.care);
      if (r.stampDay) {
        const st = makeCareStamp(r.care, r.stampDay, p.name, newId());
        upsertLocal('stamps', st);
        await persist('stamps', st);
        if (diffDays(r.stampDay, t) <= 7 && !get().data.ledger.some((e) => e.ref === `${r.care.id}:${r.stampDay}`)) await earn('cuidado', r.care.miles, `${r.care.id}:${r.stampDay}`);
      }
      reschedule();
      return r.next;
    },

    // ---------------------------------------------------------------- lembretes e remédios
    async addReminder(input) {
      const p = pet();
      if (!p) return null;
      const t = today();
      const date = input.date ?? input.med?.startDate ?? t;
      const med: MedSchedule | undefined = input.med ? { ...input.med, startDate: input.med.startDate ?? date } : undefined;
      const r: Reminder = {
        id: newId(), type: input.type, title: (input.title?.trim() || med?.name || reminderTitle(input.type)).trim(),
        ...(input.note?.trim() ? { note: input.note.trim() } : {}), date,
        time: med ? med.firstDose : input.time ?? null,
        repeat: med ? 'daily' : input.repeat ?? 'once', ...(med ? { med } : {}), notify: input.notify ?? true, active: true, createdAt: new Date().toISOString(),
      };
      upsertLocal('reminders', r);
      await persist('reminders', r);
      reschedule();
      get().showToast('Lembrete salvo.');
      return r;
    },
    async updateReminder(id, patch) {
      const r = get().data.reminders.find((x) => x.id === id);
      if (!r) return;
      const updated: Reminder = { ...r, ...patch };
      if (updated.med) updated.time = updated.med.firstDose;
      upsertLocal('reminders', updated);
      await persist('reminders', updated);
      reschedule();
    },
    async deleteReminder(id) {
      const p = pet();
      if (!p) return;
      const logs = get().data.doses.filter((d) => d.reminderId === id);
      set((s) => ({ data: { ...s.data, reminders: s.data.reminders.filter((r) => r.id !== id), doses: s.data.doses.filter((d) => d.reminderId !== id) } }));
      try { await b().remove(p.id, 'reminders', id); } catch { /* offline */ }
      for (const l of logs) await b().remove(p.id, 'doses', l.id).catch(() => {});
      reschedule();
    },
    async markDose(reminderId, day, time, status, at) {
      const p = pet();
      const r = get().data.reminders.find((x) => x.id === reminderId);
      if (!p || !r) return null;
      const key = doseKey(reminderId, day, time || '0000');
      const scheduled = atTime(day, time && time !== '0000' ? time : '12:00');
      const givenAt = at ? new Date(at) : new Date();
      const log: DoseLog = {
        id: key, reminderId, day, time: time || '0000',
        status: status === 'skipped' ? 'skipped' : r.type === 'remedio' ? statusForGiven(scheduled, givenAt) : 'given',
        ...(status === 'given' ? { givenAt: givenAt.toISOString() } : {}), loggedAt: new Date().toISOString(),
      };
      const already = get().data.doses.find((d) => d.id === key);
      upsertLocal('doses', log);
      await persist('doses', log);
      if (status === 'given' && !already) {
        haptic('success');
        let m = 0;
        if (r.type === 'remedio') { if (onTime(scheduled, givenAt)) m = await earn('remedio', MILES.remedio, key); }
        else if (r.type === 'passeio') m = await earn('passeio', MILES.passeio, key);
        else m = await earn('rotina', MILES.rotina, key);
        get().showToast(m ? `${r.type === 'remedio' ? 'Dose marcada' : 'Feito'} · +${m} milhas` : r.type === 'remedio' ? 'Dose marcada.' : 'Feito.');
      } else if (status === 'skipped') get().showToast('Dose pulada. Não dê 2 doses juntas.');
      reschedule();
      return log;
    },
    async unmarkDose(reminderId, day, time) {
      const p = pet();
      if (!p) return;
      const key = doseKey(reminderId, day, time || '0000');
      const miles = get().data.ledger.filter((e) => e.ref === key && e.miles > 0);
      set((s) => ({ data: { ...s.data, doses: s.data.doses.filter((d) => d.id !== key), ledger: s.data.ledger.filter((e) => !miles.includes(e)) } }));
      await b().remove(p.id, 'doses', key).catch(() => {});
      for (const e of miles) await b().remove(p.id, 'ledger', e.id).catch(() => {});
      reschedule();
    },
    async applyNightShift(reminderId) {
      const r = get().data.reminders.find((x) => x.id === reminderId);
      if (!r?.med) return false;
      const times = scheduleTimes(r.med);
      const to = suggestShift(times);
      if (!to) return false;
      const delta = shiftMinutes(times, to);
      const med: MedSchedule = r.med.times?.length ? { ...r.med, times: to, firstDose: to[0] } : { ...r.med, firstDose: minToHHMM(hhmmToMin(r.med.firstDose) + delta) };
      await get().updateReminder(reminderId, { med });
      return true;
    },
    async recordWalk(minutes) {
      const p = pet();
      if (!p) return 0;
      const t = today();
      const stamp = Date.now();
      const m = extraWalkEarns(get().data.ledger, t) ? await earn('passeio', MILES.passeio, `${EXTRA_WALK_REF}${stamp}`) : 0;
      const e: DiaryEntry = { id: `walk-${t}-${stamp}`, day: t, topic: 'passeio', kind: 'passeio', uri: '', note: 'Passeio extra registrado.', tags: minutes ? [minutes] : [] };
      upsertLocal('diary', e);
      await persist('diary', e);
      haptic('success');
      get().showToast(m ? `Passeio registrado · +${m} milhas` : 'Passeio registrado no diário.');
      return m;
    },
    async setCareNextDate(careId, day) {
      const care = get().data.cares.find((c) => c.id === careId);
      if (!care) return;
      await saveCare(setNextDate(care, day));
      reschedule();
      get().showToast(`Nova data: ${fmtBR(day)}. Vamos avisar antes.`);
    },
    async markTodayItem(item, opts) {
      const src = item.source;
      if (src.type === 'routine') await get().checkRoutine(src.item, opts?.minutes);
      else await get().markDose(src.reminderId, src.day, src.time, 'given', opts?.at);
    },
    async unmarkTodayItem(item) {
      const src = item.source;
      if (src.type === 'routine') await get().uncheckRoutine(src.item.key);
      else await get().unmarkDose(src.reminderId, src.day, src.time);
    },

    // ---------------------------------------------------------------- milhas, mapa, loja, troca
    async earnMiles(reason, ref) {
      if (!pet()) return 0;
      if (ref && get().data.ledger.some((e) => e.origin === reason && e.ref === ref)) return 0;
      return earn(reason, MILES[reason], ref);
    },
    milesNow() {
      return milesSummary(get().data.ledger, today());
    },
    mapNow() {
      const lifetime = milesTotals(get().data.ledger).total;
      const at = (destinationById(pet()?.at ?? 'rio')?.id ?? 'rio') as DestinationId;
      return { ...mapProgress(lifetime), at };
    },
    async travelTo(dest) {
      const p = pet();
      const d = destinationById(dest);
      if (!p || !d) return 'bloqueado';
      if (milesTotals(get().data.ledger).total < d.min) return 'bloqueado';
      await savePet({ ...p, at: d.id });
      if (!get().data.stamps.some((st) => st.kind === 'viagem' && st.destination === d.id)) {
        const t = today();
        const st: Stamp = { id: newId(), kind: 'viagem', destination: d.id, code: d.stamp.main, top: d.stamp.top, bottom: d.stamp.bottom, main: d.stamp.main, sub: t.slice(0, 4), color: d.stamp.color, shape: d.stamp.shape, rotation: rotationFor(d.id), date: t };
        upsertLocal('stamps', st);
        await persist('stamps', st);
        haptic('success');
        set({ stampFx: { top: st.top, bottom: st.bottom, main: st.main, sub: st.sub, color: st.color, miles: 0 } });
      }
      return 'ok';
    },
    async buyShopItem(itemId) {
      return get().buy(itemId);
    },
    async redeemMonth() {
      const pr = get().profile;
      const p = pet();
      if (!pr || !p) return { ok: false };
      const { balance } = milesTotals(get().data.ledger);
      const check = canRedeemMonth(pr.redemptions, new Date(), balance);
      if (!check.ok) return check;
      const now = new Date();
      const entry: LedgerEntry = { id: newId(), at: now.toISOString(), day: today(), origin: 'resgate', miles: -REDEEM_COST, ref: 'primeira-1-mes' };
      upsertLocal('ledger', entry);
      await persist('ledger', entry);
      const st = pr.planState;
      const from = st?.until && new Date(st.until) > now ? new Date(st.until) : now;
      const until = new Date(from);
      until.setMonth(until.getMonth() + REDEEM_MONTHS);
      await saveProfile({
        ...pr,
        redemptions: [...(pr.redemptions ?? []), { id: newId(), at: now.toISOString(), miles: REDEEM_COST, months: REDEEM_MONTHS, petId: p.id }],
        planState: { ...(st ?? {}), plan: st?.plan ?? (pr.plan === 'economica' ? 'economica' : 'primeira'), until: until.toISOString(), source: 'milhas' },
      });
      haptic('success');
      get().showToast('Pronto! 1 mês de Primeira Classe liberado.');
      reschedule();
      return { ok: true };
    },

    // ---------------------------------------------------------------- notificações
    async handleNotificationAction(e) {
      const d = e.data;
      if (!d) return { route: '/inicio' };
      if (d.kind === 'plano') return { route: '/planos' };
      if (d.petId && d.petId !== get().activePetId && get().pets.some((x) => x.id === d.petId)) await get().setActivePet(d.petId);
      if (d.kind === 'dose') {
        if (e.action === 'dei') { await get().markDose(d.reminderId, d.day, d.time, 'given'); return { petId: d.petId }; }
        if (e.action === 'adiar15') {
          const r = get().data.reminders.find((x) => x.id === d.reminderId);
          const p = get().pets.find((x) => x.id === d.petId);
          await snoozeDose(d, `Remédio ${p ? `${art(p).do} ${p.name}` : ''} · ${d.time}`.replace('  ', ' '), `${r?.med?.name ?? 'Remédio'} (adiado 15 min). Não dê 2 doses juntas.`).catch(() => {});
          return { petId: d.petId };
        }
        return { route: '/inicio', petId: d.petId };
      }
      if (d.kind === 'vacina' || d.kind === 'cuidado') {
        if (e.action === 'ja_tomou') return { route: `/cuidado/${d.careId}?acao=carimbar`, petId: d.petId };
        if (e.action === 'mudar_data') return { route: `/cuidado/${d.careId}?acao=mudar-data`, petId: d.petId };
        return { route: `/cuidado/${d.careId}`, petId: d.petId };
      }
      return { route: '/inicio', petId: d.petId };
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

function reminderTitle(t: ReminderType): string {
  return ({ remedio: 'Remédio', passeio: 'Passeio', banho: 'Banho e tosa', consulta: 'Consulta', comida: 'Comida', outro: 'Lembrete' } as Record<ReminderType, string>)[t];
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
