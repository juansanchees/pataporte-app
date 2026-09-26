/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, atTime, fmtExtenso, nextSaturday, relativeLong } from '../src/domain/dates';
import { isPuppy, nextDoseFromAnswer, vaccinePlan, vaccinesFor, planSeries } from '../src/domain/vaccines';
import { nextFromDuration, durationMonths, parasiteTimeline } from '../src/domain/parasites';
import { doseStatus, doseTimes, dosesForDay, hasNightDose, suggestShift, summary, statusForGiven, shiftMinutes } from '../src/domain/meds';
import { canRedeemMonth, careStreak, mapProgress, milesSummary, seasonLevel, streakBonusDue, earned, milesFor, extraWalkEarns, EXTRA_WALK_REF } from '../src/domain/gamification';
import { activeTrialEnd, can, effectivePlan, syncedStorePlan, itemById, itemState, limitsFor, paywallTrigger, trialNoticeAt, PAID_PLANS, PLANS, PRICES } from '../src/domain/commerce';
import { agendaByMonth, agoraItem, nextVaccine, progress, todayItems, occursOn, vaccinesSummary } from '../src/domain/today';
import { migrateCare, migratePetData } from '../src/domain/migrate';
import { setNextDate, stampCare } from '../src/domain/itinerary';
import type { Care, DoseLog, LedgerEntry, MedSchedule, Pet, Reminder } from '../src/domain/types';

const T = '2026-09-26'; // sábado
let n = 0;
const id = () => `x${++n}`;
const L = (day: string, origin: LedgerEntry['origin'], miles: number, ref?: string): LedgerEntry => ({ id: id(), at: day + 'T12:00:00Z', day, origin, miles, ref });

const base: Pet = {
  id: 'p', ownerId: 'u', guardianIds: ['u'], name: 'Thor', species: 'dog', breed: 'Spitz Alemão', coat: '#C98A54', coatName: 'Laranja',
  details: { manchas: '', olhos: '', orelhas: '', pelo: '', rabo: '' }, birthDate: '2023-06-01', sex: 'M', weightKg: 4.2, neutered: 'sim',
  allergies: '', conditions: '', meds: '', food: 'Ração', mealTimes: ['07:00', '19:00'], passportNumber: 'X', coverColor: '#1D4A52',
  issuedAt: '2026-01-01T12:00:00.000Z', owned: [], equipped: [], createdAt: '2026-01-01T12:00:00.000Z',
};
const care = (p: Partial<Care>): Care => ({ id: id(), code: 'X', name: 'X', category: 'vacina', recurrence: { unit: 'year', every: 1 }, lastDate: null, nextDate: null, origin: 'manual', answer: null, place: '', reminders: [], miles: 15, active: true, createdAt: '', ...p });

// ------------------------------------------------------------------ vacinas
test('datas: próximo sábado e extenso', () => {
  assert.equal(nextSaturday(T), '2026-10-03');
  assert.equal(nextSaturday('2026-09-30'), '2026-10-03');
  assert.equal(fmtExtenso('2027-03-14'), '14 de março de 2027');
  assert.equal(relativeLong(T, '2026-12-20'), 'daqui a 12 semanas');
});

test('plano de vacinas: cão adulto (Vac-Plano)', () => {
  const plan = vaccinePlan(base, { ARB: { kind: 'data', date: '2026-03-14' }, V10: { kind: 'nunca' }, GRP: { kind: 'naosei' } }, T);
  assert.equal(plan.puppy, false);
  assert.deepEqual(plan.counts, { emDia: 1, faltando: 2, opcional: 1 });
  assert.equal(plan.items.find((i) => i.vaccine.id === 'ARB')!.line, 'Em dia · reforço em março de 2027');
  assert.equal(plan.items.find((i) => i.vaccine.id === 'GIA')!.line, 'Opcional · pergunte ao veterinário');
  assert.deepEqual(plan.steps.map((s) => s.date), ['2026-10-03', '2026-10-24', '2026-11-14']);
  assert.deepEqual(plan.steps.map((s) => s.dateLabel), ['Sáb, 3 de outubro', 'Sáb, 24 de outubro', 'Sáb, 14 de novembro']);
  assert.equal(plan.steps[0].title, 'V10 · 1ª dose');
  assert.equal(plan.steps[1].title, 'V10 · 2ª dose · Gripe canina · 1ª dose');
  assert.equal(plan.steps[2].title, 'Gripe canina · 2ª dose');
  assert.equal(plan.confirmWithVet, true);
  assert.deepEqual(planSeries(plan).V10, ['2026-10-03', '2026-10-24']);
  // sem sábado: começa amanhã
  assert.equal(vaccinePlan(base, { V10: { kind: 'nunca' } }, T, { saturdays: false }).steps[0].date, '2026-09-27');
});

test('plano de vacinas: filhote (Filhote-Plano)', () => {
  const bolt = { ...base, name: 'Bolt', birthDate: '2026-07-15' };
  assert.equal(isPuppy(bolt, T), true);
  const plan = vaccinePlan(bolt, {}, T);
  assert.equal(plan.puppy, true);
  const v10 = plan.items.find((i) => i.vaccine.id === 'V10')!;
  assert.deepEqual(v10.doses, ['2026-10-03', '2026-10-24', '2026-11-14']);
  // antirrábica junto da 3ª dose (e depois de 12 semanas)
  assert.deepEqual(plan.items.find((i) => i.vaccine.id === 'ARB')!.doses, ['2026-11-14']);
  assert.equal(plan.steps[0].title, 'V10 · 1ª dose + Vermífugo');
  assert.ok(plan.steps[2].title.startsWith('V10 · 3ª dose · Antirrábica'));
  assert.deepEqual(plan.chips.slice(0, 2), [{ value: '3 doses', label: 'V10' }, { value: '1 dose', label: 'antirrábica' }]);
  assert.equal(plan.puppyDeworm!.until, '2027-01-15');
  // filhote que já tomou a 1ª dose: continua 21 dias depois
  const cont = vaccinePlan(bolt, { V10: { kind: 'data', date: '2026-09-20' } }, T);
  assert.deepEqual(cont.items.find((i) => i.vaccine.id === 'V10')!.doses, ['2026-10-24', '2026-11-14']);
});

test('plano de vacinas: gato adulto (V4/V5 + antirrábica)', () => {
  const mel = { ...base, name: 'Mel', species: 'cat' as const, sex: 'F' as const };
  assert.deepEqual(vaccinesFor('cat').map((v) => v.id), ['V4F', 'ARB']);
  const plan = vaccinePlan(mel, { V4F: { kind: 'data', date: '2025-01-10' }, ARB: { kind: 'mes', year: 2026, month: 2 } }, T);
  assert.deepEqual(plan.counts, { emDia: 1, faltando: 1, opcional: 0 });
  assert.equal(plan.items[0].line, 'Reforço atrasado · 1 dose');
  assert.equal(plan.steps.length, 1);
  assert.equal(plan.steps[0].title, 'V4 ou V5');
  assert.equal(plan.items[1].nextDate, '2027-02-15');
});

test('nextDoseFromAnswer: cada tipo de resposta', () => {
  const r = (a: Parameters<typeof nextDoseFromAnswer>[0], v: 'V10' | 'ARB' | 'GIA' = 'V10') => nextDoseFromAnswer(a, v, base, T);
  assert.equal(r({ kind: 'data', date: '2026-03-14' }).label, '14 de março de 2027');
  assert.equal(r({ kind: 'mes', year: 2026, month: 3 }).date, '2027-03-15');
  const menos = r({ kind: 'naolembro', within: 'menos1ano' });
  assert.equal(menos.status, 'em_dia');
  assert.equal(menos.label, 'por volta de março de 2027');
  const mais = r({ kind: 'naolembro', within: 'mais1ano' });
  assert.equal(mais.status, 'faltando');
  assert.equal(mais.overdue, true);
  assert.equal(mais.date, '2026-10-03');
  assert.equal(r({ kind: 'nunca' }).label, '3 de outubro de 2026');
  assert.equal(r({ kind: 'naosei' }).date, '2026-10-03');
  assert.equal(r(undefined).status, 'faltando');
  assert.equal(r({ kind: 'data', date: '2024-01-10' }).overdue, true);
  assert.equal(r({ kind: 'nunca' }, 'GIA').label, 'Pergunte ao veterinário');
  // antirrábica de filhote isolada: 1º sábado com 12 semanas
  assert.equal(nextDoseFromAnswer({ kind: 'nunca' }, 'ARB', { ...base, birthDate: '2026-07-15' }, T).date, '2026-10-10');
});

// ------------------------------------------------------------------ vermífugo / antipulgas
test('nextFromDuration: duração, respostas e textos', () => {
  const a = nextFromDuration('2026-09-20', 3, T);
  assert.equal(a.next, '2026-12-20');
  assert.equal(a.label, '20 de dezembro');
  assert.equal(a.relLabel, 'daqui a 12 semanas');
  assert.equal(a.overdue, false);
  assert.equal(nextFromDuration('2026-09-20', 'naosei', T).next, '2026-10-20'); // não sei = 1 mês
  assert.equal(durationMonths('naosei'), 1);
  const never = nextFromDuration({ kind: 'nunca' }, 3, T);
  assert.equal(never.next, T);
  assert.equal(never.overdue, true);
  assert.equal(never.relLabel, 'hoje');
  assert.equal(nextFromDuration({ kind: 'naolembro', within: 'mais1mes' }, 1, T).overdue, true);
  const menos = nextFromDuration({ kind: 'naolembro', within: 'menos1mes' }, 8, T);
  assert.equal(menos.approx, true);
  assert.equal(menos.next, '2027-05-11');
  assert.equal(nextFromDuration({ kind: 'mes', year: 2026, month: 8 }, 1, T).next, T); // venceu 15/09 → hoje
  assert.deepEqual(parasiteTimeline('2026-12-20', 3, 3), ['2026-12-20', '2027-03-20', '2027-06-20']);
});

// ------------------------------------------------------------------ remédios
const med: MedSchedule = { name: 'Antibiótico', everyHours: 8, firstDose: '08:00', days: 7, startDate: T };

test('remédio: horários, madrugada e resumo', () => {
  assert.deepEqual(doseTimes(8, '08:00'), ['08:00', '16:00', '00:00']);
  assert.deepEqual(doseTimes(12, '09:30'), ['09:30', '21:30']);
  assert.equal(hasNightDose(['08:00', '16:00', '00:00']), true);
  assert.equal(hasNightDose(['07:00', '15:00', '23:00']), false);
  assert.deepEqual(suggestShift(['08:00', '16:00', '00:00']), ['07:00', '15:00', '23:00']);
  assert.equal(shiftMinutes(['08:00', '16:00', '00:00'], ['07:00', '15:00', '23:00']), -60);
  assert.equal(suggestShift(doseTimes(6, '06:00')), null); // 6/6h sempre tem madrugada
  assert.equal(suggestShift(['08:00', '20:00']), null); // não precisa
  assert.equal(summary(med), '3 doses por dia · até sábado, 3 de outubro · 21 doses no total');
  assert.equal(summary({ ...med, days: 'continuo', everyHours: 24 }), '1 dose por dia · uso contínuo');
  assert.deepEqual(dosesForDay(med, 'r', T).map((d) => d.time), ['08:00', '16:00']);
  assert.deepEqual(dosesForDay(med, 'r', '2026-09-27').map((d) => d.time), ['00:00', '08:00', '16:00']);
  assert.deepEqual(dosesForDay(med, 'r', '2026-10-03').map((d) => d.time), ['00:00']);
  assert.deepEqual(dosesForDay(med, 'r', '2026-10-04'), []);
});

test('remédio: dose atrasada e próxima', () => {
  const now = atTime(T, '17:00');
  const s = doseStatus(med, 'r', [], now);
  assert.equal(s.state, 'atrasada');
  assert.equal(s.dose!.time, '16:00');
  assert.equal(s.minutesLate, 60);
  assert.equal(s.lateLabel, 'há 1 h');
  assert.equal(s.next!.time, '00:00');
  const log: DoseLog = { id: s.dose!.key, reminderId: 'r', day: T, time: '16:00', status: 'given', givenAt: now.toISOString(), loggedAt: now.toISOString() };
  const s2 = doseStatus(med, 'r', [log], now);
  assert.equal(s2.state, 'proxima');
  assert.equal(s2.dose!.time, '00:00');
  assert.equal(doseStatus(med, 'r', [], atTime(T, '16:10')).state, 'agora');
  assert.equal(doseStatus(med, 'r', [], atTime('2026-10-05', '10:00')).state, 'fim');
  assert.equal(statusForGiven(atTime(T, '16:00'), atTime(T, '18:00')), 'late');
  assert.equal(statusForGiven(atTime(T, '16:00'), atTime(T, '16:30')), 'given');
});

// ------------------------------------------------------------------ Home / Agenda
test('Hoje: rotina + remédio + lembrete, ordem, progresso e AGORA', () => {
  const r: Reminder = { id: 'r', type: 'remedio', title: 'Antibiótico', date: T, repeat: 'daily', med, notify: true, active: true, createdAt: '' };
  const banho: Reminder = { id: 'b', type: 'banho', title: 'Banho e tosa', date: T, time: '10:00', repeat: 'once', notify: true, active: true, createdAt: '' };
  const pet = { ...base, routine: { walkTimes: ['18:00'], playTime: null, water: false, teeth: false, litter: false } };
  const now = atTime(T, '17:00');
  const ledger = [L(T, 'racao', 2, '07:00')];
  const items = todayItems({ data: { ledger, cares: [], reminders: [r, banho], doses: [] } }, pet, now);
  assert.deepEqual(items.map((i) => i.time), ['07:00', '08:00', '10:00', '16:00', '18:00', '19:00']);
  assert.equal(items[0].done, true);
  assert.equal(progress(items).label, '1 de 6');
  const ag = agoraItem(items, now)!;
  assert.equal(ag.item.kind, 'remedio');
  assert.equal(ag.state, 'atrasado');
  assert.equal(ag.item.time, '16:00'); // a dose atrasada mais recente
  assert.ok(ag.badge.startsWith('ATRASADA'));
  assert.equal(ag.action, 'Dar');
  assert.equal(occursOn({ ...banho, repeat: 'weekly' }, addDays(T, 7)), true);
});

test('Próxima vacina e Agenda por mês', () => {
  const cares = [
    care({ name: 'Gripe canina', nextDate: '2026-09-10' }),
    care({ name: 'Vacina V10', nextDate: '2026-10-12' }),
    care({ name: 'Vermífugo', category: 'vermifugo', recurrence: { unit: 'month', every: 3 }, nextDate: '2026-10-20', durationMonths: 3 }),
  ];
  const nv = nextVaccine(cares, '2026-10-01')!;
  assert.equal(nv.name, 'Gripe canina');
  assert.equal(nv.status, 'atrasado');
  const g = agendaByMonth({ data: { cares, ledger: [] } }, base, '2026-10-01', 'tudo', 3);
  assert.equal(g[0].id, 'atrasados');
  assert.equal(g[0].events[0].sub, 'Venceu há 21 dias');
  assert.equal(g[1].title, 'Outubro 2026');
  assert.deepEqual(g[1].events.map((e) => e.statusLabel), ['Este mês', 'Este mês']);
  assert.equal(g[1].events[1].sub, 'Protege 3 meses');
  assert.equal(agendaByMonth({ data: { cares, ledger: [] } }, base, '2026-10-01', 'vacinas', 3).flatMap((x) => x.events).every((e) => e.kind === 'vacina'), true);
});

// ------------------------------------------------------------------ milhas
test('milhas: tabela, dobro, saldo × acumulado × temporada', () => {
  assert.equal(milesFor('vacina', 'economica'), 100);
  assert.equal(milesFor('remedio', 'primeira'), 40);
  assert.equal(earned(-2000, 'primeira', 'resgate'), -2000);
  const ledger = [L('2026-08-10', 'vacina', 1000), L(T, 'passeio', 240), L(T, 'dutyfree', -300)];
  const s = milesSummary(ledger, T);
  assert.deepEqual([s.balance, s.lifetime, s.season], [940, 1240, 240]);
});

test('níveis por milhas da temporada', () => {
  assert.equal(seasonLevel(0).id, 'bronze');
  assert.equal(seasonLevel(499).id, 'bronze');
  assert.equal(seasonLevel(500).id, 'prata');
  assert.equal(seasonLevel(1240).id, 'ouro');
  assert.equal(seasonLevel(1240).toNext, 760);
  assert.equal(seasonLevel(2000).id, 'diamante');
  assert.equal(seasonLevel(2500).next, null);
});

test('sequência: dias seguidos com cuidado e bônus de 7 dias', () => {
  const ledger = Array.from({ length: 7 }, (_, i) => L(addDays(T, -i), 'passeio', 10));
  assert.equal(careStreak(ledger, T), 7);
  assert.equal(careStreak(ledger.slice(1), T), 6); // hoje ainda nada: conta até ontem
  assert.equal(careStreak([...ledger.slice(1), L(T, 'guia', 10)], T), 6); // pergunta à IA não é cuidado
  assert.equal(streakBonusDue(ledger, T), true);
  assert.equal(streakBonusDue([...ledger, L(T, 'sequencia', 50)], T), false);
});

test('mapa: destinos pelo total acumulado (viajar não gasta)', () => {
  const m = mapProgress(1240);
  assert.equal(m.unlockedCount, 3);
  assert.equal(m.next!.id, 'paris');
  assert.equal(m.remaining, 260);
  assert.equal(mapProgress(3000).next, null);
  const pet = { ...base };
  const ledger = [L(T, 'vacina', 1600), L(T, 'dutyfree', -1500)];
  // saldo 100, mas acumulado 1600: Paris liberada, boina só não tem saldo
  assert.equal(itemState(itemById('boina')!, pet, ledger, 'economica'), 'sem_saldo');
  assert.equal(itemState(itemById('bandana_toquio')!, pet, ledger, 'economica'), 'bloqueado_destino');
});

test('troca: 2.000 milhas = 1 mês, máximo 1 vez em 12 meses', () => {
  assert.deepEqual(canRedeemMonth([], '2026-09-26T12:00:00Z', 2000), { ok: true });
  assert.equal(canRedeemMonth([], '2026-09-26T12:00:00Z', 1240).missing, 760);
  const h = [{ at: '2026-01-10T12:00:00.000Z' }];
  assert.equal(canRedeemMonth(h, '2026-09-26T12:00:00Z', 5000).reason, 'limite');
  assert.equal(canRedeemMonth(h, '2027-01-10T12:00:01Z', 5000).ok, true);
});

// ------------------------------------------------------------------ planos e paywall
test('planos: limites da cobrança, efetivo com teste e preços', () => {
  const eco = limitsFor('economica', true);
  assert.equal(eco.maxPets, 1);
  assert.equal(eco.guideMonthly, 3);
  assert.equal(eco.cardScanMonthly, 3);
  assert.equal(eco.photoAi, false);
  assert.equal(can('economica', 'medAlarms', true), false);
  assert.equal(can('primeira', 'medAlarms', true), true);
  assert.equal(limitsFor('primeira', true).guideMonthly, 200);
  if (!PAID_PLANS) assert.equal(can('economica', 'share'), true); // flag desligado: tudo liberado
  assert.equal(effectivePlan({ plan: 'economica', planState: { plan: 'economica', source: 'trial', trialEndsAt: '2026-10-01T00:00:00Z' } }, new Date('2026-09-26T12:00:00Z')), 'primeira');
  assert.equal(effectivePlan({ plan: 'economica', planState: { plan: 'economica', source: 'trial', trialEndsAt: '2026-09-01T00:00:00Z' } }, new Date('2026-09-26T12:00:00Z')), 'economica');
  assert.equal(PRICES.monthly, 27);
  assert.equal(PRICES.yearly, 197);
  assert.ok(!PLANS.some((p) => p.features.some((f) => /dobro/i.test(f))));
});

test('paywall: gatilhos certos e nunca na 1ª Home', () => {
  const s = { plan: 'economica' as const, paid: true };
  assert.equal(paywallTrigger('home', s), null);
  assert.equal(paywallTrigger('primeira_vacina', s), 'primeira_vacina');
  assert.equal(paywallTrigger('primeira_vacina', { ...s, seen: { primeira_vacina: '2026-09-01' } }), null);
  assert.equal(paywallTrigger('ia_4a_pergunta', { ...s, guideUsedThisMonth: 2 }), null);
  assert.equal(paywallTrigger('ia_4a_pergunta', { ...s, guideUsedThisMonth: 3 }), 'ia_4a_pergunta');
  assert.equal(paywallTrigger('ia_foto', s), 'ia_foto');
  assert.equal(paywallTrigger('segundo_pet', { ...s, petCount: 1 }), 'segundo_pet');
  assert.equal(paywallTrigger('segundo_pet', { ...s, petCount: 0 }), null);
  assert.equal(paywallTrigger('compartilhar', s), 'compartilhar');
  assert.equal(paywallTrigger('compartilhar', { ...s, plan: 'primeira' }), null);
  assert.equal(paywallTrigger('ia_foto', { plan: 'economica', paid: false }), null); // flag desligado
});

// ------------------------------------------------------------------ migração
test('migração v1.0: vermífugo 3 meses, antipulgas 1 mês, coleções novas vazias', () => {
  const vrm = migrateCare(care({ code: 'VRM', category: 'vermifugo', recurrence: null }));
  assert.equal(vrm.durationMonths, 3);
  assert.deepEqual(vrm.recurrence, { unit: 'month', every: 3 });
  assert.equal(migrateCare(care({ code: 'APG', category: 'antiparasitario', recurrence: null })).durationMonths, 1);
  assert.equal(migrateCare(care({ code: 'APG', category: 'antiparasitario', recurrence: { unit: 'month', every: 3 } })).durationMonths, 3);
  const d = migratePetData({ cares: [], ledger: [] });
  assert.deepEqual(d.reminders, []);
  assert.deepEqual(d.doses, []);
});

test('série planejada: carimbar a 1ª dose mantém 21 dias até a 2ª', () => {
  const c = care({ code: 'V10', nextDate: '2026-10-03', series: ['2026-10-03', '2026-10-24'] });
  const d1 = stampCare(c, '2026-10-05');
  assert.equal(d1.nextDate, '2026-10-26');
  assert.deepEqual(d1.series, ['2026-10-26']);
  const d2 = stampCare(d1, '2026-10-26');
  assert.equal(d2.nextDate, '2027-10-26');
  assert.equal(d2.series, undefined);
});

// ------------------------------------------------------------------ integração v1.1
test('paywall: gráfico de peso bloqueado só na Econômica', () => {
  assert.equal(paywallTrigger('grafico_peso', { plan: 'economica', paid: true }), 'grafico_peso');
  assert.equal(paywallTrigger('grafico_peso', { plan: 'primeira', paid: true }), null);
  assert.equal(paywallTrigger('grafico_peso', { plan: 'economica', paid: false }), null);
});

test('mudar data: só a próxima dose; série anda junto', () => {
  const c = care({ lastDate: '2026-03-01', nextDate: '2027-03-01' });
  const moved = setNextDate(c, '2027-03-10');
  assert.equal(moved.nextDate, '2027-03-10');
  assert.equal(moved.lastDate, '2026-03-01');
  assert.equal(moved.history, undefined);
  const s = setNextDate(care({ nextDate: '2026-10-03', series: ['2026-10-03', '2026-10-24'] }), '2026-10-10');
  assert.deepEqual(s.series, ['2026-10-10', '2026-10-31']);
  assert.equal(s.nextDate, '2026-10-10');
});

test('passeio extra: milhas até 3 por dia', () => {
  const walks = [1, 2].map((i) => L(T, 'passeio', 10, `${EXTRA_WALK_REF}${i}`));
  assert.equal(extraWalkEarns([...walks, L(T, 'passeio', 10, 'passeio-08:00')], T), true);
  assert.equal(extraWalkEarns([...walks, L(T, 'passeio', 10, `${EXTRA_WALK_REF}3`)], T), false);
  assert.equal(extraWalkEarns([...walks, L('2026-09-25', 'passeio', 10, `${EXTRA_WALK_REF}3`)], T), true);
});

test('teste grátis: aviso 2 dias antes; some se a classe mudar', () => {
  const now = new Date('2026-09-26T12:00:00');
  const end = new Date('2026-10-03T12:00:00').toISOString();
  const at = trialNoticeAt({ plan: 'economica', source: 'trial', trialEndsAt: end }, 9, now)!;
  assert.equal(at.getDate(), 1);
  assert.equal(at.getHours(), 9);
  assert.equal(activeTrialEnd({ plan: 'primeira', source: 'loja', trialEndsAt: end, until: end }, now), end);
  assert.equal(activeTrialEnd({ plan: 'primeira', source: 'loja', trialEndsAt: end, until: '2027-10-03T12:00:00Z' }, now), null);
  assert.equal(trialNoticeAt({ plan: 'primeira', source: 'simulado', trialEndsAt: end }, 9, now), null);
  assert.equal(trialNoticeAt({ plan: 'economica', source: 'trial', trialEndsAt: new Date('2026-09-27T12:00:00').toISOString() }, 9, now), null);
});

// ------------------------------------------------------------------ QA v1.1
test('vacinas da Home: opcional nunca tomada não entra no total', () => {
  const cs = [
    care({ code: 'V10', lastDate: '2026-01-10', nextDate: '2027-01-10' }),
    care({ code: 'ARB', lastDate: '2026-03-15', nextDate: '2027-03-15' }),
    care({ code: 'GRP', nextDate: '2026-10-03' }),
    care({ code: 'GIA', active: false }),
  ];
  assert.equal(vaccinesSummary(cs, T).label, '2 de 3');
});

test('loja (RevenueCat): renovação mantém a Primeira, expiração volta para a Econômica', () => {
  const now = new Date('2026-09-26T12:00:00Z');
  const sub = { plan: 'economica' as const, planState: { plan: 'primeira' as const, source: 'loja' as const, until: '2026-09-20T00:00:00Z', period: 'anual' as const } };
  // venceu no app, mas a loja renovou → nova validade, continua Primeira
  const ren = syncedStorePlan(sub, { active: true, isTrial: false, expiresAt: '2027-09-20T00:00:00Z' }, now)!;
  assert.equal(ren.planState!.until, '2027-09-20T00:00:00Z');
  assert.equal(effectivePlan(ren, now), 'primeira');
  // mesma validade → nada a gravar
  assert.equal(syncedStorePlan(ren, { active: true, isTrial: false, expiresAt: '2027-09-20T00:00:00Z' }, now), null);
  // expirou → Econômica (e teste continua "usado", sem dar acesso)
  const trial = { plan: 'economica' as const, planState: { plan: 'primeira' as const, source: 'loja' as const, until: '2026-10-01T00:00:00Z', trialEndsAt: '2026-10-01T00:00:00Z' } };
  const exp = syncedStorePlan(trial, { active: false, isTrial: false, expiresAt: null }, now)!;
  assert.equal(effectivePlan(exp, now), 'economica');
  assert.ok(exp.planState!.trialEndsAt);
  assert.equal(syncedStorePlan(exp, { active: false, isTrial: false, expiresAt: null }, now), null);
  // teste simulado e milhas não são tocados
  assert.equal(syncedStorePlan({ plan: 'economica', planState: { plan: 'primeira', source: 'milhas', until: '2026-10-20T00:00:00Z' } }, { active: false, isTrial: false, expiresAt: null }, now), null);
  assert.equal(syncedStorePlan({ plan: 'economica', planState: { plan: 'primeira', source: 'trial', trialEndsAt: '2026-10-01T00:00:00Z' } }, { active: false, isTrial: false, expiresAt: null }, now), null);
});
