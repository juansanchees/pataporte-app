import type { Pet, PetSize, Species } from './types';

/**
 * Perfil de saúde por raça: problemas comuns e como prevenir.
 * Informação geral de medicina veterinária preventiva — o app sempre orienta a confirmar com o veterinário.
 */

export interface Risk {
  id: string;
  title: string;
  what: string;
  signs: string[];
  prevent: string[];
  /** palavras que ligam uma pergunta do tutor a este risco */
  keys: string[];
  /** sinal de emergência */
  urgent?: boolean;
  question: string;
}

export const RISKS: Record<string, Risk> = {
  patela: {
    id: 'patela', title: 'Luxação de patela',
    what: 'A patela (o "ossinho" do joelho) sai do lugar. É muito comum em cães pequenos e piora com saltos e piso liso.',
    signs: ['Dá "pulinhos" com uma pata de trás', 'Anda uns passos sem apoiar a pata e depois volta ao normal', 'Evita subir no sofá'],
    prevent: ['Use rampa ou escadinha para sofá e cama', 'Tapetes antiderrapantes em piso liso', 'Mantenha o peso ideal', 'Unhas e pelos das patas aparados', 'Passeios diários para fortalecer a musculatura'],
    keys: ['patela', 'joelho', 'pulinho', 'manca', 'mancando', 'pata de tras', 'pata traseira', 'pula'],
    question: 'Como evitar luxação de patela?',
  },
  quadril: {
    id: 'quadril', title: 'Displasia de quadril e cotovelo',
    what: 'A articulação se forma com folga e causa dor e artrose com o tempo. Comum em raças grandes.',
    signs: ['Dificuldade para levantar ou subir escada', 'Anda "rebolando"', 'Cansa rápido no passeio'],
    prevent: ['Peso ideal a vida toda (é o que mais ajuda)', 'Filhote: evite escadas, saltos e corrida intensa até 1 ano', 'Piso antiderrapante', 'Natação e caminhadas são ótimos exercícios', 'Converse com o vet sobre raio-x a partir de 1 ano'],
    keys: ['quadril', 'displasia', 'levantar', 'rebol', 'cotovelo', 'artrose', 'escada'],
    question: 'Como prevenir displasia de quadril?',
  },
  obesidade: {
    id: 'obesidade', title: 'Sobrepeso',
    what: 'Ganha peso com facilidade. O excesso sobrecarrega articulações, coração e aumenta o risco de diabetes.',
    signs: ['Não dá para sentir as costelas ao passar a mão', 'Sem "cintura" vista de cima', 'Cansa mais rápido'],
    prevent: ['Pese a ração na balança de cozinha', 'Petiscos no máximo 10% do que come no dia', 'Passeio diário', 'Registre o peso todo mês aqui no app'],
    keys: ['gordo', 'obes', 'peso', 'emagrec', 'petisco', 'engord', 'dieta'],
    question: 'Qual o peso ideal e como evitar sobrepeso?',
  },
  otite: {
    id: 'otite', title: 'Otite (infecção de ouvido)',
    what: 'Orelhas caídas e pelos no ouvido seguram umidade, o que favorece fungos e bactérias.',
    signs: ['Coça muito a orelha', 'Balança a cabeça', 'Cheiro forte ou cera escura'],
    prevent: ['Seque bem as orelhas depois do banho ou da piscina', 'Limpe com produto veterinário (nunca cotonete no fundo)', 'Olhe dentro das orelhas uma vez por semana'],
    keys: ['orelha', 'ouvido', 'balanca a cabeca', 'cera', 'otite'],
    question: 'Como limpar a orelha e evitar otite?',
  },
  braquicefalico: {
    id: 'braquicefalico', title: 'Respiração e calor (focinho curto)',
    what: 'Raças de focinho achatado respiram com mais esforço e superaquecem com facilidade.',
    signs: ['Ronco alto ou respiração barulhenta', 'Língua muito roxa ou arroxeada', 'Cansa e ofega muito rápido'],
    prevent: ['Passeios só nas horas frescas (antes das 9h e depois das 17h)', 'Use peitoral em vez de coleira', 'Água fresca sempre e ambiente ventilado', 'Mantenha o peso ideal'],
    keys: ['calor', 'respir', 'ronco', 'ofeg', 'cansa', 'falta de ar', 'lingua roxa'],
    urgent: true,
    question: 'Como proteger do calor e cuidar da respiração?',
  },
  coluna: {
    id: 'coluna', title: 'Hérnia de disco (coluna)',
    what: 'Corpo comprido ou coluna sensível: saltos e escadas podem lesionar os discos da coluna.',
    signs: ['Chora ao ser pego no colo', 'Costas curvadas, não quer se mexer', 'Fraqueza ou arrasta as patas de trás (emergência)'],
    prevent: ['Rampas em vez de pulos', 'Pegue no colo apoiando peito e bumbum juntos', 'Peso ideal', 'Evite escadas'],
    keys: ['coluna', 'costas', 'hernia', 'arrast', 'chora ao pegar', 'nao quer andar'],
    urgent: true,
    question: 'Como proteger a coluna do meu pet?',
  },
  dentes: {
    id: 'dentes', title: 'Tártaro e dentes',
    what: 'Bocas pequenas acumulam tártaro cedo, que causa dor, mau hálito e pode afetar o coração e os rins.',
    signs: ['Mau hálito', 'Dentes amarelados ou gengiva vermelha', 'Mastiga de um lado só'],
    prevent: ['Escove os dentes 3 vezes por semana com pasta de pet', 'Brinquedos e petiscos dentais', 'Avaliação dos dentes no check-up anual'],
    keys: ['dente', 'halito', 'bafo', 'tartaro', 'gengiva', 'boca'],
    question: 'Como cuidar dos dentes e evitar tártaro?',
  },
  olhos: {
    id: 'olhos', title: 'Olhos sensíveis',
    what: 'Olhos saltados ou muito pelo no rosto facilitam irritação, úlcera e lacrimejamento.',
    signs: ['Olho vermelho ou fechado', 'Lacrimejando ou com remela', 'Coça o olho'],
    prevent: ['Limpe o canto dos olhos com gaze e soro todo dia', 'Mantenha os pelos do rosto aparados', 'Olho fechado ou doendo: vá ao vet no mesmo dia'],
    keys: ['olho', 'lacrim', 'remela', 'vermelho no olho', 'pisca'],
    question: 'Como limpar os olhos e evitar problemas?',
  },
  pele: {
    id: 'pele', title: 'Alergias e pele',
    what: 'Tendência a alergias (alimentar ou ambiental) e dermatites, principalmente em dobras de pele.',
    signs: ['Coceira frequente', 'Lambe as patas', 'Vermelhidão, feridas ou queda de pelo'],
    prevent: ['Seque bem as dobras e entre os dedos', 'Banho com produto indicado pelo vet, sem exagero', 'Antipulgas em dia', 'Anote no diário o que ele comeu quando a coceira piora'],
    keys: ['coceira', 'coca', 'pele', 'ferida', 'alergia', 'lambe', 'vermelh', 'dobra'],
    question: 'Como evitar alergias e coceira?',
  },
  traqueia: {
    id: 'traqueia', title: 'Colapso de traqueia',
    what: 'A traqueia é frágil em cães pequenos e pode "achatar", causando tosse.',
    signs: ['Tosse seca parecida com "grasnado de ganso"', 'Tosse ao puxar a guia ou ao se agitar'],
    prevent: ['Use sempre peitoral, nunca coleira de pescoço no passeio', 'Evite fumaça e perfumes fortes', 'Peso ideal'],
    keys: ['tosse', 'ganso', 'engasg', 'traqueia', 'coleira'],
    question: 'Tosse de ganso: como prevenir colapso de traqueia?',
  },
  torcao: {
    id: 'torcao', title: 'Torção gástrica',
    what: 'Em cães grandes de peito fundo, o estômago pode girar. É uma emergência grave.',
    signs: ['Barriga inchada e dura', 'Tenta vomitar e não sai nada', 'Agitado, babando muito — vá ao vet AGORA'],
    prevent: ['Divida a ração em 2 ou 3 refeições', 'Espere 1 hora depois de comer para brincar ou passear', 'Comedouro lento se ele come muito rápido'],
    keys: ['barriga inchada', 'torcao', 'tenta vomitar', 'inchad', 'estomago'],
    urgent: true,
    question: 'Como evitar torção gástrica?',
  },
  energia: {
    id: 'energia', title: 'Muita energia (tédio)',
    what: 'Raça feita para trabalhar ou caçar: sem gasto de energia, fica ansiosa, late e destrói coisas.',
    signs: ['Destrói objetos', 'Late ou chora muito', 'Agitação à noite'],
    prevent: ['1 a 2 horas de atividade por dia', 'Brinquedos de enriquecimento (tapete de lamber, bola com petisco)', 'Treinos curtos de comandos todo dia'],
    keys: ['destr', 'roi', 'rói', 'ansios', 'late', 'agitad', 'energia', 'hiperativ', 'bagunc'],
    question: 'Como gastar a energia e evitar ansiedade?',
  },
  cardio: {
    id: 'cardio', title: 'Coração (cardiomiopatia)',
    what: 'A raça tem tendência a problemas no músculo do coração, que podem não dar sinais no começo.',
    signs: ['Respiração rápida dormindo', 'Cansaço ou desmaio', 'Gato respirando de boca aberta (emergência)'],
    prevent: ['Check-up anual com ausculta', 'Pergunte ao vet sobre ecocardiograma', 'Conte a respiração dormindo: acima de 30 por minuto, procure o vet'],
    keys: ['coracao', 'desmai', 'sopro', 'respiracao rapida', 'boca aberta'],
    urgent: true,
    question: 'Como cuidar do coração?',
  },
  rins: {
    id: 'rins', title: 'Rins',
    what: 'Tendência a doença renal, principalmente com a idade.',
    signs: ['Bebe muita água', 'Faz muito xixi', 'Emagrece ou vomita'],
    prevent: ['Água fresca sempre (fonte ajuda gatos a beberem mais)', 'Ração úmida em parte da dieta', 'Exame de sangue e urina anual a partir dos 7 anos'],
    keys: ['rim', 'rins', 'bebe muita agua', 'muito xixi'],
    question: 'Como proteger os rins?',
  },
  urinario: {
    id: 'urinario', title: 'Trato urinário (cistite e obstrução)',
    what: 'Gatos, principalmente machos, podem ter cistite ou ficar "entupidos". Obstrução é emergência.',
    signs: ['Vai muitas vezes à caixa e sai pouco ou nada', 'Xixi com sangue', 'Mia ao urinar — sem xixi = vet AGORA'],
    prevent: ['Muita água: fonte e ração úmida', 'Caixa de areia sempre limpa (1 por gato + 1)', 'Diminua o estresse: rotina e esconderijos'],
    keys: ['xixi', 'urina', 'caixa', 'sangue no xixi', 'cistite'],
    urgent: true,
    question: 'Como evitar cistite e problemas urinários?',
  },
  pelos: {
    id: 'pelos', title: 'Bolas de pelo e nós',
    what: 'Pelo longo engole-se na lambedura e forma bolas; também faz nós que machucam a pele.',
    signs: ['Vômito com pelo', 'Nós no pelo', 'Prisão de ventre'],
    prevent: ['Escove todos os dias', 'Pasta de malte se o vet indicar', 'Banho e tosa higiênica regulares'],
    keys: ['bola de pelo', 'pelo', 'no no pelo', 'vomit'],
    question: 'Como evitar bolas de pelo e nós?',
  },
};

export interface BreedProfile {
  size: PetSize;
  energy: 'baixa' | 'média' | 'alta';
  risks: string[];
  about: string;
}

const DOGS: Record<string, BreedProfile> = {
  'Golden Retriever': { size: 'grande', energy: 'alta', risks: ['quadril', 'otite', 'obesidade', 'pele'], about: 'Dócil e sociável, adora água e comida. Precisa de exercício diário.' },
  Labrador: { size: 'grande', energy: 'alta', risks: ['obesidade', 'quadril', 'otite'], about: 'Muito guloso e brincalhão. O controle da ração é o cuidado número um.' },
  Poodle: { size: 'pequeno', energy: 'média', risks: ['patela', 'dentes', 'olhos'], about: 'Inteligente e fácil de treinar. O pelo não para de crescer: tosa regular.' },
  'Shih Tzu': { size: 'pequeno', energy: 'baixa', risks: ['braquicefalico', 'olhos', 'dentes', 'patela'], about: 'Carinhoso e calmo. Focinho curto: cuidado com calor e com os olhos.' },
  'Bulldog Francês': { size: 'pequeno', energy: 'média', risks: ['braquicefalico', 'coluna', 'pele'], about: 'Companheiro e engraçado. Não tolera calor nem exercício intenso.' },
  Beagle: { size: 'médio', energy: 'alta', risks: ['obesidade', 'otite', 'energia'], about: 'Farejador e curioso, segue o nariz. Adora comer.' },
  Pinscher: { size: 'pequeno', energy: 'alta', risks: ['patela', 'traqueia', 'dentes'], about: 'Pequeno e corajoso, alerta a qualquer barulho.' },
  'Border Collie': { size: 'médio', energy: 'alta', risks: ['energia', 'quadril'], about: 'O cão mais inteligente: precisa de desafios e muita atividade.' },
  Yorkshire: { size: 'pequeno', energy: 'média', risks: ['patela', 'traqueia', 'dentes'], about: 'Pequeno, valente e apegado ao tutor.' },
  'Lhasa Apso': { size: 'pequeno', energy: 'baixa', risks: ['olhos', 'pele', 'dentes'], about: 'Independente e bom de guarda. Pelagem longa pede escovação.' },
  'Spitz Alemão': { size: 'pequeno', energy: 'média', risks: ['patela', 'traqueia', 'dentes'], about: 'Alegre e vocal. A pelagem dupla precisa de escovação frequente.' },
  Dachshund: { size: 'pequeno', energy: 'média', risks: ['coluna', 'obesidade', 'dentes'], about: 'Corpo comprido: a coluna é o ponto de atenção a vida toda.' },
  'Pastor Alemão': { size: 'grande', energy: 'alta', risks: ['quadril', 'torcao', 'energia'], about: 'Leal e protetor, aprende rápido e precisa de trabalho.' },
  Rottweiler: { size: 'grande', energy: 'média', risks: ['quadril', 'torcao', 'obesidade'], about: 'Forte e protetor. Socialização desde filhote é essencial.' },
  Pug: { size: 'pequeno', energy: 'baixa', risks: ['braquicefalico', 'olhos', 'obesidade'], about: 'Brincalhão e dorminhoco. Focinho curto e olhos saltados pedem cuidado.' },
  'Maltês': { size: 'pequeno', energy: 'média', risks: ['patela', 'dentes', 'olhos'], about: 'Doce e apegado. Manchas de lágrima são comuns.' },
  Boxer: { size: 'grande', energy: 'alta', risks: ['cardio', 'braquicefalico', 'energia'], about: 'Brincalhão e protetor, tem energia de sobra. Focinho curto: cuidado com calor.' },
  Chihuahua: { size: 'pequeno', energy: 'média', risks: ['patela', 'dentes', 'traqueia'], about: 'Pequenino e corajoso, muito apegado ao tutor. Sente frio fácil.' },
  'Cocker Spaniel': { size: 'médio', energy: 'média', risks: ['otite', 'olhos', 'obesidade'], about: 'Doce e alegre. As orelhas longas pedem limpeza frequente.' },
  'Fox Paulistinha': { size: 'pequeno', energy: 'alta', risks: ['energia', 'dentes', 'patela'], about: 'Raça brasileira, esperta e agitada. Adora caçar e brincar.' },
  'Pit Bull': { size: 'médio', energy: 'alta', risks: ['pele', 'quadril', 'energia'], about: 'Forte, carinhoso e muito ligado à família. Precisa de exercício e socialização.' },
  Schnauzer: { size: 'pequeno', energy: 'média', risks: ['obesidade', 'dentes', 'pele'], about: 'Esperto e bom de guarda. A barba pede limpeza depois de comer.' },
  'Bulldog Inglês': { size: 'médio', energy: 'baixa', risks: ['braquicefalico', 'pele', 'quadril'], about: 'Calmo e teimoso. Sofre com calor e precisa limpar as dobrinhas.' },
  'Cavalier King Charles': { size: 'pequeno', energy: 'média', risks: ['cardio', 'olhos', 'otite'], about: 'Muito carinhoso e tranquilo. Check-up do coração é importante.' },
  'Pastor Australiano': { size: 'médio', energy: 'alta', risks: ['energia', 'quadril', 'olhos'], about: 'Muito inteligente e ativo. Precisa de tarefas e bastante exercício.' },
  'Chow Chow': { size: 'médio', energy: 'baixa', risks: ['pele', 'olhos', 'quadril'], about: 'Independente e reservado. Pelagem densa: sofre com calor.' },
  Akita: { size: 'grande', energy: 'média', risks: ['quadril', 'pele', 'torcao'], about: 'Leal e calmo, mas reservado com estranhos.' },
  'Cane Corso': { size: 'grande', energy: 'média', risks: ['quadril', 'torcao', 'obesidade'], about: 'Protetor e equilibrado. Precisa de treino desde filhote.' },
  Doberman: { size: 'grande', energy: 'alta', risks: ['cardio', 'quadril', 'energia'], about: 'Atento e leal. Check-up do coração é importante.' },
  'Dogue Alemão': { size: 'grande', energy: 'baixa', risks: ['torcao', 'cardio', 'quadril'], about: 'Gigante gentil. Evite exercício logo depois de comer.' },
  'Bichon Frisé': { size: 'pequeno', energy: 'média', risks: ['pele', 'dentes', 'patela'], about: 'Alegre e fofo. O pelo cresce sem parar e precisa de tosa.' },
  'Pequinês': { size: 'pequeno', energy: 'baixa', risks: ['braquicefalico', 'olhos', 'coluna'], about: 'Calmo e independente. Focinho curto: cuidado com calor e olhos.' },
  'Shiba Inu': { size: 'médio', energy: 'média', risks: ['pele', 'patela', 'energia'], about: 'Independente e limpinho, parece um gato. Adora fugir.' },
  Samoieda: { size: 'grande', energy: 'alta', risks: ['quadril', 'pelos', 'energia'], about: 'Sorridente e sociável. A pelagem branca densa sofre com calor.' },
  'Jack Russell': { size: 'pequeno', energy: 'alta', risks: ['energia', 'patela', 'olhos'], about: 'Pequeno com energia de gigante. Precisa gastar energia todo dia.' },
  'Corgi': { size: 'pequeno', energy: 'média', risks: ['coluna', 'obesidade', 'quadril'], about: 'Esperto e engraçado. Corpo comprido: evite pulos e excesso de peso.' },
  'Dálmata': { size: 'grande', energy: 'alta', risks: ['urinario', 'pele', 'energia'], about: 'Atlético e brincalhão. Precisa de muita água e exercício.' },
  'São Bernardo': { size: 'grande', energy: 'baixa', risks: ['quadril', 'torcao', 'olhos'], about: 'Gigante calmo e amoroso. Sofre com calor.' },
  Galgo: { size: 'grande', energy: 'média', risks: ['dentes', 'pele'], about: 'Rápido na corrida e preguiçoso em casa. Sente frio fácil.' },
  'Husky Siberiano': { size: 'grande', energy: 'alta', risks: ['energia', 'quadril'], about: 'Atlético e independente. Sofre com calor forte e adora fugir.' },
};

const CATS: Record<string, BreedProfile> = {
  Persa: { size: 'médio', energy: 'baixa', risks: ['braquicefalico', 'rins', 'olhos', 'pelos'], about: 'Calmo e caseiro. Pelo longo e focinho curto pedem rotina de cuidados.' },
  'Siamês': { size: 'médio', energy: 'alta', risks: ['dentes', 'urinario', 'energia'], about: 'Falante e muito apegado. Gosta de companhia e brincadeiras.' },
  'Maine Coon': { size: 'grande', energy: 'média', risks: ['cardio', 'quadril', 'pelos'], about: 'Gigante gentil, sociável como um cachorro.' },
  Sphynx: { size: 'médio', energy: 'alta', risks: ['cardio', 'pele'], about: 'Sem pelo: pele precisa de banho e protege-se do frio e do sol.' },
  'Angorá': { size: 'médio', energy: 'média', risks: ['pelos', 'urinario'], about: 'Elegante e ativo. Brancos de olhos azuis podem ter surdez.' },
  'British Shorthair': { size: 'médio', energy: 'baixa', risks: ['cardio', 'obesidade'], about: 'Tranquilo e independente, tende a engordar.' },
  Ragdoll: { size: 'grande', energy: 'baixa', risks: ['cardio', 'urinario'], about: 'Relaxa no colo como um "boneco de pano".' },
  'Azul Russo': { size: 'médio', energy: 'média', risks: ['obesidade', 'urinario'], about: 'Tímido e carinhoso com a família. Gosta de rotina.' },
  'Scottish Fold': { size: 'médio', energy: 'baixa', risks: ['quadril', 'cardio'], about: 'Orelhas dobradas e jeito calmo. Fique de olho nas articulações.' },
  Himalaio: { size: 'médio', energy: 'baixa', risks: ['braquicefalico', 'rins', 'pelos'], about: 'Calmo como o Persa. Pelagem longa pede escovação diária.' },
  'Exótico': { size: 'médio', energy: 'baixa', risks: ['braquicefalico', 'rins', 'olhos'], about: 'Um "Persa de pelo curto": tranquilo e carinhoso.' },
  'Sagrado da Birmânia': { size: 'médio', energy: 'média', risks: ['rins', 'obesidade'], about: 'Dócil e sociável, com as patinhas brancas de "luvas".' },
  'Norueguês da Floresta': { size: 'grande', energy: 'média', risks: ['cardio', 'pelos'], about: 'Grande e peludo, adora escalar.' },
  Siberiano: { size: 'grande', energy: 'média', risks: ['cardio', 'pelos'], about: 'Brincalhão e forte, com pelagem densa.' },
  Munchkin: { size: 'pequeno', energy: 'alta', risks: ['coluna', 'obesidade'], about: 'Perninhas curtas e muita curiosidade. Evite excesso de peso.' },
  Bengal: { size: 'médio', energy: 'alta', risks: ['energia', 'cardio'], about: 'Muito ativo e curioso, gosta de água e desafios.' },
};

const BY_SIZE: Record<Species, Record<PetSize, string[]>> = {
  dog: { pequeno: ['patela', 'dentes', 'obesidade'], médio: ['obesidade', 'otite', 'dentes'], grande: ['quadril', 'obesidade', 'torcao'] },
  cat: { pequeno: ['urinario', 'dentes', 'obesidade'], médio: ['urinario', 'obesidade', 'dentes'], grande: ['urinario', 'obesidade', 'cardio'] },
};

export function breedProfile(species: Species, breed: string): BreedProfile | null {
  return (species === 'dog' ? DOGS : CATS)[breed] ?? null;
}

export function sizeFor(species: Species, breed: string, weightKg?: number | null): PetSize {
  const p = breedProfile(species, breed);
  if (p) return p.size;
  if (species === 'cat') return 'médio';
  if (weightKg) return weightKg < 10 ? 'pequeno' : weightKg < 25 ? 'médio' : 'grande';
  return 'médio';
}

type PetLike = Pick<Pet, 'species' | 'breed' | 'weightKg'> & { ancestry?: string[]; size?: PetSize };

/** Riscos do pet: da raça, das raças que ele "puxou" e do porte, sem repetir (até 5). */
export function risksFor(pet: PetLike): Risk[] {
  const size = pet.size ?? sizeFor(pet.species, pet.breed, pet.weightKg);
  const ids: string[] = [];
  const add = (list?: string[]) => list?.forEach((r) => { if (!ids.includes(r)) ids.push(r); });
  add(breedProfile(pet.species, pet.breed)?.risks);
  (pet.ancestry ?? []).forEach((a) => add(breedProfile(pet.species, a)?.risks.slice(0, 2)));
  add(BY_SIZE[pet.species][size]);
  return ids.slice(0, 5).map((id) => RISKS[id]).filter(Boolean);
}

/** Uma dica de prevenção diferente por dia. */
export function tipOfDay(pet: PetLike, day: string): { risk: Risk; tip: string } | null {
  const risks = risksFor(pet);
  if (!risks.length) return null;
  const n = Number(day.replace(/-/g, '')) % 997;
  const all = risks.flatMap((r) => r.prevent.map((tip) => ({ risk: r, tip })));
  return all[n % all.length];
}

/** Resumo em texto para a IA entender o pet. */
export function breedContext(pet: PetLike & { temperament?: string[] }): string {
  const p = breedProfile(pet.species, pet.breed);
  const risks = risksFor(pet).map((r) => r.title).join(', ');
  return [
    `Raça: ${pet.breed}${pet.ancestry?.length ? ` (parece misturado com ${pet.ancestry.join(' e ')})` : ''}.`,
    `Porte: ${pet.size ?? sizeFor(pet.species, pet.breed, pet.weightKg)}. Energia: ${p?.energy ?? 'não informada'}.`,
    pet.temperament?.length ? `Jeito: ${pet.temperament.join(', ')}.` : '',
    `Riscos típicos para ficar de olho: ${risks}.`,
  ].filter(Boolean).join(' ');
}

export const TEMPERAMENTS = ['Brincalhão', 'Calmo', 'Agitado', 'Grudento', 'Independente', 'Medroso', 'Late muito', 'Destrói coisas', 'Guloso', 'Sociável'];
