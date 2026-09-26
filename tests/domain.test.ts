/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, addRecurrence, diffDays, parseBR, relative } from '../src/domain/dates';
import { careTypesFor, codeFromName, petCode } from '../src/domain/catalog';
import { careStatus, generateItinerary, stampCare } from '../src/domain/itinerary';
import { checkinsFor, earned, levelFor, milesTotals, moodFor, nextLevel, specialsFor, streakFor } from '../src/domain/gamification';
import { accessoriesFor, canAddPet, equip, itemById, itemState, LIMITS, PAID_PLANS, pendingRewards } from '../src/domain/commerce';
import { checkDigit, mrzFor } from '../src/domain/mrz';
import { answerGuide } from '../src/domain/guide';
import type { Care, LedgerEntry, Pet, PetData } from '../src/domain/types';

const T = '2026-09-24';
let n = 0;
const id = () => `id${++n}`;

const pet: Pet = {
  id: 'p1', ownerId: 'u1', guardianIds: ['u1'], name: 'Toby', species: 'dog', breed: 'Golden Retriever', coat: '#C98A54', coatName: 'Dourado',
  details: { manchas: 'Clara', olhos: 'Castanho', orelhas: 'Caídas', pelo: 'Natural', rabo: 'Longo' },
  birthDate: '2021-03-14', sex: 'M', weightKg: 28.4, neutered: 'sim', allergies: 'Frango', conditions: '', meds: '', food: 'Seca',
  mealTimes: ['07:00', '19:00'], passportNumber: 'PTP0048217', coverColor: '#1D4A52', issuedAt: '2026-09-24T12:00:00.000Z',
  owned: [], equipped: [], createdAt: '2026-09-24T12:00:00.000Z',
};

const L = (day: string, origin: LedgerEntry['origin'], miles: number, ref?: string): LedgerEntry => ({ id: id(), at: day + 'T10:00:00Z', day, origin, miles, ref });

test('datas: recorrência mensal respeita fim de mês e anual', () => {
  assert.equal(addRecurrence('2026-01-31', { unit: 'month', every: 1 }), '2026-02-28');
  assert.equal(addRecurrence('2026-09-24', { unit: 'month', every: 3 }), '2026-12-24');
  assert.equal(addRecurrence('2026-09-24', { unit: 'year', every: 1 }), '2027-09-24');
  assert.equal(addRecurrence('2026-09-24', null), null);
  assert.equal(diffDays('2026-09-24', '2026-09-28'), 4);
  assert.equal(relative(T, addDays(T, 1)), 'AMANHÃ');
  assert.equal(relative(T, addDays(T, -2)), 'HÁ 2 DIAS');
  assert.equal(parseBR('14/03/2021'), '2021-03-14');
  assert.equal(parseBR('31/02/2021'), null);
});

test('catálogo: castração some quando já é castrado; códigos de 3 letras', () => {
  assert.ok(!careTypesFor('dog', 'sim').some((c) => c.code === 'CST'));
  assert.ok(careTypesFor('dog', 'nao').some((c) => c.code === 'CST'));
  assert.ok(careTypesFor('cat', 'nao').some((c) => c.code === 'V4F'));
  assert.equal(petCode('Toby'), 'TBY');
  assert.equal(codeFromName('Leishmaniose').length, 3);
});

test('itinerário: respostas viram status certos', () => {
  const types = careTypesFor('dog', 'nao');
  const { cares, stampsFor } = generateItinerary(types, { V10: 'tomei', ARB: 'naosei', APG: 'nao', CST: 'tomei' }, T, id);
  const by = (c: string) => cares.find((x) => x.code === c)!;
  assert.equal(careStatus(by('V10'), T), 'em_dia');
  assert.equal(by('V10').nextDate, '2027-09-24');
  assert.equal(careStatus(by('ARB'), T), 'em_dia'); // não sabe → confirmar em 14 dias
  assert.equal(careStatus(by('APG'), T), 'em_dia'); // ainda não → agendar em 14 dias, sem atraso no 1º dia
  assert.equal(by('APG').nextDate, addDays(T, 14));
  assert.equal(careStatus(by('GIA'), T), 'em_dia'); // sem resposta → sugestão em 30 dias
  assert.equal(careStatus(by('CST'), T), 'carimbado'); // única, já feita
  assert.deepEqual(stampsFor.map((c) => c.code).sort(), ['CST', 'V10']);
});

test('carimbar: avança pela recorrência e tira do atraso', () => {
  const late: Care = { id: 'c', code: 'APG', name: 'Antipulgas', category: 'antiparasitario', recurrence: { unit: 'month', every: 1 }, lastDate: null, nextDate: addDays(T, -2), origin: 'manual', answer: null, place: '', reminders: [1], miles: 10, active: true, createdAt: '' };
  assert.equal(careStatus(late, T), 'atrasado');
  const done = stampCare(late, T);
  assert.equal(done.lastDate, T);
  assert.equal(done.nextDate, '2026-10-24');
  assert.equal(careStatus(done, T), 'em_dia');
});

test('humor do avatar: pior status manda', () => {
  const mk = (next: string): Care => ({ id: id(), code: 'X', name: 'X', category: 'vacina', recurrence: null, lastDate: null, nextDate: next, origin: 'manual', answer: null, place: '', reminders: [], miles: 15, active: true, createdAt: '' });
  assert.equal(moodFor([mk(addDays(T, 20))], T), 'feliz');
  assert.equal(moodFor([mk(addDays(T, 20)), mk(addDays(T, 2))], T), 'neutro');
  assert.equal(moodFor([mk(addDays(T, 2)), mk(addDays(T, -1))], T), 'triste');
});

test('milhas, vistos e Primeira Classe em dobro', () => {
  assert.equal(earned(15, 'economica', 'cuidado'), 15);
  assert.equal(earned(15, 'primeira', 'cuidado'), 30);
  assert.equal(earned(100, 'primeira', 'boas_vindas'), 100);
  const ledger = [L(T, 'boas_vindas', 100), L(T, 'cuidado', 600), L(T, 'dutyfree', -300)];
  const t = milesTotals(ledger);
  assert.deepEqual(t, { total: 700, spent: 300, balance: 400 });
  assert.equal(levelFor(t.total).name, 'Explorador'); // gastar no duty free não baixa o visto
  assert.equal(nextLevel(t.total)?.name, 'Globetrotter');
});

test('sequência: dias seguidos e zera com atraso', () => {
  const ledger = [L(addDays(T, -2), 'peso', 5), L(addDays(T, -1), 'foto', 10), L(T, 'racao', 2)];
  assert.equal(streakFor(ledger, [], T), 3);
  assert.equal(streakFor(ledger.slice(0, 2), [], T), 2); // ainda nada hoje → conta até ontem
  const late: Care = { id: 'c', code: 'APG', name: 'A', category: 'antiparasitario', recurrence: null, lastDate: null, nextDate: addDays(T, -1), origin: 'manual', answer: null, place: '', reminders: [], miles: 10, active: true, createdAt: '' };
  assert.equal(streakFor(ledger, [late], T), 0);
});

test('check-in: 3 missões, ração primeiro, marca feito pelo extrato do dia', () => {
  const data: PetData = { cares: [], stamps: [], ledger: [L(T, 'racao', 2, '07:00')], weights: [], diary: [], chat: [], trips: [] };
  const list = checkinsFor(pet, data, T);
  assert.equal(list.length, 3);
  assert.equal(list[0].kind, 'racao');
  assert.equal(list[0].done, true);
});

test('carimbos especiais desbloqueiam por progresso', () => {
  const data: PetData = { cares: [], stamps: [], ledger: [L(T, 'guia', 10), ...Array.from({ length: 5 }, () => L(T, 'peso', 5))], weights: [], diary: [], chat: [], trips: [] };
  const s = specialsFor(pet, data, T);
  assert.equal(s.find((x) => x.id === 'curioso')!.unlocked, true);
  assert.equal(s.find((x) => x.id === 'pena')!.unlocked, true);
  assert.equal(s.find((x) => x.id === 'paparazzi')!.unlocked, false);
});

test('Duty Free: estados, troca de camada e recompensas de visto', () => {
  const ledger = [L(T, 'boas_vindas', 100), L(T, 'cuidado', 150)];
  assert.equal(itemState(itemById('bandana')!, pet, ledger, 'economica'), 'comprar');
  assert.equal(itemState(itemById('quepe')!, pet, ledger, 'economica'), 'sem_saldo');
  assert.equal(itemState(itemById('coleira')!, pet, ledger, 'economica'), PAID_PLANS ? 'bloqueado_classe' : 'sem_saldo'); // v1 grátis: nada bloqueado por classe
  assert.equal(itemState(itemById('kit')!, pet, ledger, 'primeira'), 'bloqueado_nivel');
  const p2 = { ...pet, owned: ['bandana', 'gravata'], equipped: ['bandana'] };
  assert.deepEqual(equip(p2, 'gravata'), ['gravata']); // mesma camada (pescoço) substitui
  assert.deepEqual(accessoriesFor(['kit']).sort(), ['gravata', 'quepe']);
  assert.deepEqual(pendingRewards(pet, [L(T, 'cuidado', 950)]), ['bandana', 'gravata', 'oculos', 'quepe']);
});

test('classes: limite de passaportes', () => {
  if (PAID_PLANS) {
    assert.equal(canAddPet('economica', 1), false);
    assert.equal(canAddPet('primeira', 5), true);
  } else {
    // v1 grátis: até 5 pets e 30 perguntas por mês para todos
    assert.equal(canAddPet('economica', 4), true);
    assert.equal(canAddPet('economica', 5), false);
    assert.equal(LIMITS.economica.guideMonthly, 30);
  }
});

test('MRZ: 44 caracteres e dígito verificador ICAO', () => {
  assert.equal(checkDigit('L898902C3'), '6'); // exemplo oficial ICAO 9303
  const [a, b] = mrzFor(pet);
  assert.equal(a.length, 44);
  assert.equal(b.length, 44);
  assert.ok(a.startsWith('P<PTPTOBY<<GOLDEN<RETRIEVER'));
  assert.ok(b.startsWith('PTP004821'));
});

test('Guia simulado: classifica urgência', () => {
  assert.equal(answerGuide('Ele comeu chocolate!', 'Toby', false).level, 'vermelho');
  assert.equal(answerGuide('A pata está vermelha', 'Toby', true).level, 'amarelo');
  assert.equal(answerGuide('Com a chuva ele ficou em casa, tudo bem?', 'Toby', false).level, 'verde');
});

import { dayForWhen, historyOf, projected, timeline } from '../src/domain/itinerary';
import { gramsPerMeal, mealTimesFor } from '../src/domain/catalog';
import { tripChecklist, tripSummary } from '../src/domain/travel';
import { chapters, weightTrend } from '../src/domain/diary';
import type { Trip } from '../src/domain/types';

test('carimbar com data: histórico, data antiga não volta o calendário, cronograma', () => {
  const c: Care = { id: 'a', code: 'ARB', name: 'Antirrábica', category: 'vacina', recurrence: { unit: 'year', every: 1 }, lastDate: null, nextDate: T, origin: 'manual', answer: null, place: '', reminders: [1], miles: 15, active: true, createdAt: '' };
  const d1 = stampCare(c, '2026-09-20');
  assert.equal(d1.nextDate, '2027-09-20');
  const d2 = stampCare(d1, '2025-09-10'); // dose antiga registrada depois
  assert.deepEqual(historyOf(d2), ['2025-09-10', '2026-09-20']);
  assert.equal(d2.nextDate, '2027-09-20');
  assert.deepEqual(projected(d2, 3), ['2027-09-20', '2028-09-20', '2029-09-20']);
  const monthly = stampCare({ ...c, id: 'b', recurrence: { unit: 'month', every: 1 } }, T);
  const tl = timeline([monthly], T, 12);
  assert.equal(tl.length, 12);
});

test('requerimento: "quando foi" calcula a próxima dose e o atraso', () => {
  assert.equal(dayForWhen('mais', T), addDays(T, -400));
  const types = careTypesFor('dog', 'sim');
  const { cares } = generateItinerary(types, { ARB: 'tomei', APG: 'tomei' }, T, id, { ARB: 'mais', APG: 'semestre' });
  const arb = cares.find((x) => x.code === 'ARB')!;
  assert.equal(careStatus(arb, T), 'atrasado'); // tomou há mais de 1 ano → reforço atrasado
  assert.equal(careStatus(cares.find((x) => x.code === 'APG')!, T), 'atrasado');
});

test('ração: horários e gramas por refeição', () => {
  assert.deepEqual(mealTimesFor(3), ['07:00', '13:00', '19:00']);
  assert.equal(gramsPerMeal({ gramsPerDay: 300, mealsPerDay: 2, mealTimes: ['07:00', '19:00'] }), 150);
  assert.equal(gramsPerMeal({ gramsPerDay: null, mealsPerDay: 2, mealTimes: [] }), null);
});

test('viagem para a Europa: microchip, sorologia com 3 meses e CVI', () => {
  const trip: Trip = { id: 't', dest: 'ue', country: 'Portugal', date: addDays(T, 60), transport: 'aviao', done: [], createdAt: '' };
  const arb: Care = { id: 'r', code: 'ARB', name: 'Antirrábica', category: 'vacina', recurrence: { unit: 'year', every: 1 }, lastDate: addDays(T, -30), nextDate: addDays(T, 335), origin: 'manual', answer: null, place: '', reminders: [], miles: 15, active: true, createdAt: '' };
  const list = tripChecklist(trip, pet, [arb], T);
  const by = (k: string) => list.find((r) => r.key === k)!;
  assert.equal(by('chip').state, 'atencao'); // sem chip e prazo já passou para 60 dias
  assert.equal(by('sorologia').state, 'atencao'); // 3 meses não cabem em 60 dias
  assert.ok(by('cvi').window);
  const withChip = tripChecklist({ ...trip, date: addDays(T, 200) }, { ...pet, microchip: { has: 'sim' } }, [arb], T);
  assert.equal(withChip.find((r) => r.key === 'chip')!.state, 'ok');
  assert.equal(withChip.find((r) => r.key === 'arb')!.state, 'ok');
  assert.ok(tripSummary(withChip).pending > 0);
});

test('viagem nacional de avião: peso decide cabine', () => {
  const trip: Trip = { id: 't', dest: 'brasil', country: '', date: addDays(T, 20), transport: 'aviao', done: ['atestado'], createdAt: '' };
  const list = tripChecklist(trip, { ...pet, weightKg: 5 }, [], T);
  assert.equal(list.find((r) => r.key === 'cabine')!.state, 'ok');
  assert.equal(list.find((r) => r.key === 'atestado')!.state, 'ok');
  assert.equal(list.find((r) => r.key === 'arb')!.state, 'falta');
});

test('diário de vida: capítulos por mês com resumo', () => {
  const data = {
    diary: [{ id: 'd1', day: T, topic: 'passeio', kind: 'passeio' as const, uri: '', note: 'Praia', tags: ['1 hora'] }],
    stamps: [{ id: 's', kind: 'cuidado' as const, code: 'ARB', top: 'ANTIRRÁBICA', bottom: '', main: 'ARB', sub: T, color: '#000', shape: 'circle' as const, rotation: 0, date: T }],
    weights: [{ id: 'w1', day: '2026-08-01', kg: 28 }, { id: 'w2', day: T, kg: 28.6 }],
  };
  const ch = chapters(data, '2026-08-01', T);
  assert.equal(ch[0].month, '2026-09');
  assert.equal(ch[0].number, 2);
  assert.ok(ch[0].summary.some((x) => x.includes('ganhou')));
  assert.equal(weightTrend(data.weights, T)!.last, 28.6);
});

import { risksFor, tipOfDay } from '../src/domain/breeds';
import { routineItems, routineProgress, routineSections, nextPending, dayRecap } from '../src/domain/routine';

test('saúde da raça: raça, mistura e porte geram riscos com prevenção', () => {
  const golden = risksFor(pet).map((r) => r.id);
  assert.ok(golden.includes('quadril') && golden.includes('otite'));
  const srd = risksFor({ species: 'dog', breed: 'SRD', weightKg: 4, ancestry: ['Pinscher'] }).map((r) => r.id);
  assert.ok(srd.includes('patela') && srd.includes('traqueia'));
  assert.ok(tipOfDay(pet, T)!.tip.length > 5);
  const a = answerGuide('ele está dando uns pulinhos com a pata de trás', 'Mel', false, { species: 'dog', breed: 'Poodle', weightKg: 4 });
  assert.ok(a.text.includes('patela'));
});

test('rotina do dia: refeições + passeios + brincar; completa pelo extrato', () => {
  const p = { ...pet, meds: '', issuedAt: '2026-01-01T12:00:00.000Z' };
  let items = routineItems(p, [], T);
  assert.equal(items.filter((i) => i.kind === 'racao').length, 2);
  assert.ok(items.some((i) => i.kind === 'passeio'));
  const ledger = items.map((i) => (i.kind === 'racao' ? L(T, 'racao', 2, i.time!) : L(T, 'rotina', 2, i.key)));
  items = routineItems(p, ledger, T);
  assert.equal(routineProgress(items).complete, true);
  assert.ok(dayRecap(items).startsWith('Rotina completa'));
  // ao meio-dia a ração das 07:00 já "passou"; o próximo é o passeio das 18:00
  assert.equal(nextPending(routineItems(p, [], T), '12:00')!.key, 'passeio-18:00');
  const sec = routineSections(routineItems(p, [], T), '12:00');
  assert.deepEqual(sec.passed.map((i) => i.key), ['racao-07:00', 'passeio-08:00']);
  assert.equal(sec.next!.key, 'passeio-18:00');
});

test('rotina no 1º dia: o que passou antes de criar o passaporte não aparece', () => {
  const d = new Date(); d.setHours(19, 40, 0, 0);
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const items = routineItems({ ...pet, meds: '', issuedAt: d.toISOString() }, [], local);
  assert.ok(!items.some((i) => i.time && i.time < '19:40'));
  assert.ok(items.some((i) => i.key === 'brincar')); // 20:00 continua
});

test('recorrência anual de 29/02 cai em 28/02', () => {
  assert.equal(addRecurrence('2028-02-29', { unit: 'year', every: 1 }), '2029-02-28');
});
