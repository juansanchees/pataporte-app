import type { CareCategory, Recurrence, Species } from './types';

export interface Coat { hex: string; name: string }
export interface Breed { name: string; popular: boolean; coats: Coat[]; aliases?: string[] }

const C = {
  creme: { hex: '#EED9AE', name: 'Creme' },
  douradoClaro: { hex: '#E2B66E', name: 'Dourado claro' },
  dourado: { hex: '#C98A54', name: 'Dourado' },
  ruivo: { hex: '#A8622E', name: 'Ruivo' },
  caramelo: { hex: '#C98A54', name: 'Caramelo' },
  preto: { hex: '#2E2A27', name: 'Preto' },
  branco: { hex: '#F1E9DC', name: 'Branco' },
  chocolate: { hex: '#5B4636', name: 'Chocolate' },
  cinza: { hex: '#8C8C8C', name: 'Cinza' },
  amarelo: { hex: '#E9D3A4', name: 'Amarelo' },
  tricolor: { hex: '#B76E36', name: 'Tricolor' },
  fulvo: { hex: '#CFBDA4', name: 'Fulvo' },
  tigrado: { hex: '#7A5A3C', name: 'Tigrado' },
  laranja: { hex: '#D98B45', name: 'Laranja' },
  seal: { hex: '#6B5444', name: 'Seal point' },
  azul: { hex: '#8A96A3', name: 'Azul' },
  pretoBranco: { hex: '#3A3634', name: 'Preto e branco' },
  pretoFogo: { hex: '#3B2A20', name: 'Preto e marrom' },
};

/** Raças de cães (SRD primeiro; o resto em ordem alfabética). */
export const DOG_BREEDS: Breed[] = [
  { name: 'SRD', popular: true, coats: [C.caramelo, C.preto, C.branco, C.chocolate, C.cinza, C.tigrado, C.creme, C.pretoBranco], aliases: ['vira-lata', 'sem raça', 'mestiço', 'srd', 'mix'] },
  { name: 'Airedale Terrier', popular: false, coats: [C.pretoFogo] },
  { name: 'Akita', popular: false, coats: [C.ruivo, C.branco, C.tigrado], aliases: ['akita inu'] },
  { name: 'American Bully', popular: false, coats: [C.cinza, C.preto, C.chocolate, C.fulvo], aliases: ['bully'] },
  { name: 'Basenji', popular: false, coats: [C.ruivo, C.pretoBranco, C.tricolor] },
  { name: 'Basset Hound', popular: false, coats: [C.tricolor, C.caramelo], aliases: ['basset'] },
  { name: 'Beagle', popular: true, coats: [C.tricolor, C.caramelo] },
  { name: 'Bernese', popular: false, coats: [C.tricolor], aliases: ['boiadeiro bernês', 'bernese mountain dog'] },
  { name: 'Bichon Frisé', popular: false, coats: [C.branco], aliases: ['bichon'] },
  { name: 'Bloodhound', popular: false, coats: [C.ruivo, C.pretoFogo] },
  { name: 'Boiadeiro Australiano', popular: false, coats: [C.azul, C.ruivo], aliases: ['blue heeler', 'red heeler', 'australian cattle dog'] },
  { name: 'Border Collie', popular: true, coats: [C.pretoBranco, C.chocolate, C.cinza] },
  { name: 'Borzoi', popular: false, coats: [C.branco, C.creme] },
  { name: 'Boston Terrier', popular: false, coats: [C.pretoBranco, C.tigrado] },
  { name: 'Boxer', popular: true, coats: [C.fulvo, C.tigrado, C.branco] },
  { name: 'Buldogue Campeiro', popular: false, coats: [C.tigrado, C.fulvo, C.branco], aliases: ['campeiro'] },
  { name: 'Bull Terrier', popular: false, coats: [C.branco, C.tigrado] },
  { name: 'Bulldog Francês', popular: true, coats: [C.fulvo, C.tigrado, C.creme, C.preto], aliases: ['buldogue francês', 'frenchie', 'french bulldog'] },
  { name: 'Bulldog Inglês', popular: true, coats: [C.fulvo, C.branco, C.tigrado], aliases: ['buldogue inglês', 'english bulldog'] },
  { name: 'Bullmastiff', popular: false, coats: [C.fulvo, C.tigrado] },
  { name: 'Cane Corso', popular: false, coats: [C.preto, C.cinza, C.fulvo, C.tigrado], aliases: ['corso'] },
  { name: 'Cavalier King Charles', popular: false, coats: [C.ruivo, C.tricolor], aliases: ['cavalier', 'king charles'] },
  { name: 'Chihuahua', popular: true, coats: [C.fulvo, C.creme, C.preto, C.chocolate] },
  { name: 'Chow Chow', popular: false, coats: [C.ruivo, C.preto, C.creme], aliases: ['chow'] },
  { name: 'Cocker Spaniel', popular: true, coats: [C.dourado, C.preto, C.chocolate], aliases: ['cocker'] },
  { name: 'Collie', popular: false, coats: [C.dourado, C.tricolor], aliases: ['rough collie'] },
  { name: 'Corgi', popular: false, coats: [C.ruivo, C.tricolor], aliases: ['welsh corgi', 'pembroke'] },
  { name: 'Dachshund', popular: true, coats: [C.ruivo, C.preto, C.chocolate, C.pretoFogo], aliases: ['salsicha', 'teckel', 'cofap', 'dachshund'] },
  { name: 'Dálmata', popular: false, coats: [C.pretoBranco], aliases: ['dalmata'] },
  { name: 'Doberman', popular: false, coats: [C.pretoFogo, C.chocolate], aliases: ['dobermann'] },
  { name: 'Dogo Argentino', popular: false, coats: [C.branco], aliases: ['dogo'] },
  { name: 'Dogue Alemão', popular: false, coats: [C.fulvo, C.tigrado, C.preto, C.cinza], aliases: ['great dane', 'dogue alemao'] },
  { name: 'Dogue de Bordeaux', popular: false, coats: [C.ruivo], aliases: ['bordeaux'] },
  { name: 'Fila Brasileiro', popular: false, coats: [C.caramelo, C.tigrado, C.preto], aliases: ['fila'] },
  { name: 'Fox Paulistinha', popular: true, coats: [C.tricolor, C.pretoBranco], aliases: ['terrier brasileiro', 'fox paulistinha'] },
  { name: 'Fox Terrier', popular: false, coats: [C.tricolor, C.branco] },
  { name: 'Galgo', popular: false, coats: [C.cinza, C.caramelo, C.preto, C.branco], aliases: ['greyhound', 'galgo inglês'] },
  { name: 'Golden Retriever', popular: true, coats: [C.creme, C.douradoClaro, C.dourado, C.ruivo], aliases: ['golden'] },
  { name: 'Husky Siberiano', popular: true, coats: [C.cinza, C.preto, C.branco, C.ruivo], aliases: ['husky'] },
  { name: 'Jack Russell', popular: false, coats: [C.tricolor, C.branco], aliases: ['jack russell terrier'] },
  { name: 'Labrador', popular: true, coats: [C.amarelo, C.preto, C.chocolate], aliases: ['labrador retriever'] },
  { name: 'Lhasa Apso', popular: true, coats: [C.dourado, C.branco, C.cinza], aliases: ['lhasa'] },
  { name: 'Malamute do Alasca', popular: false, coats: [C.cinza, C.preto, C.branco], aliases: ['malamute'] },
  { name: 'Maltês', popular: true, coats: [C.branco], aliases: ['maltes', 'maltese'] },
  { name: 'Pastor Alemão', popular: true, coats: [C.pretoFogo, C.preto, C.caramelo], aliases: ['pastor alemao', 'german shepherd'] },
  { name: 'Pastor Australiano', popular: false, coats: [C.azul, C.pretoBranco, C.ruivo, C.tricolor], aliases: ['australian shepherd', 'aussie'] },
  { name: 'Pastor Belga', popular: false, coats: [C.fulvo, C.preto], aliases: ['malinois', 'pastor belga malinois'] },
  { name: 'Pastor de Shetland', popular: false, coats: [C.dourado, C.tricolor], aliases: ['sheltie'] },
  { name: 'Pequinês', popular: false, coats: [C.dourado, C.creme, C.preto], aliases: ['pequines', 'pekingese'] },
  { name: 'Pinscher', popular: true, coats: [C.preto, C.pretoFogo, C.ruivo, C.chocolate], aliases: ['pinscher miniatura'] },
  { name: 'Pit Bull', popular: true, coats: [C.cinza, C.caramelo, C.preto, C.branco, C.tigrado], aliases: ['pitbull', 'american pit bull terrier'] },
  { name: 'Poodle', popular: true, coats: [C.branco, C.preto, C.chocolate, C.creme, C.cinza], aliases: ['poodle toy', 'poodle miniatura'] },
  { name: 'Pug', popular: true, coats: [C.fulvo, C.preto] },
  { name: 'Rottweiler', popular: true, coats: [C.pretoFogo], aliases: ['rottweiler'] },
  { name: 'Samoieda', popular: false, coats: [C.branco], aliases: ['samoyed'] },
  { name: 'São Bernardo', popular: false, coats: [C.tricolor, C.ruivo], aliases: ['sao bernardo', 'saint bernard'] },
  { name: 'Schnauzer', popular: true, coats: [C.cinza, C.preto, C.branco], aliases: ['schnauzer miniatura'] },
  { name: 'Setter Irlandês', popular: false, coats: [C.ruivo], aliases: ['setter'] },
  { name: 'Shar-Pei', popular: false, coats: [C.fulvo, C.creme, C.chocolate, C.preto], aliases: ['shar pei'] },
  { name: 'Shiba Inu', popular: false, coats: [C.ruivo, C.creme, C.pretoFogo], aliases: ['shiba'] },
  { name: 'Shih Tzu', popular: true, coats: [C.branco, C.dourado, C.preto, C.cinza], aliases: ['shih-tzu', 'shitzu'] },
  { name: 'Spitz Alemão', popular: true, coats: [C.laranja, C.creme, C.branco, C.preto], aliases: ['lulu da pomerânia', 'lulu', 'pomerânia', 'pomeranian', 'spitz', 'german spitz', 'spitz anão'] },
  { name: 'Staffordshire Bull Terrier', popular: false, coats: [C.tigrado, C.preto, C.branco], aliases: ['staffbull', 'staffordshire'] },
  { name: 'Terra Nova', popular: false, coats: [C.preto, C.chocolate], aliases: ['newfoundland'] },
  { name: 'Weimaraner', popular: false, coats: [C.cinza] },
  { name: 'West Highland Terrier', popular: false, coats: [C.branco], aliases: ['westie', 'west highland white terrier'] },
  { name: 'Whippet', popular: false, coats: [C.fulvo, C.cinza, C.branco] },
  { name: 'Yorkshire', popular: true, coats: [C.dourado, C.cinza, C.pretoFogo], aliases: ['yorkshire terrier', 'yorkie'] },
];

export const CAT_BREEDS: Breed[] = [
  { name: 'SRD', popular: true, coats: [C.laranja, C.preto, C.branco, C.cinza, C.tricolor, C.creme, C.tigrado, C.pretoBranco], aliases: ['vira-lata', 'sem raça', 'mestiço', 'srd', 'comum', 'europeu'] },
  { name: 'Abissínio', popular: false, coats: [C.ruivo, C.fulvo], aliases: ['abissinio', 'abyssinian'] },
  { name: 'American Shorthair', popular: false, coats: [C.tigrado, C.cinza] },
  { name: 'Angorá', popular: true, coats: [C.branco, C.cinza], aliases: ['angorá turco', 'angora'] },
  { name: 'Azul Russo', popular: false, coats: [C.azul], aliases: ['russian blue'] },
  { name: 'Bengal', popular: true, coats: [C.laranja, C.tigrado], aliases: ['bengali'] },
  { name: 'Bombaim', popular: false, coats: [C.preto], aliases: ['bombay'] },
  { name: 'British Shorthair', popular: true, coats: [C.azul, C.cinza, C.creme], aliases: ['british'] },
  { name: 'Burmês', popular: false, coats: [C.chocolate], aliases: ['burmese'] },
  { name: 'Chartreux', popular: false, coats: [C.azul] },
  { name: 'Cornish Rex', popular: false, coats: [C.cinza, C.creme, C.preto] },
  { name: 'Devon Rex', popular: false, coats: [C.cinza, C.creme, C.preto] },
  { name: 'Exótico', popular: false, coats: [C.creme, C.cinza, C.laranja], aliases: ['exotic shorthair', 'persa exótico'] },
  { name: 'Himalaio', popular: false, coats: [C.seal, C.creme], aliases: ['himalayan'] },
  { name: 'Maine Coon', popular: true, coats: [C.tigrado, C.preto, C.laranja] },
  { name: 'Munchkin', popular: false, coats: [C.cinza, C.laranja, C.creme] },
  { name: 'Norueguês da Floresta', popular: false, coats: [C.tigrado, C.branco, C.cinza], aliases: ['norwegian forest'] },
  { name: 'Oriental', popular: false, coats: [C.preto, C.chocolate, C.cinza], aliases: ['oriental shorthair'] },
  { name: 'Persa', popular: true, coats: [C.branco, C.cinza, C.creme, C.laranja], aliases: ['persian'] },
  { name: 'Ragdoll', popular: true, coats: [C.seal, C.branco] },
  { name: 'Sagrado da Birmânia', popular: false, coats: [C.seal, C.creme], aliases: ['birmanês', 'birman'] },
  { name: 'Savannah', popular: false, coats: [C.fulvo] },
  { name: 'Scottish Fold', popular: false, coats: [C.cinza, C.creme] },
  { name: 'Siamês', popular: true, coats: [C.seal, C.creme], aliases: ['siames', 'siamese'] },
  { name: 'Siberiano', popular: false, coats: [C.tigrado, C.cinza], aliases: ['siberian'] },
  { name: 'Sphynx', popular: true, coats: [C.creme, C.cinza], aliases: ['sem pelo', 'pelado'] },
];

const norm = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Acha a raça pelo nome ou apelido ("Lulu da Pomerânia" → Spitz Alemão). */
export function findBreed(species: Species, name: string): Breed | undefined {
  const n = norm(name);
  if (!n) return undefined;
  const list = breedsFor(species);
  return list.find((b) => norm(b.name) === n)
    ?? list.find((b) => b.aliases?.some((a) => norm(a) === n))
    ?? list.find((b) => b.name !== 'SRD' && (n.includes(norm(b.name)) || b.aliases?.some((a) => n.includes(norm(a)))));
}

export function breedsFor(species: Species): Breed[] {
  return species === 'dog' ? DOG_BREEDS : CAT_BREEDS;
}

export function coatsFor(species: Species, breed: string): Coat[] {
  return breedsFor(species).find((b) => b.name === breed)?.coats ?? breedsFor(species)[0].coats;
}

export const DETAIL_OPTIONS = {
  manchas: ['Sem manchas', 'Clara', 'Escura'],
  olhos: ['Castanho', 'Preto', 'Azul', 'Verde', 'Âmbar'],
  orelhas: ['Caídas', 'Em pé', 'Meio-termo'],
  pelo: ['Natural', 'Tosado'],
  rabo: ['Longo', 'Curto', 'Enrolado'],
} as const;

export const EYE_HEX: Record<string, string> = {
  Castanho: '#4A2F1C', Preto: '#2A2622', Azul: '#3E7CB1', Verde: '#4F7F3A', 'Âmbar': '#B7791F',
};

export interface CareType {
  code: string;
  name: string;
  category: CareCategory;
  species: Species[];
  recurrence: Recurrence;
  hint: string;
  optional: boolean;
  miles: number;
  /** explicação simples para o tutor */
  about: string;
  /** only suggested when the pet is not neutered */
  onlyIfNotNeutered?: boolean;
}

/**
 * Suggested preventive schedule shown in the "Carimbos anteriores" step.
 * These are common recommendations in Brazil; the UI always tells the tutor to confirm with the vet.
 */
export const CARE_TYPES: CareType[] = [
  { code: 'V10', name: 'V10', category: 'vacina', species: ['dog'], recurrence: { unit: 'year', every: 1 }, hint: 'Reforço anual', optional: false, miles: 15, about: 'Protege contra cinomose, parvovirose, hepatite, leptospirose e outras doenças graves. Filhotes tomam 3 a 4 doses; adultos, 1 reforço por ano.' },
  { code: 'V4F', name: 'V4 ou V5 felina (múltipla)', category: 'vacina', species: ['cat'], recurrence: { unit: 'year', every: 1 }, hint: 'Reforço anual', optional: false, miles: 15, about: 'Protege gatos contra rinotraqueíte, calicivirose, panleucopenia (e clamidiose na V4/leucemia na V5). Reforço anual.' },
  { code: 'ARB', name: 'Antirrábica', category: 'vacina', species: ['dog', 'cat'], recurrence: { unit: 'year', every: 1 }, hint: 'Reforço anual · obrigatória', optional: false, miles: 15, about: 'Protege contra a raiva. É obrigatória por lei e exigida em qualquer viagem. Reforço anual.' },
  { code: 'GRP', name: 'Gripe canina', category: 'vacina', species: ['dog'], recurrence: { unit: 'year', every: 1 }, hint: 'Opcional · convívio com outros cães', optional: true, miles: 15, about: 'Protege contra a tosse dos canis. Indicada para quem vai a creche, hotel, banho e tosa ou convive com muitos cães.' },
  { code: 'GIA', name: 'Giárdia', category: 'vacina', species: ['dog'], recurrence: { unit: 'year', every: 1 }, hint: 'Opcional', optional: true, miles: 15, about: 'Ajuda a prevenir a giárdia, um parasita intestinal que causa diarreia. Converse com o vet se vale para o seu pet.' },
  { code: 'VRM', name: 'Vermífugo', category: 'vermifugo', species: ['dog', 'cat'], recurrence: { unit: 'month', every: 3 }, hint: 'A cada 3 meses', optional: false, miles: 10, about: 'Remédio contra vermes intestinais. Normalmente a cada 3 meses para adultos; filhotes tomam com mais frequência.' },
  { code: 'APG', name: 'Antipulgas e carrapatos', category: 'antiparasitario', species: ['dog', 'cat'], recurrence: { unit: 'month', every: 1 }, hint: 'Mensal', optional: false, miles: 10, about: 'Protege contra pulgas e carrapatos (que transmitem doenças). Existe em comprimido, pipeta ou coleira; a frequência depende do produto.' },
  { code: 'CHK', name: 'Check-up anual', category: 'exame', species: ['dog', 'cat'], recurrence: { unit: 'year', every: 1 }, hint: 'Exame de rotina', optional: false, miles: 10, about: 'Consulta de rotina com exame físico e, se o vet pedir, exames de sangue. Pega problemas cedo.' },
  { code: 'CST', name: 'Castração', category: 'outro', species: ['dog', 'cat'], recurrence: null, hint: 'Converse com o veterinário', optional: true, miles: 10, about: 'Cirurgia que evita crias e reduz riscos de alguns tumores e infecções. Converse com o veterinário sobre a melhor idade.', onlyIfNotNeutered: true },
];

export function careTypesFor(species: Species, neutered: 'sim' | 'nao' | 'naosei'): CareType[] {
  return CARE_TYPES.filter((c) => c.species.includes(species) && !(c.onlyIfNotNeutered && neutered === 'sim'));
}

export const CATEGORY_LABEL: Record<CareCategory, string> = {
  vacina: 'Vacina',
  vermifugo: 'Vermífugo',
  antiparasitario: 'Antipulgas',
  remedio: 'Remédio',
  exame: 'Exame',
  outro: 'Outro',
};

/** Horários sugeridos a partir do número de refeições por dia. */
export function mealTimesFor(n: number): string[] {
  return ({ 1: ['08:00'], 2: ['07:00', '19:00'], 3: ['07:00', '13:00', '19:00'], 4: ['07:00', '11:00', '15:00', '19:00'] } as Record<number, string[]>)[n] ?? ['07:00', '19:00'];
}

/** Gramas por refeição, quando o tutor informou a quantidade diária. */
export function gramsPerMeal(pet: { gramsPerDay?: number | null; mealsPerDay?: number | null; mealTimes: string[] }): number | null {
  const meals = pet.mealsPerDay || pet.mealTimes.length || 0;
  if (!pet.gramsPerDay || !meals) return null;
  return Math.round(pet.gramsPerDay / meals);
}

export function aboutCare(code: string, name: string): string {
  return CARE_TYPES.find((c) => c.code === code)?.about ?? `Cuidado cadastrado por você: ${name}.`;
}

export function milesForCategory(cat: CareCategory): number {
  return cat === 'vacina' ? 15 : 10;
}

/** 3-letter code from a free name, e.g. "Antirrábica" -> "ANT". */
export function codeFromName(name: string): string {
  const clean = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 3) return words.slice(0, 3).map((w) => w[0]).join('');
  return (clean.replace(/\s/g, '') + 'XXX').slice(0, 3);
}

export function petCode(name: string): string {
  const clean = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').toUpperCase();
  if (clean.length <= 3) return (clean + 'XXX').slice(0, 3);
  const consonants = clean[0] + clean.slice(1).replace(/[AEIOU]/g, '');
  return (consonants.length >= 3 ? consonants : clean).slice(0, 3);
}

// ------------------------------------------------------------------ textos por tipo de cuidado
/** Palavras certas para cada tipo: "Já tomou" (vacina), "Já fez" (check-up), "Já aplicou" (antipulgas)… */
export function careWords(category: CareCategory): { done: string; notYet: string; when: string } {
  switch (category) {
    case 'vacina': return { done: 'Já tomou', notYet: 'Ainda não tomou', when: 'Quando tomou a última dose?' };
    case 'vermifugo': return { done: 'Já tomou', notYet: 'Ainda não tomou', when: 'Quando tomou o último?' };
    case 'antiparasitario': return { done: 'Já usa', notYet: 'Ainda não usa', when: 'Quando foi a última aplicação?' };
    case 'exame': return { done: 'Já fez', notYet: 'Ainda não fez', when: 'Quando foi o último?' };
    case 'remedio': return { done: 'Já deu', notYet: 'Ainda não deu', when: 'Quando deu a última vez?' };
    default: return { done: 'Já fez', notYet: 'Ainda não fez', when: 'Quando foi?' };
  }
}

// ------------------------------------------------------------------ alimentação
export const FOOD_OPTIONS = ['Ração', 'Comida caseira', 'Os dois'] as const;
/** Nome amigável da alimentação (aceita os valores antigos: Seca, Úmida, Natural, Mista). */
export function foodLabel(food: string): string {
  return ({ Seca: 'Ração', Úmida: 'Ração úmida', Natural: 'Comida caseira', Mista: 'Ração e comida caseira', 'Os dois': 'Ração e comida caseira' } as Record<string, string>)[food] ?? food;
}
/** Valor atual escolhido nos 3 botões (converte os valores antigos). */
export function foodChoice(food: string): (typeof FOOD_OPTIONS)[number] {
  if (food === 'Comida caseira' || food === 'Natural') return 'Comida caseira';
  if (food === 'Os dois' || food === 'Mista') return 'Os dois';
  return 'Ração';
}

/**
 * Cuidados perguntados no cadastro. A castração não entra: já é respondida em "Dados do pet"
 * (Castrado? Sim/Não) e não é algo que "vence".
 */
export function emissionCareTypes(species: Species, neutered: 'sim' | 'nao' | 'naosei'): CareType[] {
  return careTypesFor(species, neutered).filter((c) => c.code !== 'CST');
}
