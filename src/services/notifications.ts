import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { addDays, fromDay, today } from '@/domain/dates';
import type { Care, Pet } from '@/domain/types';
import { gramsPerMeal } from '@/domain/catalog';
import { routineOf } from '@/domain/routine';
import { art } from '@/domain/words';

/**
 * "Chamadas de embarque": notificações LOCAIS agendadas no próprio celular.
 * Funcionam no Expo Go (Android e iOS). Push remoto exigiria um build de desenvolvimento.
 */
const CHANNEL = 'embarques';

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

/**
 * Apaga tudo e agenda de novo para TODOS os pets.
 * Ordem de prioridade dentro do limite: lembretes diários (comida, passeio, brincar) e depois as datas das vacinas.
 * Cuidado em atraso gera UM aviso por pet, no horário escolhido (não um por reprogramação).
 */
export async function rescheduleAll(pets: { pet: Pet; cares: Care[] }[], hour: number, enabled: boolean) {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return;
  const ok = await ensurePermission();
  if (!ok) return;

  const now = Date.now();
  const t = today();
  let budget = IOS_LIMIT;

  // 1) diários
  for (const { pet } of pets) {
    const r = routineOf(pet);
    const g = gramsPerMeal(pet);
    const daily: [string, string, string][] = [
      ...pet.mealTimes.slice(0, 4).map((time) => [time, `Hora da comida · ${pet.name}`, g ? `Sirva ${g} g. Depois marque no app.` : 'Depois marque no app.'] as [string, string, string]),
      ...r.walkTimes.slice(0, 3).map((time) => [time, `Hora do passeio · ${pet.name}`, 'Bora passear? Marque no app quando voltar.'] as [string, string, string]),
      ...(r.playTime ? [[r.playTime, `Hora de brincar · ${pet.name}`, `15 minutinhos de brincadeira fazem o dia ${art(pet).do} ${pet.name}.`] as [string, string, string]] : []),
    ];
    for (const [time, title, body] of daily) {
      if (budget <= 0) break;
      const [h, m] = time.split(':').map(Number);
      await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: m, channelId: CHANNEL } });
      budget--;
    }
  }

  // 2) datas (lembretes antes de vencer + 1 aviso de atraso por pet)
  type Job = { at: Date; title: string; body: string };
  const jobs: Job[] = [];
  const nextAt = () => { const d = new Date(); d.setHours(hour, 0, 0, 0); if (d.getTime() <= now + 60_000) d.setDate(d.getDate() + 1); return d; };
  for (const { pet, cares } of pets) {
    const late = cares.filter((c) => c.active && c.nextDate && c.nextDate < t);
    if (late.length) {
      jobs.push({ at: nextAt(), title: `${pet.name} está esperando`, body: late.length === 1 ? `${late[0].name} está em atraso. Quando fizer, marque no app.` : `${late.length} cuidados em atraso. Abra o app para ver.` });
    }
    for (const c of cares) {
      if (!c.active || !c.nextDate || c.nextDate < t) continue;
      for (const before of c.reminders) {
        const at = fromDay(addDays(c.nextDate, -before));
        at.setHours(hour, 0, 0, 0);
        if (at.getTime() <= now) continue;
        jobs.push({
          at,
          title: `Lembrete · ${pet.name}`,
          body: before === 0 ? `${c.name} é hoje. Depois de fazer, marque no app.` : `${c.name} vence em ${before} ${before === 1 ? 'dia' : 'dias'} (${c.nextDate.split('-').reverse().join('/')}). Já agende.`,
        });
      }
    }
  }
  jobs.sort((a, b) => a.at.getTime() - b.at.getTime());
  for (const j of jobs.slice(0, Math.max(0, budget))) {
    await Notifications.scheduleNotificationAsync({
      content: { title: j.title, body: j.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: j.at, channelId: CHANNEL },
    });
  }
}
