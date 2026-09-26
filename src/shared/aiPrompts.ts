/**
 * Instruções (prompts) da IA do Pataporte — usadas pelo servidor (functions/) e pelo modo de teste do app.
 * Este arquivo não pode importar nada do React Native: ele é copiado para o servidor no build.
 */

export interface PhotoLists { dogs: string[]; cats: string[]; coats: string[]; manchas: readonly string[]; olhos: readonly string[]; orelhas: readonly string[]; pelo: readonly string[]; rabo: readonly string[] }

export function photoPrompt(l: PhotoLists): string {
  return `Você é especialista em raças de cães e gatos. Olhe a foto com atenção e identifique o animal.
Observe formato da cabeça e do focinho, orelhas, tamanho, tipo e cor da pelagem, rabo.
Exemplos: pelagem longa e armada, focinho fino, orelhas pequenas em pé e rabo enrolado sobre as costas = "Spitz Alemão" (também chamado Lulu da Pomerânia). Focinho achatado e dobrinhas = raças braquicefálicas (Pug, Bulldog Francês, Shih Tzu, Persa).
Raças de cão aceitas: ${l.dogs.join(', ')}.
Raças de gato aceitas: ${l.cats.join(', ')}.
Se parecer claramente uma raça, use o nome exato da lista. Só use "SRD" se for vira-lata/mistura sem raça clara.
Responda SOMENTE em JSON com os campos:
- isPet: true se houver um cão ou gato na foto
- species: "dog" ou "cat"
- breed: nome exato da lista (ou "SRD")
- coatName: cor do pelo, uma destas: ${l.coats.join(', ')}
- coatHex: cor predominante do pelo (#RRGGBB)
- manchas: ${l.manchas.join(' | ')}
- olhos: ${l.olhos.join(' | ')}
- orelhas: ${l.orelhas.join(' | ')}
- pelo: ${l.pelo.join(' | ')}
- rabo: ${l.rabo.join(' | ')} (se não aparecer, use o típico da raça)
- size: "pequeno", "médio" ou "grande"
- mixes: até 2 raças da lista que ele lembra, SÓ se breed for "SRD"; senão []
- confidence: de 0 a 1, o quanto tem certeza da raça
- summary: uma frase curta e carinhosa em português (ex.: "Um Spitz Alemão branquinho, peludo e de orelhas em pé.")`;
}

/** Formato de resposta (padrão do Gemini). */
export const PHOTO_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isPet: { type: 'BOOLEAN' }, species: { type: 'STRING', enum: ['dog', 'cat'] }, breed: { type: 'STRING' },
    coatName: { type: 'STRING' }, coatHex: { type: 'STRING' },
    manchas: { type: 'STRING' }, olhos: { type: 'STRING' }, orelhas: { type: 'STRING' }, pelo: { type: 'STRING' }, rabo: { type: 'STRING' },
    size: { type: 'STRING', enum: ['pequeno', 'médio', 'grande'] }, mixes: { type: 'ARRAY', items: { type: 'STRING' } },
    confidence: { type: 'NUMBER' }, summary: { type: 'STRING' },
  },
  required: ['isPet', 'species', 'breed', 'coatName', 'coatHex', 'manchas', 'olhos', 'orelhas', 'pelo', 'rabo', 'size', 'mixes', 'confidence', 'summary'],
};

export interface GuideInput {
  question?: string;
  /** a pergunta veio por áudio e a IA precisa transcrever */
  audio?: boolean;
  /** já transcrita por outro serviço (ex.: OpenAI) */
  transcript?: string;
  img?: boolean;
  context: string;
  history: { from: 'user' | 'guia'; text: string }[];
}

export function guidePrompt(o: GuideInput): string {
  const ask = o.audio
    ? 'A pergunta veio por ÁUDIO (anexo). Primeiro transcreva exatamente o que a pessoa falou em "transcript"; depois responda essa pergunta.'
    : `PERGUNTA: ${o.transcript ?? o.question ?? ''}`;
  return `Você é o "Guia", assistente do app Pataporte. Ajuda tutores de cães e gatos no Brasil.

DADOS DO PET (use quando ajudar a responder):
${o.context}

O APP PATAPORTE TEM: carteira de vacinas com lembretes (aba Vacinas), rotina do dia com comida, passeios e água (Início), diário de vida com fotos (aba Diário), controle de peso, checklist de viagem ("Vou viajar"), resumo para o veterinário ("Para o vet"), saúde da raça, milhas e níveis com prêmios para o avatar, e emergência (botão vermelho de coração).

COMO RESPONDER:
1. Responda EXATAMENTE o que foi perguntado, logo na primeira frase. Não mude de assunto.
2. Português do Brasil, simples e carinhoso. No máximo 5 frases curtas (pode usar lista com "•" se ajudar). Chame o pet pelo nome quando fizer sentido.
3. Se a pergunta for sobre o app, explique onde fica e como usar.
4. Se for uma pergunta geral (comida, comportamento, adestramento, brincadeira, viagem, curiosidade), responda de forma prática. Só fale de doenças da raça se a pergunta for sobre saúde.
5. Saúde: diga o que observar e quando procurar o veterinário. Não dê diagnóstico, nome de remédio nem dose.
6. Se não entender a pergunta, peça para explicar melhor em uma frase.

Responda SOMENTE em JSON com os campos${o.audio ? ' "transcript",' : ''} "text", "kind", "level" e "action":
- "kind": "saude" se a pergunta é sobre sintoma, doença, machucado, algo que o pet comeu ou mal-estar; senão "geral".
- "level" (só importa em "saude"): "verde" = observar em casa; "amarelo" = marcar consulta nos próximos dias; "vermelho" = emergência (chocolate, uva, xilitol, veneno, falta de ar, convulsão, sangramento forte, atropelamento, barriga inchada com ânsia, gato sem conseguir fazer xixi, vômitos repetidos).
- "action": rótulo curto em MAIÚSCULAS (ex.: "OBSERVAR", "MARCAR CONSULTA", "IR AO VET AGORA").

CONVERSA ANTERIOR:
${o.history.slice(-6).map((m) => `${m.from === 'user' ? 'Tutor' : 'Guia'}: ${m.text}`).join('\n') || '(nenhuma)'}

${ask}${o.img ? '\nO tutor mandou uma FOTO junto: olhe a foto com atenção e use o que vê na resposta.' : ''}`;
}

export function guideSchema(audio: boolean) {
  return {
    type: 'OBJECT',
    properties: {
      ...(audio ? { transcript: { type: 'STRING' } } : {}),
      text: { type: 'STRING' },
      kind: { type: 'STRING', enum: ['saude', 'geral'] },
      level: { type: 'STRING', enum: ['verde', 'amarelo', 'vermelho'] },
      action: { type: 'STRING' },
    },
    required: [...(audio ? ['transcript'] : []), 'text', 'kind', 'level', 'action'],
  };
}

export type CardItemKind = 'vacina' | 'vermifugo' | 'antipulga' | 'outro';
export type CardMatched = 'v10' | 'v8' | 'antirrabica' | 'gripe' | 'giardia' | 'v4' | 'v5' | 'felv' | 'outra';
export interface CardItem { kind: CardItemKind; name: string; matched: CardMatched; date: string | null; confidence: number }

/** Prompt para ler a foto da carteirinha de vacinação (papel) e extrair os itens (§3 do spec). */
export function cardPrompt(species: 'dog' | 'cat'): string {
  return `Você está olhando a foto de uma carteirinha de vacinação de ${species === 'cat' ? 'gato' : 'cachorro'} (caderneta de papel brasileira), com adesivos/carimbos de vacinas, vermífugos e antipulgas, e datas escritas à mão pelo veterinário.

TAREFA:
1. Primeiro confira se a foto é mesmo de uma carteirinha/caderneta de vacinação (adesivos, carimbos, tabela de vacinas). Se não for, responda isCard: false e items: [].
2. Se for, liste cada item (vacina, vermífugo ou antipulga) que você conseguir identificar, com a data aplicada.

REGRAS PARA LER:
- Marcas comerciais (ex.: Vanguard, Nobivac, Versican, Defensor) NÃO são o que interessa: identifique o TIPO genérico da vacina pelo nome do adesivo/carimbo (ex.: "V10", "V8", "Antirrábica", "Gripe canina", "Giárdia", "V4", "V5"/"Tríplice+FeLV").
- matched deve ser um destes: "v10", "v8", "antirrabica", "gripe", "giardia", "v4", "v5", "felv", ou "outra" se não encaixar em nenhum.
- kind: "vacina" para vacinas, "vermifugo" para vermífugos (verminoses), "antipulga" para antipulgas/carrapaticidas, "outro" para qualquer outro item da carteirinha.
- Datas: leia exatamente como estão escritas (normalmente DD/MM/AA ou DD/MM/AAAA). Ano com 2 dígitos: 00–39 = 20XX, 40–99 = 19XX. Sempre devolva no formato YYYY-MM-DD.
- NUNCA invente uma data. Se a data estiver ilegível, rasurada ou faltando, use date: null.
- confidence de 0 a 1: quanto você tem certeza da leitura (tipo da vacina + data). Use confidence menor que 0.7 sempre que a letra manuscrita estiver difícil de ler, borrada ou ambígua.

Responda SOMENTE em JSON com os campos:
- isCard: true se a foto é de uma carteirinha/caderneta de vacinação
- items: lista de { kind, name (nome como está escrito/impresso na carteirinha), matched, date, confidence }`;
}

/** Formato de resposta (padrão do Gemini) para a leitura da carteirinha. */
export const CARD_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isCard: { type: 'BOOLEAN' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          kind: { type: 'STRING', enum: ['vacina', 'vermifugo', 'antipulga', 'outro'] },
          name: { type: 'STRING' },
          matched: { type: 'STRING', enum: ['v10', 'v8', 'antirrabica', 'gripe', 'giardia', 'v4', 'v5', 'felv', 'outra'] },
          date: { type: 'STRING', nullable: true },
          confidence: { type: 'NUMBER' },
        },
        required: ['kind', 'name', 'matched', 'date', 'confidence'],
      },
    },
  },
  required: ['isCard', 'items'],
};

/** Lê o JSON da IA mesmo quando vem "sujo" (```json, texto antes/depois, lista). */
export function parseAiJson(text: string): Record<string, unknown> | null {
  const clean = text.replace(/```(json)?/gi, '').trim();
  const tryParse = (t: string) => { try { return JSON.parse(t) as unknown; } catch { return undefined; } };
  let v = tryParse(clean);
  if (v === undefined) {
    const i = clean.indexOf('{'); const j = clean.lastIndexOf('}');
    if (i >= 0 && j > i) v = tryParse(clean.slice(i, j + 1));
  }
  if (Array.isArray(v)) v = v[0];
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

/** Limites da v1 grátis (o servidor confere; o app só mostra). */
export const MONTHLY_LIMITS = { guide: 30, photo: 20, card: 20 };
