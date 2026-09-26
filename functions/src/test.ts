// Testes do servidor sem internet: o fetch é simulado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gemini, openai, ProviderError } from './providers';
import { guidePrompt, parseAiJson } from './shared/aiPrompts';

type Handler = (url: string, init?: RequestInit) => { status: number; body: unknown };
function mockFetch(h: Handler) {
  (globalThis as { fetch: unknown }).fetch = async (url: string, init?: RequestInit) => {
    const r = h(String(url), init);
    return { status: r.status, text: async () => (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)) };
  };
}

test('Gemini: tenta de novo em 503 e responde', async () => {
  let calls = 0;
  mockFetch((url) => {
    if (url.includes('?pageSize')) return { status: 200, body: { models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] } };
    calls++;
    if (calls === 1) return { status: 503, body: 'overloaded' };
    return { status: 200, body: { candidates: [{ content: { parts: [{ text: '{"text":"oi"}' }] } }] } };
  });
  const r = await gemini('k'.repeat(30), { prompt: 'x' });
  assert.equal(parseAiJson(r.text)?.text, 'oi');
  assert.equal(calls, 2);
});

test('Gemini: chave inválida vira erro de configuração', async () => {
  mockFetch(() => ({ status: 403, body: 'API_KEY_INVALID' }));
  await assert.rejects(() => gemini('k'.repeat(30), { prompt: 'x' }), (e: ProviderError) => e.kind === 'config');
});

test('OpenAI: usa o primeiro modelo disponível e manda a foto', async () => {
  let sent: { model?: string; messages?: { content: { type: string }[] }[] } = {};
  mockFetch((url, init) => {
    if (url.endsWith('/models')) return { status: 200, body: { data: [{ id: 'gpt-4o-mini' }, { id: 'whisper-1' }] } };
    sent = JSON.parse(String(init?.body));
    return { status: 200, body: { choices: [{ message: { content: '{"text":"olá"}' } }] } };
  });
  const r = await openai('k'.repeat(30), { prompt: 'x', image: { data: 'AAAA', mime: 'image/jpeg' } });
  assert.equal(r.model, 'gpt-4o-mini');
  assert.equal(sent.messages?.[0].content[1].type, 'image_url');
});

test('prompt do Guia: áudio pede transcrição; texto leva a pergunta', () => {
  assert.match(guidePrompt({ audio: true, context: '', history: [] }), /transcript/);
  assert.match(guidePrompt({ question: 'Pode comer uva?', context: '', history: [] }), /PERGUNTA: Pode comer uva\?/);
});
