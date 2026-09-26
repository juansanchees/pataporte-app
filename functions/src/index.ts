/**
 * Servidor do Pataporte (Firebase Functions).
 *
 * aiTask — única porta de entrada da IA:
 *   • só aceita quem está logado;
 *   • confere o limite do mês de cada pessoa (Guia e leitura de foto);
 *   • guarda as chaves no cofre (Secret Manager): GEMINI_API_KEY e OPENAI_API_KEY;
 *   • usa o provedor principal (AI_PROVIDER no functions/.env: "gemini" ou "openai")
 *     e, se ele falhar, tenta o outro sozinho.
 */
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { guidePrompt, guideSchema, MONTHLY_LIMITS, parseAiJson, PHOTO_SCHEMA, photoPrompt, type PhotoLists } from './shared/aiPrompts';
import { gemini, openai, openaiTranscribe, ProviderError, type AiRequest, type Media } from './providers';

initializeApp();
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

type Provider = 'gemini' | 'openai';
const MAX_B64 = 7_000_000; // ~5 MB de arquivo

function keyOf(p: Provider): string {
  const k = (p === 'gemini' ? GEMINI_API_KEY.value() : OPENAI_API_KEY.value())?.trim() ?? '';
  return k.length > 20 ? k : ''; // "nenhuma" ou vazio = desligado
}

function order(): Provider[] {
  const main: Provider = process.env.AI_PROVIDER === 'openai' ? 'openai' : 'gemini';
  const other: Provider = main === 'gemini' ? 'openai' : 'gemini';
  return [main, other].filter((p) => keyOf(p));
}

function monthNow(): string {
  // mês no horário de Brasília (o limite "volta no dia 1º" para o usuário)
  return new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 7);
}

/** Reserva 1 uso do mês (transação). Devolve uma função que estorna se a IA falhar. */
async function reserve(uid: string, kind: 'guide' | 'photo'): Promise<() => Promise<void>> {
  const db = getFirestore();
  const ref = db.collection('usage').doc(uid);
  const month = monthNow();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists && snap.get('month') === month ? snap.data()! : { month, guide: 0, photo: 0 };
    if ((d[kind] ?? 0) >= MONTHLY_LIMITS[kind]) {
      throw new HttpsError('resource-exhausted', kind === 'guide' ? 'Você usou as perguntas deste mês.' : 'Você usou as leituras de foto deste mês.');
    }
    tx.set(ref, { ...d, month, [kind]: (d[kind] ?? 0) + 1, updatedAt: new Date() });
  });
  return async () => {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists && snap.get('month') === month) tx.update(ref, { [kind]: Math.max(0, (snap.get(kind) ?? 1) - 1) });
    }).catch(() => undefined);
  };
}

function media(v: unknown, what: string, mimes: RegExp): Media | undefined {
  if (v == null) return undefined;
  const m = v as Partial<Media>;
  if (typeof m.data !== 'string' || typeof m.mime !== 'string' || !mimes.test(m.mime)) throw new HttpsError('invalid-argument', `${what} inválido`);
  if (m.data.length > MAX_B64) throw new HttpsError('invalid-argument', `${what} grande demais`);
  return { data: m.data, mime: m.mime };
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Tenta o provedor principal e, se falhar, o reserva. */
async function run(build: (p: Provider) => Promise<AiRequest>): Promise<{ raw: Record<string, unknown>; provider: Provider; model: string }> {
  const providers = order();
  if (!providers.length) throw new HttpsError('failed-precondition', 'Nenhuma chave de IA configurada no servidor.');
  let lastErr: unknown;
  for (const p of providers) {
    try {
      const req = await build(p);
      const r = p === 'gemini' ? await gemini(keyOf(p), req) : await openai(keyOf(p), req);
      const raw = parseAiJson(r.text);
      if (!raw) throw new ProviderError('unavailable', 'resposta fora do formato');
      return { raw, provider: p, model: r.model };
    } catch (e) {
      lastErr = e;
      logger.warn('provedor falhou', { provider: p, kind: (e as ProviderError).kind, msg: String((e as Error).message).slice(0, 200) });
      if (e instanceof HttpsError) throw e;
      if (e instanceof ProviderError && e.kind === 'badinput') break; // o pedido é que está ruim: não adianta trocar
    }
  }
  const k = (lastErr as ProviderError)?.kind;
  if (k === 'blocked') throw new HttpsError('failed-precondition', 'blocked: a IA não quis responder');
  if (k === 'badinput') throw new HttpsError('invalid-argument', 'a IA não conseguiu abrir o arquivo');
  throw new HttpsError('unavailable', 'a IA está instável agora');
}

export const aiTask = onCall(
  {
    region: 'southamerica-east1',
    secrets: [GEMINI_API_KEY, OPENAI_API_KEY],
    memory: '512MiB',
    timeoutSeconds: 70,
    maxInstances: 20,
    // App Check: ligar quando o app nativo tiver o App Check configurado (build EAS)
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === '1',
  },
  async (request: CallableRequest<Record<string, unknown>>) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta para usar a IA.');
    const d = request.data ?? {};
    const task = d.task;

    if (task === 'ping') {
      const providers = order();
      return { provider: providers[0] ?? 'nenhum', model: providers.join(' → ') || '-' };
    }

    if (task === 'photo') {
      const image = media(d.image, 'foto', /^image\//);
      if (!image) throw new HttpsError('invalid-argument', 'foto faltando');
      const l = d.lists as PhotoLists | undefined;
      if (!l || !Array.isArray(l.dogs) || !Array.isArray(l.cats)) throw new HttpsError('invalid-argument', 'listas faltando');
      const refund = await reserve(uid, 'photo');
      try {
        const r = await run(async () => ({ prompt: photoPrompt(l), schema: PHOTO_SCHEMA, image }));
        logger.info('foto', { uid, provider: r.provider, model: r.model });
        return r.raw;
      } catch (e) { await refund(); throw e; }
    }

    if (task === 'guide') {
      const image = media(d.image, 'foto', /^image\//);
      const audio = media(d.audio, 'áudio', /^audio\//);
      const question = str(d.question, 2000);
      if (!question.trim() && !audio && !image) throw new HttpsError('invalid-argument', 'pergunta vazia');
      const context = str(d.context, 6000);
      const history = (Array.isArray(d.history) ? d.history : []).slice(-6).map((m) => ({ from: (m as { from?: string }).from === 'guia' ? 'guia' as const : 'user' as const, text: str((m as { text?: unknown }).text, 800) }));
      const refund = await reserve(uid, 'guide');
      try {
        let transcript: string | undefined;
        const r = await run(async (p) => {
          if (audio && p === 'openai') {
            // OpenAI: transcreve primeiro, depois responde
            transcript = await openaiTranscribe(keyOf('openai'), audio);
            if (!transcript) throw new HttpsError('invalid-argument', 'não deu para ouvir a sua voz');
            return { prompt: guidePrompt({ transcript, img: !!image, context, history }), image };
          }
          return { prompt: guidePrompt({ question, audio: !!audio, img: !!image, context, history }), schema: guideSchema(!!audio), image, audio };
        });
        logger.info('guia', { uid, provider: r.provider, model: r.model });
        return transcript !== undefined && r.provider === 'openai' ? { ...r.raw, transcript } : r.raw;
      } catch (e) { await refund(); throw e; }
    }

    throw new HttpsError('invalid-argument', 'tarefa desconhecida');
  },
);
