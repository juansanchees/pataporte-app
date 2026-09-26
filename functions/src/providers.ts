/**
 * Provedores de IA: Gemini (Google) e OpenAI.
 * Os dois recebem o mesmo pedido e devolvem o TEXTO da resposta (JSON), para o index.ts interpretar.
 */

export type Media = { data: string; mime: string };
export interface AiRequest {
  prompt: string;
  /** formato da resposta (padrão Gemini); a OpenAI usa só "responda em JSON" */
  schema?: object;
  image?: Media;
  audio?: Media;
}
export class ProviderError extends Error {
  constructor(public kind: 'config' | 'limit' | 'unavailable' | 'blocked' | 'badinput', msg: string) { super(msg); }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url: string, init: RequestInit, timeoutMs = 45000): Promise<{ status: number; body: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return { status: res.status, body: await res.text() };
  } catch (e) {
    throw new ProviderError('unavailable', `rede/timeout: ${String(e).slice(0, 120)}`);
  } finally {
    clearTimeout(t);
  }
}

// ------------------------------------------------------------------ Gemini
const GEMINI = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
let geminiModels: string[] | null = null;
let geminiWorking: string | null = null;

async function geminiDiscover(key: string): Promise<string[]> {
  if (geminiModels) return geminiModels;
  const fallback = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest'];
  const r = await fetchJson(`${GEMINI}?pageSize=200`, { headers: { 'x-goog-api-key': key } }, 15000).catch(() => null);
  if (r && (r.status === 400 || r.status === 401 || r.status === 403)) throw new ProviderError('config', `Gemini recusou a chave: ${r.body.slice(0, 120)}`);
  let names: string[] = [];
  try { names = (JSON.parse(r?.body ?? '{}').models ?? []).filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent')).map((m: { name: string }) => m.name.replace(/^models\//, '')); } catch { /* usa a lista fixa */ }
  const ver = (n: string) => parseFloat(n.match(/gemini-(\d+(\.\d+)?)/)?.[1] ?? '0');
  const bad = /(image|tts|live|audio|thinking|embedding|robotics|computer)/;
  const flash = names.filter((n) => /^gemini-[\d.]+-flash(-\d{3})?$/.test(n) && !bad.test(n)).sort((x, y) => ver(y) - ver(x));
  const lite = names.filter((n) => /^gemini-[\d.]+-flash-lite(-\d{3})?$/.test(n) && !bad.test(n)).sort((x, y) => ver(y) - ver(x));
  const list = Array.from(new Set([...flash.slice(0, 2), ...(names.includes('gemini-flash-latest') ? ['gemini-flash-latest'] : []), ...lite.slice(0, 1)]));
  geminiModels = list.length ? list : fallback;
  return geminiModels;
}

function thinkingFor(model: string): object | undefined {
  if (/gemini-2\.5-flash/.test(model)) return { thinkingBudget: 0 };
  if (/gemini-(3|flash-latest)/.test(model)) return { thinkingLevel: 'low' };
  return undefined;
}

export async function gemini(key: string, req: AiRequest): Promise<{ text: string; model: string }> {
  const parts: object[] = [];
  if (req.image) parts.push({ inline_data: { mime_type: req.image.mime, data: req.image.data } });
  if (req.audio) parts.push({ inline_data: { mime_type: req.audio.mime, data: req.audio.data } });
  parts.push({ text: req.prompt });
  const found = await geminiDiscover(key);
  const models = geminiWorking ? [geminiWorking, ...found.filter((m) => m !== geminiWorking)] : found;
  let last = new ProviderError('unavailable', 'nenhum modelo respondeu');
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let think = thinkingFor(model);
      const call = () => fetchJson(`${GEMINI}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.4, responseMimeType: 'application/json', ...(req.schema ? { responseSchema: req.schema } : {}), ...(think ? { thinkingConfig: think } : {}) } }),
      });
      let r: { status: number; body: string };
      try {
        r = await call();
        if (r.status === 400 && /thinking/i.test(r.body)) { think = undefined; r = await call(); }
      } catch (e) { last = e as ProviderError; continue; }
      if (r.status === 401 || r.status === 403 || /API_KEY_INVALID/.test(r.body)) throw new ProviderError('config', `Gemini: ${r.body.slice(0, 160)}`);
      if (r.status === 404) { last = new ProviderError('unavailable', `${model} não existe`); if (geminiWorking === model) geminiWorking = null; break; }
      if (r.status === 429) { last = new ProviderError('limit', `${model}: cota`); break; }
      if (r.status >= 500) { last = new ProviderError('unavailable', `${model}: ${r.status}`); await sleep(1000 * (attempt + 1)); continue; }
      if (r.status !== 200) throw new ProviderError('badinput', `Gemini ${r.status}: ${r.body.slice(0, 160)}`);
      const json = JSON.parse(r.body);
      const text: string = (json?.candidates?.[0]?.content?.parts ?? []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? '').join('');
      if (!text) throw new ProviderError('blocked', json?.promptFeedback?.blockReason ?? json?.candidates?.[0]?.finishReason ?? 'vazio');
      geminiWorking = model;
      return { text, model };
    }
  }
  throw last;
}

// ------------------------------------------------------------------ OpenAI
const OPENAI = 'https://api.openai.com/v1';
let openaiModels: { chat: string[]; stt: string[] } | null = null;

async function openaiDiscover(key: string) {
  if (openaiModels) return openaiModels;
  const r = await fetchJson(`${OPENAI}/models`, { headers: { Authorization: `Bearer ${key}` } }, 15000);
  if (r.status === 401 || r.status === 403) throw new ProviderError('config', `OpenAI recusou a chave: ${r.body.slice(0, 120)}`);
  let ids: string[] = [];
  try { ids = (JSON.parse(r.body).data ?? []).map((m: { id: string }) => m.id); } catch { /* lista fixa */ }
  const pref = (list: string[]) => list.filter((m) => !ids.length || ids.includes(m));
  // modelos pequenos (rápidos e baratos) que entendem imagem; o primeiro que a conta tiver
  const chat = pref([process.env.OPENAI_MODEL ?? '', 'gpt-5-mini', 'gpt-4.1-mini', 'gpt-4o-mini'].filter(Boolean));
  const stt = pref(['gpt-4o-mini-transcribe', 'whisper-1']);
  openaiModels = { chat: chat.length ? chat : ['gpt-4o-mini'], stt: stt.length ? stt : ['whisper-1'] };
  return openaiModels;
}

export async function openaiTranscribe(key: string, audio: Media): Promise<string> {
  const { stt } = await openaiDiscover(key);
  const ext = /wav/.test(audio.mime) ? 'wav' : /webm/.test(audio.mime) ? 'webm' : /mp4|m4a/.test(audio.mime) ? 'm4a' : 'aac';
  const form = new FormData();
  form.append('model', stt[0]);
  form.append('language', 'pt');
  form.append('file', new Blob([Buffer.from(audio.data, 'base64')], { type: audio.mime }), `voz.${ext}`);
  const r = await fetchJson(`${OPENAI}/audio/transcriptions`, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
  if (r.status === 401) throw new ProviderError('config', 'OpenAI: chave');
  if (r.status === 429) throw new ProviderError('limit', 'OpenAI: cota/crédito');
  if (r.status >= 500) throw new ProviderError('unavailable', `OpenAI ${r.status}`);
  if (r.status !== 200) throw new ProviderError('badinput', `OpenAI áudio ${r.status}: ${r.body.slice(0, 160)}`);
  return String(JSON.parse(r.body).text ?? '').trim();
}

export async function openai(key: string, req: AiRequest): Promise<{ text: string; model: string }> {
  const { chat } = await openaiDiscover(key);
  const content: object[] = [{ type: 'text', text: req.prompt }];
  if (req.image) content.push({ type: 'image_url', image_url: { url: `data:${req.image.mime};base64,${req.image.data}` } });
  let last = new ProviderError('unavailable', 'nenhum modelo respondeu');
  for (const model of chat) {
    const r = await fetchJson(`${OPENAI}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content }], response_format: { type: 'json_object' } }),
    }).catch((e) => { last = e as ProviderError; return null; });
    if (!r) continue;
    if (r.status === 401) throw new ProviderError('config', 'OpenAI: chave');
    if (r.status === 404 || (r.status === 400 && /model/i.test(r.body))) { last = new ProviderError('unavailable', `${model} indisponível`); continue; }
    if (r.status === 429) { last = new ProviderError('limit', 'OpenAI: cota/crédito'); continue; }
    if (r.status >= 500) { last = new ProviderError('unavailable', `OpenAI ${r.status}`); continue; }
    if (r.status !== 200) throw new ProviderError('badinput', `OpenAI ${r.status}: ${r.body.slice(0, 160)}`);
    const text = String(JSON.parse(r.body).choices?.[0]?.message?.content ?? '');
    if (!text) throw new ProviderError('blocked', 'OpenAI: vazio');
    return { text, model };
  }
  throw last;
}
