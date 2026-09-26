import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { confirmAsk } from './confirm';
import { File } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { resolvePhotoUri } from './photos';
import { CAT_BREEDS, DETAIL_OPTIONS, DOG_BREEDS, breedsFor, findBreed } from '@/domain/catalog';
import type { PetDetails, PetSize, Species, UrgencyLevel } from '@/domain/types';
import { CARD_SCHEMA, cardPrompt, guidePrompt, guideSchema, parseAiJson, PHOTO_SCHEMA, photoPrompt, type CardItem, type PhotoLists } from '@/shared/aiPrompts';
import { getApp } from 'firebase/app';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';

let emulated = false;
import { backend } from '@/data';

/**
 * IA do Pataporte.
 * PRODUÇÃO (Firebase ligado): o app chama o SEU servidor (functions/ → "aiTask"), que guarda as chaves no cofre,
 * confere o login, conta o limite do mês e escolhe Gemini ou OpenAI.
 * MODO TESTE (sem Firebase): chama o Gemini direto com a chave do .env (EXPO_PUBLIC_GEMINI_API_KEY).
 */
const KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const MODELS = [process.env.EXPO_PUBLIC_GEMINI_MODEL, 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest'].filter((m): m is string => !!m);
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Usa o servidor quando o app está no Firebase (a não ser que o .env peça o modo direto para testes). */
function serverMode(): boolean {
  return backend().mode === 'firebase' && process.env.EXPO_PUBLIC_AI_DIRECT !== '1';
}

export function aiEnabled(): boolean {
  return serverMode() || KEY.length > 10;
}

const REGION = 'southamerica-east1';
/** Chama o servidor da IA. Traduz os erros do Firebase para os nossos. */
async function callServer<T>(payload: Record<string, unknown>): Promise<T> {
  backend(); // garante o Firebase inicializado
  const fns = getFunctions(getApp(), REGION);
  if (process.env.EXPO_PUBLIC_USE_EMULATORS === '1' && !emulated) { connectFunctionsEmulator(fns, '127.0.0.1', 5001); emulated = true; }
  const fn = httpsCallable<Record<string, unknown>, T>(fns, 'aiTask', { timeout: 75000 });
  try {
    return (await fn(payload)).data;
  } catch (e) {
    const code = String((e as { code?: string })?.code ?? '').replace('functions/', '');
    const msg = (e as Error)?.message ?? '';
    if (code === 'resource-exhausted') throw new AiError('quota', msg);
    if (code === 'unauthenticated') throw new AiError('auth', msg);
    if (code === 'invalid-argument') throw new AiError('badinput', msg);
    if (code === 'failed-precondition' && /blocked/.test(msg)) throw new AiError('blocked', msg);
    if (code === 'not-found') throw new AiError('noserver', msg);
    if (code === 'unavailable' || code === 'deadline-exceeded' || code === 'internal') throw new AiError(/network|fetch/i.test(msg) ? 'network' : 'server', msg);
    throw new AiError('network', msg);
  }
}

export class AiError extends Error {
  constructor(public kind: 'nokey' | 'limit' | 'network' | 'blocked' | 'parse' | 'model' | 'badinput' | 'server' | 'quota' | 'auth' | 'noserver', msg?: string) { super(msg ?? kind); }
}

/** Frase curta em português para mostrar ao tutor. */
export function aiErrorText(e: unknown, withDetail = false): string {
  const k = e instanceof AiError ? e.kind : 'network';
  const detail = withDetail && e instanceof Error && e.message && e.message !== k ? ` (${e.message.slice(0, 140)})` : '';
  return {
    nokey: 'a chave do Gemini não foi aceita — confira o arquivo .env',
    limit: 'a cota grátis do Gemini acabou por agora — tente em alguns minutos',
    network: 'sem conexão com a IA',
    blocked: 'a IA não quis responder essa mensagem',
    parse: 'a IA respondeu num formato inesperado',
    model: 'nenhum modelo do Gemini disponível para essa chave',
    badinput: 'a IA não conseguiu abrir o áudio ou a foto (grave de novo, um pouco mais longo)',
    server: 'a IA está instável agora — tente de novo em instantes',
    quota: 'você usou todas as perguntas deste mês — elas voltam no dia 1º',
    auth: 'sua sessão expirou — saia e entre de novo na conta',
    noserver: 'o servidor da IA ainda não foi publicado',
  }[k] + detail;
}

let workingModel: string | null = null;

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

/** Descobre qual modelo "flash" a chave pode usar (os nomes mudam com o tempo). */
let resolved: string[] | null = null;
async function resolveModels(): Promise<string[]> {
  if (!resolved) resolved = await discoverModels();
  return resolved;
}

async function discoverModels(): Promise<string[]> {
  const fixed = process.env.EXPO_PUBLIC_GEMINI_MODEL;
  if (fixed) return [fixed];
  try {
    const res = await fetch(`${BASE}?pageSize=200`, { headers: { 'x-goog-api-key': KEY } });
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      const body = await res.text();
      throw new AiError('nokey', body.slice(0, 120));
    }
    const json = await res.json();
    const names: string[] = (json?.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: { name: string }) => m.name.replace(/^models\//, ''));
    const ver = (n: string) => parseFloat(n.match(/gemini-(\d+(\.\d+)?)/)?.[1] ?? '0');
    const unstable = (n: string) => /preview|exp/.test(n);
    const bad = /(image|tts|live|audio|thinking|embedding|robotics|computer)/;
    // 1º estáveis "flash" (versão mais nova primeiro), depois o apelido "latest", depois previews e por último os "lite"
    const flash = names.filter((n) => /^gemini-[\d.]+-flash(-\d{3})?$/.test(n) && !bad.test(n)).sort((x, y) => ver(y) - ver(x));
    const prev = names.filter((n) => /^gemini-[\d.]+-flash-/.test(n) && unstable(n) && !/lite/.test(n) && !bad.test(n)).sort((x, y) => ver(y) - ver(x));
    const lite = names.filter((n) => /^gemini-[\d.]+-flash-lite(-\d{3})?$/.test(n) && !bad.test(n)).sort((x, y) => ver(y) - ver(x));
    const list = Array.from(new Set([...flash.slice(0, 2), ...(names.includes('gemini-flash-latest') ? ['gemini-flash-latest'] : []), ...prev.slice(0, 1), ...lite.slice(0, 1), ...(names.includes('gemini-flash-lite-latest') ? ['gemini-flash-lite-latest'] : [])]));
    if (list.length) return list.slice(0, 5);
  } catch (e) {
    if (e instanceof AiError) throw e;
  }
  return MODELS;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pede pouca "reflexão" para responder rápido (cada família de modelo usa um campo). */
function thinkingFor(model: string): object | undefined {
  if (/gemini-2\.5-flash/.test(model)) return { thinkingBudget: 0 };
  if (/gemini-(3|flash-latest)/.test(model)) return { thinkingLevel: 'low' };
  return undefined;
}

async function callModel(model: string, parts: Part[], schema: object | undefined, thinking: boolean): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 40000);
  try {
    const think = thinking ? thinkingFor(model) : undefined;
    return await fetch(`${BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.4, responseMimeType: 'application/json', ...(schema ? { responseSchema: schema } : {}), ...(think ? { thinkingConfig: think } : {}) },
      }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function generate(parts: Part[], schema?: object): Promise<string> {
  if (!aiEnabled()) throw new AiError('nokey');
  const found = await resolveModels();
  const models = workingModel ? [workingModel, ...found.filter((m) => m !== workingModel)] : found;
  let lastErr: AiError = new AiError('model');
  for (const model of models) {
    // até 2 tentativas por modelo em caso de instabilidade (503/500/timeout)
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Response;
      let thinking = true;
      try {
        res = await callModel(model, parts, schema, thinking);
        if (res.status === 400) {
          const body = await res.clone().text();
          if (/thinking/i.test(body)) { thinking = false; res = await callModel(model, parts, schema, thinking); }
        }
      } catch (e) {
        lastErr = new AiError('server', `${model}: ${String(e).slice(0, 80)}`);
        continue; // timeout/rede: tenta de novo
      }
      if (!res.ok) {
        const body = await res.text();
        let msg = body.slice(0, 160);
        try { msg = JSON.parse(body)?.error?.message?.slice(0, 160) ?? msg; } catch { /* texto puro */ }
        if (res.status === 401 || res.status === 403 || /API_KEY|api key/i.test(body)) throw new AiError('nokey', msg);
        if (res.status === 404) { lastErr = new AiError('model', `${model}: ${msg}`); if (workingModel === model) workingModel = null; break; }
        // cota do grátis é por modelo: tenta o próximo
        if (res.status === 429) { lastErr = new AiError('limit', `${model}: ${msg}`); break; }
        if (res.status >= 500) { lastErr = new AiError('server', `${model}: ${msg}`); await sleep(1200 * (attempt + 1)); continue; }
        throw new AiError('badinput', msg);
      }
      const json = await res.json();
      const text: string | undefined = json?.candidates?.[0]?.content?.parts?.filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? '').join('');
      if (!text) throw new AiError('blocked', json?.promptFeedback?.blockReason ?? json?.candidates?.[0]?.finishReason);
      workingModel = model;
      return text;
    }
  }
  throw lastErr;
}

/** Teste rápido da IA (tela de Ajustes). */
export async function testAi(): Promise<string> {
  const t0 = Date.now();
  if (serverMode()) {
    const r = await callServer<{ provider: string; model: string }>({ task: 'ping' });
    return `Tudo certo! Servidor respondeu com ${r.provider} (${r.model}) em ${((Date.now() - t0) / 1000).toFixed(1)} s.`;
  }
  const raw = await generate([{ text: 'Responda só com JSON: {"ok": true}' }]);
  parseJson(raw);
  return `Tudo certo! Modelo ${workingModel} respondeu em ${((Date.now() - t0) / 1000).toFixed(1)} s.`;
}

function parseJson<T>(text: string): T {
  const v = parseAiJson(text);
  if (!v) throw new AiError('parse', text.slice(0, 80));
  return v as T;
}

/** Foto reduzida (1024 px, JPEG) para a IA: envio mais rápido e menos erro. */
export async function imageForAi(uri: string): Promise<{ data: string; mime: string }> {
  try {
    const r = await manipulateAsync(resolvePhotoUri(uri), [{ resize: { width: 1024 } }], { compress: 0.7, format: SaveFormat.JPEG, base64: true });
    if (r.base64) return { data: r.base64.replace(/^data:.*?,/, ''), mime: 'image/jpeg' };
  } catch { /* usa o original */ }
  return readBase64(uri);
}

/** Lê uma foto do aparelho como base64 (para mandar à IA). */
export async function readBase64(uri: string): Promise<{ data: string; mime: string }> {
  const mime = /\.png($|\?)/i.test(uri) ? 'image/png' : 'image/jpeg';
  if (uri.startsWith('data:')) {
    const [head, data] = uri.split(',');
    return { data, mime: head.match(/data:(.*?);/)?.[1] ?? mime };
  }
  uri = resolvePhotoUri(uri);
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    const data = await new Promise<string>((ok, fail) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result).split(',')[1] ?? '');
      r.onerror = fail;
      r.readAsDataURL(blob);
    });
    return { data, mime: blob.type || mime };
  }
  return { data: await new File(uri).base64(), mime };
}

// ------------------------------------------------------------------ foto → avatar
export interface PhotoAnalysis {
  isPet: boolean;
  species: Species;
  breed: string;
  coatName: string;
  coatHex: string;
  details: PetDetails;
  confidence: number; // 0..1
  summary: string;
  size: PetSize | null;
  mixes: string[];
}

const pick = <T extends string>(v: unknown, opts: readonly T[], fallback: T): T => {
  const s = String(v ?? '').toLowerCase();
  return opts.find((o) => o.toLowerCase() === s) ?? opts.find((o) => s.includes(o.toLowerCase())) ?? fallback;
};

export async function analyzePetPhoto(img: { data: string; mime: string }): Promise<PhotoAnalysis> {
  const lists: PhotoLists = {
    dogs: DOG_BREEDS.map((b) => b.name), cats: CAT_BREEDS.map((b) => b.name),
    coats: Array.from(new Set([...DOG_BREEDS, ...CAT_BREEDS].flatMap((b) => b.coats.map((c) => c.name)))),
    ...DETAIL_OPTIONS,
  };
  let raw: Record<string, unknown>;
  if (serverMode()) {
    raw = await callServer<Record<string, unknown>>({ task: 'photo', image: img, lists });
  } else {
    const parts: Part[] = [{ inline_data: { mime_type: img.mime, data: img.data } }, { text: photoPrompt(lists) }];
    try {
      raw = parseJson<Record<string, unknown>>(await generate(parts, PHOTO_SCHEMA));
    } catch (e) {
      if (!(e instanceof AiError) || e.kind !== 'parse') throw e;
      raw = parseJson<Record<string, unknown>>(await generate(parts, PHOTO_SCHEMA)); // 2ª tentativa se veio texto quebrado
    }
  }
  const species: Species = raw.species === 'cat' ? 'cat' : 'dog';
  const breeds = breedsFor(species);
  const breedRaw = String(raw.breed ?? '').trim();
  const matched = findBreed(species, breedRaw);
  const breed = matched?.name ?? (/srd|sem ra|vira|mestiç|mix/i.test(breedRaw) || !breedRaw ? 'SRD' : breedRaw.replace(/\b\w/g, (c) => c.toUpperCase()));
  const coats = (matched ?? breeds[0]).coats;
  const coat = coats.find((c) => c.name.toLowerCase() === String(raw.coatName ?? '').toLowerCase());
  const hex = /^#[0-9a-f]{6}$/i.test(String(raw.coatHex ?? '')) ? String(raw.coatHex) : coat?.hex ?? coats[0].hex;
  return {
    isPet: raw.isPet !== false,
    species,
    breed,
    coatName: coat?.name ?? String(raw.coatName ?? coats[0].name),
    coatHex: hex,
    details: {
      manchas: pick(raw.manchas, DETAIL_OPTIONS.manchas, 'Sem manchas'),
      olhos: pick(raw.olhos, DETAIL_OPTIONS.olhos, 'Castanho'),
      orelhas: pick(raw.orelhas, DETAIL_OPTIONS.orelhas, species === 'cat' ? 'Em pé' : 'Caídas'),
      pelo: pick(raw.pelo, DETAIL_OPTIONS.pelo, 'Natural'),
      rabo: pick(raw.rabo, DETAIL_OPTIONS.rabo, 'Longo'),
    },
    confidence: Math.max(0, Math.min(1, Number(raw.confidence ?? 0.5))),
    size: (['pequeno', 'médio', 'grande'] as const).find((z) => String(raw.size ?? '').toLowerCase().replace('medio', 'médio') === z) ?? null,
    mixes: breed === 'SRD' && Array.isArray(raw.mixes) ? (raw.mixes as unknown[]).map(String).map((m) => findBreed(species, m)?.name).filter((m): m is string => !!m && m !== 'SRD').slice(0, 2) : [],
    summary: String(raw.summary ?? ''),
  };
}

// ------------------------------------------------------------------ foto da carteirinha (§3)
export interface VaccineCardResult { isCard: boolean; items: CardItem[] }

const CARD_KINDS = ['vacina', 'vermifugo', 'antipulga', 'outro'] as const;
const CARD_MATCHED = ['v10', 'v8', 'antirrabica', 'gripe', 'giardia', 'v4', 'v5', 'felv', 'outra'] as const;

/** Lê a foto da carteirinha de vacinação (papel) e devolve os itens encontrados (baixa confiança = "confira a data"). */
export async function readVaccineCard(imageUri: string, species: Species): Promise<VaccineCardResult> {
  if (!(await ensureAiConsent())) throw new AiError('badinput', 'sem consentimento');
  const img = await imageForAi(imageUri);
  let raw: Record<string, unknown>;
  if (serverMode()) {
    raw = await callServer<Record<string, unknown>>({ task: 'card', image: img, species });
  } else {
    const parts: Part[] = [{ inline_data: { mime_type: img.mime, data: img.data } }, { text: cardPrompt(species) }];
    raw = parseJson<Record<string, unknown>>(await generate(parts, CARD_SCHEMA));
  }
  const items: CardItem[] = Array.isArray(raw.items)
    ? (raw.items as unknown[]).map((it) => {
        const o = (it ?? {}) as Record<string, unknown>;
        const date = typeof o.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : null;
        return {
          kind: pick(o.kind, CARD_KINDS, 'outro'),
          name: String(o.name ?? '').slice(0, 60),
          matched: pick(o.matched, CARD_MATCHED, 'outra'),
          date,
          confidence: Math.max(0, Math.min(1, Number(o.confidence ?? 0))),
        };
      })
    : [];
  return { isCard: raw.isCard === true, items };
}

// ------------------------------------------------------------------ guia de bordo
export interface GuideReply { text: string; kind: 'saude' | 'geral'; level: UrgencyLevel; action: string; transcript?: string }

type Media = { data: string; mime: string };

/**
 * Pergunta ao Guia. `question` é o texto digitado; com `audio`, a IA transcreve a fala e responde.
 * `context` traz os dados do pet e o perfil de saúde da raça, para respostas preventivas e personalizadas.
 */
export async function askGuideAI(opts: { question?: string; audio?: Media; img?: Media; context: string; history: { from: 'user' | 'guia'; text: string }[] }): Promise<GuideReply> {
  const { question, audio, img, context, history } = opts;
  let raw: Record<string, unknown>;
  if (serverMode()) {
    raw = await callServer<Record<string, unknown>>({ task: 'guide', question, audio, image: img, context, history: history.slice(-6) });
  } else {
    const parts: Part[] = [];
    if (img) parts.push({ inline_data: { mime_type: img.mime, data: img.data } });
    if (audio) parts.push({ inline_data: { mime_type: audio.mime, data: audio.data } });
    parts.push({ text: guidePrompt({ question, audio: !!audio, img: !!img, context, history }) });
    raw = parseJson<Record<string, unknown>>(await generate(parts, guideSchema(!!audio)));
  }
  const level = (['verde', 'amarelo', 'vermelho'] as const).find((l) => l === raw.level) ?? 'amarelo';
  const text = String(raw.text ?? '').trim();
  if (!text) throw new AiError('parse', 'resposta vazia');
  return {
    text,
    kind: raw.kind === 'saude' || level === 'vermelho' ? 'saude' : 'geral',
    level,
    action: String(raw.action ?? '').toUpperCase().slice(0, 22) || 'OBSERVAR',
    ...(audio ? { transcript: String(raw.transcript ?? '').trim() } : {}),
  };
}

// ------------------------------------------------------------------ consentimento (LGPD)
let consentCache: boolean | null = null;
/** Pede permissão uma vez antes de mandar foto, áudio ou pergunta para a IA. */
export async function ensureAiConsent(): Promise<boolean> {
  if (consentCache) return true;
  const saved = await AsyncStorage.getItem('pp:aiConsent').catch(() => null);
  if (saved === '1') { consentCache = true; return true; }
  const ok = await confirmAsk(
    'Usar a inteligência artificial?',
    'Para responder, a foto, o áudio ou a pergunta vão para a IA do Google (Gemini) ou da OpenAI, junto com um resumo do pet. Seu nome e e-mail não vão. Você pode ler mais em Ajustes → Termos e privacidade.',
    'Aceito',
  );
  if (ok) { consentCache = true; await AsyncStorage.setItem('pp:aiConsent', '1').catch(() => {}); }
  return ok;
}
