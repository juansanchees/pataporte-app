import { addDays, diffDays, fmtBR, fromDay } from './dates';
import type { Care, Pet, Trip, TripDest, TripTransport } from './types';

/**
 * "Vou viajar": checklist do que o pet precisa, gerado a partir do destino, da data e do que já está no Pataporte.
 * Baseado nas orientações do MAPA (CVI), da União Europeia e do CDC (EUA) vigentes em 2026.
 * As regras mudam: a tela sempre pede para confirmar com o veterinário, a companhia e o consulado.
 */

export const DESTINATIONS: { k: TripDest; label: string; hint: string }[] = [
  { k: 'brasil', label: 'Dentro do Brasil', hint: 'Carro, ônibus ou avião' },
  { k: 'mercosul', label: 'Argentina, Uruguai ou Paraguai', hint: 'Mercosul' },
  { k: 'ue', label: 'Europa (Portugal, Espanha…)', hint: 'União Europeia' },
  { k: 'eua', label: 'Estados Unidos', hint: 'Regras do CDC' },
  { k: 'outro', label: 'Outro país', hint: 'Checklist geral' },
];

export const TRANSPORTS: { k: TripTransport; label: string }[] = [
  { k: 'carro', label: 'Carro' },
  { k: 'onibus', label: 'Ônibus' },
  { k: 'aviao', label: 'Avião' },
];

export type ReqState = 'ok' | 'falta' | 'atencao' | 'info';

export interface TripReq {
  key: string;
  title: string;
  why: string;
  state: ReqState;
  /** feito à mão pelo tutor (checkbox) */
  manual: boolean;
  /** data limite para fazer */
  deadline?: string;
  /** janela: fazer entre from e to */
  window?: { from: string; to: string };
  /** pode virar lembrete no itinerário */
  reminder?: { name: string; day: string };
}

export const TAPEWORM_COUNTRIES = ['irlanda', 'malta', 'finlandia', 'noruega'];

function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function ageMonths(birth: string, on: string): number {
  const b = fromDay(birth);
  const t = fromDay(on);
  return (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth()) - (t.getDate() < b.getDate() ? 1 : 0);
}

function careValidOn(c: Care | undefined, day: string): boolean {
  if (!c || !c.lastDate) return false;
  return !c.nextDate || c.nextDate > day;
}

export function findCare(cares: Care[], code: string, re: RegExp): Care | undefined {
  return cares.find((c) => c.code === code) ?? cares.find((c) => re.test(norm(c.name)));
}

export function tripChecklist(trip: Trip, pet: Pet, cares: Care[], today: string): TripReq[] {
  const d = trip.date;
  const out: TripReq[] = [];
  const isDog = pet.species === 'dog';
  const arb = findCare(cares, 'ARB', /antirrab|raiva/);
  const vrm = findCare(cares, 'VRM', /vermif/);
  const apg = findCare(cares, 'APG', /pulga|carrapat/);
  const chip = pet.microchip?.has === 'sim';
  const done = (k: string) => trip.done.includes(k);
  const manual = (key: string, title: string, why: string, extra: Partial<TripReq> = {}): TripReq => ({
    key, title, why, manual: true, state: done(key) ? 'ok' : 'falta', ...extra,
  });
  const daysLeft = diffDays(today, d);

  // ------------------------------------------------------------ antirrábica (todos os destinos)
  const arbReq = (minDaysBefore: number): TripReq => {
    const valid = careValidOn(arb, d);
    const first = arb?.lastDate && (arb.history?.length ?? 1) <= 1;
    const tooRecent = arb?.lastDate ? diffDays(arb.lastDate, d) < minDaysBefore : false;
    let state: ReqState = valid ? 'ok' : 'falta';
    let why = `Tem que estar válida no dia da viagem (${fmtBR(d)}).`;
    if (valid && first && tooRecent && minDaysBefore > 0) {
      state = 'atencao';
      why = `Se foi a primeira dose, ela precisa ter pelo menos ${minDaysBefore} dias no dia do embarque.`;
    } else if (arb?.lastDate && !valid) {
      state = 'atencao';
      why = `A dose atual vence em ${fmtBR(arb.nextDate!)}, antes da viagem. Faça o reforço antes de embarcar.`;
    } else if (!arb?.lastDate) {
      why = 'Não há carimbo de antirrábica no Pataporte. Se o pet já tomou, carimbe com a data certa.';
    }
    return { key: 'arb', title: 'Vacina antirrábica em dia', why, state, manual: false, deadline: state === 'ok' ? undefined : addDays(d, -Math.max(minDaysBefore, 7)), reminder: state === 'ok' ? undefined : { name: 'Antirrábica (viagem)', day: addDays(d, -Math.max(minDaysBefore, 7)) } };
  };

  const chipReq = (required: boolean, deadline?: string): TripReq => ({
    key: 'chip',
    title: required ? 'Microchip (padrão ISO)' : 'Microchip (recomendado)',
    why: chip
      ? `Registrado${pet.microchip?.number ? ` · nº ${pet.microchip.number}` : ''}. Leve o comprovante com o número.`
      : required
        ? 'Obrigatório. Tem que ser implantado ANTES da vacina antirrábica, senão a vacina não vale para a viagem.'
        : 'Não é obrigatório, mas ajuda a identificar o pet se se perder na viagem.',
    state: chip ? 'ok' : required ? 'falta' : 'info',
    manual: false,
    deadline: chip ? undefined : deadline,
    reminder: chip || !deadline ? undefined : { name: 'Microchip (viagem)', day: deadline },
  });

  const atestado = (from: number, to: number) => manual('atestado', 'Atestado de saúde do veterinário',
    `Consulta com exame clínico. Faça entre ${fmtBR(addDays(d, -from))} e ${fmtBR(addDays(d, -to))}: antes disso o atestado perde a validade.`,
    { window: { from: addDays(d, -from), to: addDays(d, -to) }, reminder: { name: 'Atestado de saúde (viagem)', day: addDays(d, -from) } });

  const cvi = (from: number, to: number, extra = '') => manual('cvi', 'CVI · Certificado Veterinário Internacional',
    `O veterinário pede pelo gov.br (MAPA) entre ${fmtBR(addDays(d, -from))} e ${fmtBR(addDays(d, -to))}. É o "passaporte oficial" do pet para sair do Brasil.${extra}`,
    { window: { from: addDays(d, -from), to: addDays(d, -to) }, reminder: { name: 'Pedir o CVI (viagem)', day: addDays(d, -from) } });

  const plane = (): TripReq[] => {
    const kg = pet.weightKg;
    const age = ageMonths(pet.birthDate, d);
    const list: TripReq[] = [
      manual('cia', 'Reservar o pet com a companhia aérea', 'As companhias limitam quantos pets vão por voo. Reserve junto com a passagem.', { deadline: addDays(d, -30) }),
      manual('caixa', 'Caixa de transporte no tamanho da companhia', 'Cada companhia tem medidas máximas. Acostume o pet com a caixa alguns dias antes.'),
    ];
    if (kg === null || kg === undefined) {
      list.push({ key: 'cabine', title: 'Cabine ou porão?', why: 'Registre o peso do pet para saber se pode ir na cabine (em geral até 10 kg somando a caixa).', state: 'atencao', manual: false });
    } else {
      list.push(kg <= 7
        ? { key: 'cabine', title: 'Pode ir na cabine', why: `Com ${String(kg).replace('.', ',')} kg deve caber no limite da cabine (em geral até 10 kg somando a caixa). Confirme com a companhia.`, state: 'ok', manual: false }
        : { key: 'cabine', title: 'Provavelmente vai no porão', why: `Com ${String(kg).replace('.', ',')} kg passa do limite da cabine. Consulte o transporte de animais (despacho) da companhia.`, state: 'atencao', manual: false });
    }
    if (age < 6) list.push({ key: 'idade', title: 'Idade mínima da companhia', why: `No dia da viagem terá ${Math.max(age, 0)} meses. Azul e Latam pedem 4 meses; Gol pede 6.`, state: age >= 4 ? 'atencao' : 'falta', manual: false });
    return list;
  };

  // ------------------------------------------------------------ por destino
  if (trip.dest === 'brasil') {
    out.push(arbReq(0));
    out.push(manual('carteira', 'Carteira de vacinação assinada', 'Com nome da vacina, lote, data, carimbo e assinatura do veterinário. Leve o papel original.'));
    if (trip.transport !== 'carro') out.push(atestado(10, 1));
    if (trip.transport === 'aviao') out.push(...plane());
    if (trip.transport === 'onibus') out.push(manual('onibus', 'Regras da empresa de ônibus', 'Cada empresa decide se aceita pet, o tamanho e se precisa de caixa. Ligue antes de comprar a passagem.'));
    if (trip.transport === 'carro') out.push(manual('carro', 'Segurança no carro', 'Use cinto próprio para pet ou caixa presa. Leve água e pare a cada 2 ou 3 horas.'));
  }

  if (trip.dest === 'mercosul') {
    out.push(arbReq(21));
    out.push(chipReq(false));
    const parasites = careValidOn(vrm, d) && careValidOn(apg, d);
    out.push({ key: 'parasitas', title: 'Vermífugo e antipulgas recentes', why: parasites ? 'Em dia na data da viagem. O vet confere o prazo exato ao emitir o atestado.' : 'O vet precisa aplicar ou confirmar antes de emitir os documentos. Carimbe aqui quando fizer.', state: parasites ? 'ok' : 'falta', manual: false });
    out.push(atestado(10, 3));
    out.push(cvi(9, 3, ' Para o Mercosul, só o veterinário cadastrado no gov.br pode pedir.'));
    if (trip.transport === 'aviao') out.push(...plane());
  }

  if (trip.dest === 'ue') {
    const chipBy = addDays(d, -125);
    out.push(chipReq(true, chipBy));
    const arb = arbReq(0);
    arb.why += ' Precisa ter sido aplicada DEPOIS do microchip.';
    if (!chip) { arb.state = 'falta'; arb.deadline = chipBy; }
    out.push(arb);
    const soroBy = addDays(d, -92);
    const late = !done('sorologia') && today > soroBy;
    out.push(manual('sorologia', 'Sorologia antirrábica (titulação)',
      late
        ? `A coleta precisava ter sido até ${fmtBR(soroBy)}. Com essa data não dá mais tempo: a viagem teria que ser a partir de ${fmtBR(addDays(today, 95))}.`
        : `Exame de sangue feito pelo menos 30 dias depois da vacina, em laboratório aprovado pela UE. Resultado mínimo de 0,5 UI/ml. Depois da coleta, é preciso esperar 3 meses para viajar. Coletar até ${fmtBR(soroBy)}.`,
      { deadline: soroBy, state: done('sorologia') ? 'ok' : late ? 'atencao' : 'falta', reminder: { name: 'Sorologia antirrábica (viagem)', day: soroBy } }));
    out.push(atestado(10, 3));
    out.push(cvi(9, 3, ' Vale 10 dias para entrar na União Europeia.'));
    if (isDog && TAPEWORM_COUNTRIES.some((c) => norm(trip.country).includes(c))) {
      out.push(manual('tenia', 'Vermífugo contra tênia (Echinococcus)', `Exigido por ${trip.country}: aplicado pelo vet entre 1 e 5 dias antes da chegada.`, { window: { from: addDays(d, -5), to: addDays(d, -1) } }));
    }
    if (trip.transport === 'aviao') out.push(...plane());
  }

  if (trip.dest === 'eua') {
    if (isDog) {
      const age = ageMonths(pet.birthDate, d);
      out.push({ key: 'idade6', title: 'Ter pelo menos 6 meses', why: `No dia da viagem terá ${Math.max(age, 0)} meses.`, state: age >= 6 ? 'ok' : 'falta', manual: false });
      out.push(chipReq(true, addDays(d, -60)));
      const a = arbReq(0);
      a.why += ' Precisa ter sido aplicada DEPOIS do microchip.';
      out.push(a);
      out.push(manual('sorologia', 'Sorologia antirrábica (laboratório aprovado pelo CDC)', `O Brasil está na lista de alto risco de raiva do CDC. Coleta pelo menos 30 dias depois da vacina e até ${fmtBR(addDays(d, -28))}. Sem ela, o cão fica 28 dias em quarentena na chegada.`, { deadline: addDays(d, -28), reminder: { name: 'Sorologia CDC (viagem)', day: addDays(d, -28) } }));
      out.push(manual('cdcform', 'Certificado de vacina e microchip (formulário do CDC)', `"Certification of Foreign Rabies Vaccination and Microchip": o vet preenche e o MAPA endossa, no máximo 30 dias antes (a partir de ${fmtBR(addDays(d, -30))}).`, { window: { from: addDays(d, -30), to: addDays(d, -1) } }));
      out.push(manual('facility', 'Reserva no centro de cuidados do CDC', 'Cães vacinados fora dos EUA vindos do Brasil precisam chegar num aeroporto com centro registrado no CDC, com reserva feita.', { deadline: addDays(d, -30) }));
      out.push(manual('dogform', 'CDC Dog Import Form (online)', 'Preencha no site do CDC antes de viajar e leve o recibo (impresso ou no celular).', { deadline: addDays(d, -3) }));
      out.push(cvi(5, 2, ' Para cães com destino aos EUA o prazo é menor.'));
    } else {
      out.push(chipReq(false));
      out.push(arbReq(0));
      out.push(manual('estado', 'Regras do estado de destino', 'O CDC não exige vacina antirrábica para gatos, mas vários estados exigem. Confira o estado para onde vai.'));
      out.push(atestado(10, 3));
      out.push(cvi(10, 3));
    }
    if (trip.transport === 'aviao') out.push(...plane());
  }

  if (trip.dest === 'outro') {
    out.push(manual('regras', `Conferir as regras do país${trip.country ? ` (${trip.country})` : ''}`, 'Cada país tem exigências próprias. Consulte a página "Sair do Brasil" do MAPA e o consulado do país.', { deadline: addDays(d, -120) }));
    out.push(chipReq(true, addDays(d, -125)));
    out.push(arbReq(21));
    out.push(manual('sorologia', 'Sorologia antirrábica (se o país pedir)', 'Muitos países exigem, e o resultado pode levar meses para valer. Pergunte cedo ao veterinário.', { deadline: addDays(d, -92) }));
    out.push(atestado(10, 3));
    out.push(cvi(9, 3));
    if (trip.transport === 'aviao') out.push(...plane());
  }

  // prazos vencidos viram atenção
  for (const r of out) {
    if (r.state === 'falta' && r.deadline && r.deadline < today) r.state = 'atencao';
  }
  const order: Record<ReqState, number> = { atencao: 0, falta: 1, info: 2, ok: 3 };
  return out.sort((a, b) => order[a.state] - order[b.state] || (a.deadline ?? a.window?.from ?? '9').localeCompare(b.deadline ?? b.window?.from ?? '9'));
}

export function tripSummary(reqs: TripReq[]) {
  const ok = reqs.filter((r) => r.state === 'ok').length;
  const pending = reqs.filter((r) => r.state === 'falta' || r.state === 'atencao').length;
  return { ok, pending, total: reqs.filter((r) => r.state !== 'info').length };
}

export function destLabel(t: Pick<Trip, 'dest' | 'country'>): string {
  if (t.country.trim()) return t.country.trim();
  return DESTINATIONS.find((x) => x.k === t.dest)?.label ?? 'Viagem';
}
