import type { Pet, UrgencyLevel } from './types';
import { risksFor } from './breeds';
import { art } from './words';

/**
 * Guia de bordo — VERSÃO SIMULADA.
 * Respostas por regras simples, só para testar o fluxo. Para usar uma IA de verdade, troque
 * `answerGuide` por uma chamada ao seu servidor (ex.: Firebase Cloud Function que fala com um LLM),
 * nunca com a chave da IA dentro do app.
 */
export interface GuideAnswer { level: UrgencyLevel; action: string; text: string }

const RED = ['convuls', 'desmai', 'nao respira', 'não respira', 'sangra muito', 'sangue', 'envenen', 'veneno', 'chocolate', 'atropel', 'engasg', 'barriga inchada', 'nao urina', 'não urina', 'uva', 'xilitol'];
const YELLOW = ['vomit', 'vômit', 'diarr', 'cocei', 'vermelh', 'ferid', 'manc', 'tosse', 'espirr', 'pata', 'olho', 'orelha', 'nao come', 'não come', 'apetite', 'queda de pelo', 'caroço', 'caroco', 'pulga', 'carrapato'];

function norm(s: string) {
  return ' ' + s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ') + ' ';
}

/** Matches a keyword at the start of a word (so "uva" does not match "chuva"). */
function hit(q: string, key: string): boolean {
  return q.includes(' ' + key);
}

export function answerGuide(question: string, petName: string, hasPhoto: boolean, pet?: Pick<Pet, 'species' | 'breed' | 'weightKg' | 'ancestry' | 'size'> & { sex?: 'M' | 'F' }): GuideAnswer {
  const a = art(pet);
  const q = norm(question);
  const photo = hasPhoto ? 'Recebi a foto. ' : '';
  if (RED.some((k) => hit(q, k))) {
    return {
      level: 'vermelho',
      action: 'VETERINÁRIO AGORA',
      text: `${photo}Isso pode ser uma emergência. Leve ${a.o} ${petName} a um veterinário imediatamente ou ligue para uma clínica 24h. Não dê remédios humanos nem tente induzir vômito sem orientação.`,
    };
  }
  const plain = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const risk = pet ? risksFor(pet).find((r) => r.keys.some((k) => plain.includes(' ' + k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) : undefined;
  if (risk) {
    const symptom = YELLOW.some((k) => hit(q, k));
    return {
      level: symptom ? 'amarelo' : 'verde',
      action: symptom ? 'MARCAR CONSULTA' : 'DICA DE PREVENÇÃO',
      text: `${photo}${risk.title} é um ponto de atenção para ${a.o} ${petName}. ${risk.what} Para prevenir: ${risk.prevent.slice(0, 3).join('; ').toLowerCase()}. Procure o veterinário se notar: ${risk.signs.join('; ').toLowerCase()}.`,
    };
  }
  if (YELLOW.some((k) => hit(q, k))) {
    return {
      level: 'amarelo',
      action: 'OBSERVAR 48 HORAS',
      text: `${photo}Parece algo que dá para observar em casa por enquanto. Mantenha ${a.o} ${petName} confortável, com água à vontade, e anote no diário como está. Se piorar, aparecer sangue, febre, apatia ou durar mais de 48 horas, procure o veterinário.`,
    };
  }
  return {
    level: 'verde',
    action: 'SEGUIR OBSERVANDO',
    text: `${photo}Pelo que você descreveu, não parece urgente. Continue com a rotina ${a.do} ${petName} e, se surgir qualquer sinal diferente (apatia, vômito, falta de apetite), me conte ou fale com o veterinário.`,
  };
}

export const GUIDE_DISCLAIMER = 'Orientação geral. Não substitui o veterinário.';
