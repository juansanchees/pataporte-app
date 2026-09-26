import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { addDays, atTime, fromDay, today } from '@/domain/dates';
import type { Care, DoseLog, Pet, Plan, Reminder } from '@/domain/types';
import { can, PAID_PLANS } from '@/domain/commerce';
import { dosesBetween } from '@/domain/meds';
import { nextOccurrences } from '@/domain/today';
import { gramsPerMeal } from '@/domain/catalog';
import { routineOf } from '@/domain/routine';
import { art } from '@/domain/words';

/**
 * "Chamadas de embarque": notificações LOCAIS agendadas no próprio celular.
 * Funcionam no Expo Go (Android e iOS). Push remoto exigiria um build de desenvolvimento.
 */
const CHANNEL = 'embarques';

// ------------------------------------------------------------------ v1.1: categorias com botões
/** Categoria do remédio: botões "Dei" e "Adiar 15 min". */
export const CATEGORY_DOSE = 'dose';
/** Categoria da vacina: botões "Já tomou" e "Mudar data". */
export const CATEGORY_VACCINE = 'vacina';
export const ACTION = { dei: 'dei', adiar15: 'adiar15', jaTomou: 'ja_tomou', mudarData: 'mudar_data' } as const;
export type NotificationActionId = (typeof ACTION)[keyof typeof ACTION] | 'abrir';

/** Dados que vão dentro de cada notificação (content.data). */
export type NotificationData =
  | { kind: 'dose'; petId: string; reminderId: string; day: string; time: string }
  | { kind: 'vacina'; petId: string; careId: string; date: string }
  | { kind: 'cuidado'; petId: string; careId: string; date: string }
  | { kind: 'lembrete'; petId: string; reminderId: string; day: string; time: string }
  | { kind: 'rotina' | 'atraso'; petId: string };

export interface NotificationActionEvent {
  /** botão tocado; 'abrir' = tocou na notificação em si */
  action: NotificationActionId;
  data: NotificationData | null;
  /** id da notificação (para não processar 2 vezes) */
  id: string;
}

export type NotificationHandler = (e: NotificationActionEvent) => void | Promise<void>;

const handlers = new Set<NotificationHandler>();
const recent: { e: NotificationActionEvent; at: number }[] = [];
const seenIds = new Set<string>();
let listening = false;

function toEvent(r: Notifications.NotificationResponse): NotificationActionEvent {
  const a = r.actionIdentifier;
  const action: NotificationActionId = a === Notifications.DEFAULT_ACTION_IDENTIFIER ? 'abrir' : (Object.values(ACTION) as string[]).includes(a) ? (a as NotificationActionId) : 'abrir';
  const data = (r.notification.request.content.data ?? null) as NotificationData | null;
  return { action, data: data && typeof data === 'object' && 'kind' in data ? data : null, id: `${r.notification.request.identifier}:${a}` };
}

function dispatch(e: NotificationActionEvent) {
  if (seenIds.has(e.id)) return;
  seenIds.add(e.id);
  recent.push({ e, at: Date.now() });
  while (recent.length > 10) recent.shift();
  handlers.forEach((h) => { Promise.resolve(h(e)).catch(() => {}); });
}

/**
 * Registra quem trata os toques nas notificações. Pode haver vários (a store trata "Dei"/"Adiar";
 * a UI trata "Já tomou"/"Mudar data"/"abrir" navegando). Eventos do último minuto (ex.: app aberto pela
 * notificação) são repassados a quem registrar depois. Retorna a função para cancelar.
 */
export function registerNotificationHandler(h: NotificationHandler): () => void {
  handlers.add(h);
  const now = Date.now();
  for (const r of recent) if (now - r.at < 60_000) Promise.resolve(h(r.e)).catch(() => {});
  return () => { handlers.delete(h); };
}

/** Cria as categorias com botões (chamado por configureNotifications). */
export async function setupNotificationCategories() {
  if (Platform.OS === 'web') return;
  await Notifications.setNotificationCategoryAsync(CATEGORY_DOSE, [
    { identifier: ACTION.dei, buttonTitle: 'Dei', options: { opensAppToForeground: true } },
    { identifier: ACTION.adiar15, buttonTitle: 'Adiar 15 min', options: { opensAppToForeground: false } },
  ]).catch(() => {});
  await Notifications.setNotificationCategoryAsync(CATEGORY_VACCINE, [
    { identifier: ACTION.jaTomou, buttonTitle: 'Já tomou', options: { opensAppToForeground: true } },
    { identifier: ACTION.mudarData, buttonTitle: 'Mudar data', options: { opensAppToForeground: true } },
  ]).catch(() => {});
}

export function configureNotifications() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  setupNotificationCategories().catch(() => {});
  if (!listening) {
    listening = true;
    Notifications.addNotificationResponseReceivedListener((r) => dispatch(toEvent(r)));
    // app aberto a partir de uma notificação (estava fechado)
    try { const last = Notifications.getLastNotificationResponse(); if (last) dispatch(toEvent(last)); } catch { /* sem suporte */ }
  }
}

/** "Adiar 15 min": agenda a mesma dose de novo daqui a `minutes`. */
export async function snoozeDose(data: Extract<NotificationData, { kind: 'dose' }>, title: string, body: string, minutes = 15) {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, categoryIdentifier: CATEGORY_DOSE },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60, channelId: CHANNEL },
  });
}

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Chamadas de embarque',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C8A15A',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  return req.granted;
}

const IOS_LIMIT = 60; // o iPhone guarda no máximo 64 notificações agendadas

export interface ScheduleInput {
  pet: Pet;
  cares: Care[];
  /** v1.1 */
  reminders?: Reminder[];
  doses?: DoseLog[];
}

export interface ScheduleOptions {
  /** classe que vale agora (effectivePlan) — com PAID_PLANS, Econômica não recebe alertas de vacina nem alarmes de dose */
  plan?: Plan;
  paid?: boolean;
}

/** Quantas horas à frente as doses de remédio são agendadas (reagendado a cada abertura/ação). */
const DOSE_HORIZON_H = 72;
/** Dias antes da vacina (7 dias, 1 dia e no dia) — às `hour` (padrão 9:00). */
export const VACCINE_ALERT_DAYS = [7, 1, 0];

/**
 * Apaga tudo e agenda de novo para TODOS os pets.
 * Prioridade dentro do limite do iPhone: doses de remédio (72 h) → diários (comida, passeio, brincar, lembretes diários)
 * → datas (vacinas 7/1/0 dias, vermífugo/antipulgas, lembretes com data) e 1 aviso de atraso por pet.
 */
export async function rescheduleAll(pets: ScheduleInput[], hour: number, enabled: boolean, opts: ScheduleOptions = {}) {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return;
  const ok = await ensurePermission();
  if (!ok) return;

  const paid = opts.paid ?? PAID_PLANS;
  const plan = opts.plan ?? 'primeira';
  const vaccineAlerts = can(plan, 'vaccineReminders', paid);
  const medAlarms = can(plan, 'medAlarms', paid);

  const now = Date.now();
  const t = today();
  let budget = IOS_LIMIT;
  type Job = { at: Date; title: string; body: string; data?: NotificationData; category?: string };
  const schedule = async (j: Job) => {
    if (budget <= 0) return;
    budget--;
    await Notifications.scheduleNotificationAsync({
      content: { title: j.title, body: j.body, ...(j.data ? { data: j.data } : {}), ...(j.category ? { categoryIdentifier: j.category } : {}) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: j.at, channelId: CHANNEL },
    });
  };

  // 0) doses de remédio (alarme de cada dose)
  if (medAlarms) {
    const doseJobs: Job[] = [];
    for (const { pet, reminders = [], doses = [] } of pets) {
      const logged = new Set(doses.map((d) => d.id));
      for (const r of reminders) {
        if (!r.active || !r.notify || r.type !== 'remedio' || !r.med) continue;
        for (const d of dosesBetween(r.med, r.id, new Date(now + 30_000), new Date(now + DOSE_HORIZON_H * 3600_000))) {
          if (logged.has(d.key)) continue;
          doseJobs.push({
            at: d.at, title: `Remédio ${art(pet).do} ${pet.name} · ${d.time}`, body: `${r.med.name}${r.med.dose ? ` · ${r.med.dose}` : ''}. Não dê 2 doses juntas.`,
            data: { kind: 'dose', petId: pet.id, reminderId: r.id, day: d.day, time: d.time }, category: CATEGORY_DOSE,
          });
        }
      }
    }
    doseJobs.sort((a, b) => a.at.getTime() - b.at.getTime());
    for (const j of doseJobs.slice(0, Math.floor(IOS_LIMIT / 2))) await schedule(j);
  }

  // 1) diários
  for (const { pet, reminders = [] } of pets) {
    const r = routineOf(pet);
    const g = gramsPerMeal(pet);
    const daily: [string, string, string][] = [
      ...pet.mealTimes.slice(0, 4).map((time) => [time, `Hora da comida · ${pet.name}`, g ? `Sirva ${g} g. Depois marque no app.` : 'Depois marque no app.'] as [string, string, string]),
      ...r.walkTimes.slice(0, 3).map((time) => [time, `Hora do passeio · ${pet.name}`, 'Bora passear? Marque no app quando voltar.'] as [string, string, string]),
      ...(r.playTime ? [[r.playTime, `Hora de brincar · ${pet.name}`, `15 minutinhos de brincadeira fazem o dia ${art(pet).do} ${pet.name}.`] as [string, string, string]] : []),
      ...reminders.filter((x) => x.active && x.notify && x.type !== 'remedio' && x.repeat === 'daily' && x.time && x.date <= t)
        .map((x) => [x.time!, `${x.title} · ${pet.name}`, x.note || 'Depois marque no app.'] as [string, string, string]),
    ];
    for (const [time, title, body] of daily) {
      if (budget <= 0) break;
      const [h, m] = time.split(':').map(Number);
      await Notifications.scheduleNotificationAsync({ content: { title, body, data: { kind: 'rotina', petId: pet.id } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: m, channelId: CHANNEL } });
      budget--;
    }
  }

  // 2) datas (lembretes antes de vencer + 1 aviso de atraso por pet)
  const jobs: Job[] = [];
  const nextAt = () => { const d = new Date(); d.setHours(hour, 0, 0, 0); if (d.getTime() <= now + 60_000) d.setDate(d.getDate() + 1); return d; };
  const allowed = (c: Care) => (c.category === 'vacina' ? vaccineAlerts : c.category === 'vermifugo' || c.category === 'antiparasitario' ? medAlarms : true);
  for (const { pet, cares, reminders = [] } of pets) {
    const late = cares.filter((c) => c.active && c.nextDate && c.nextDate < t && allowed(c));
    if (late.length) {
      jobs.push({ at: nextAt(), title: `${pet.name} está esperando`, body: late.length === 1 ? `${late[0].name} está em atraso. Quando fizer, marque no app.` : `${late.length} cuidados em atraso. Abra o app para ver.`, data: { kind: 'atraso', petId: pet.id } });
    }
    for (const c of cares) {
      if (!c.active || !c.nextDate || c.nextDate < t || !allowed(c)) continue;
      const isVaccine = c.category === 'vacina';
      const days = isVaccine ? VACCINE_ALERT_DAYS : c.reminders;
      for (const before of days) {
        const at = fromDay(addDays(c.nextDate, -before));
        at.setHours(hour, 0, 0, 0);
        if (at.getTime() <= now) continue;
        const br = c.nextDate.split('-').reverse().join('/');
        jobs.push({
          at,
          title: isVaccine ? `Vacina ${art(pet).do} ${pet.name}` : `Lembrete · ${pet.name}`,
          body: before === 0 ? `${c.name} é hoje. Depois de fazer, marque no app.` : `${c.name} ${isVaccine ? 'está marcada' : 'vence'} ${before === 1 ? 'amanhã' : `em ${before} dias`} (${br}). Já agende.`,
          data: { kind: isVaccine ? 'vacina' : 'cuidado', petId: pet.id, careId: c.id, date: c.nextDate },
          ...(isVaccine ? { category: CATEGORY_VACCINE } : {}),
        });
      }
    }
    // lembretes com data (consulta, banho…): no horário, ou às `hour` se não tiver horário
    for (const r of reminders) {
      if (!r.active || !r.notify || r.type === 'remedio' || r.repeat === 'daily') continue;
      for (const d of nextOccurrences(r, t, 2)) {
        const at = atTime(d, r.time ?? `${String(hour).padStart(2, '0')}:00`);
        if (at.getTime() <= now) continue;
        jobs.push({ at, title: `${r.title} · ${pet.name}`, body: r.note || 'Depois marque no app.', data: { kind: 'lembrete', petId: pet.id, reminderId: r.id, day: d, time: r.time ?? '' } });
      }
    }
  }
  jobs.sort((a, b) => a.at.getTime() - b.at.getTime());
  for (const j of jobs) { if (budget <= 0) break; await schedule(j); }
}
