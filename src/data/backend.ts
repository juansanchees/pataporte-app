import type { Pet, PetData, UserProfile } from '@/domain/types';

export type Collection = keyof PetData; // cares | stamps | ledger | weights | diary | chat

export interface AuthUser { uid: string; email: string; name: string }

export interface Backend {
  mode: 'firebase' | 'local';
  onAuth(cb: (u: AuthUser | null) => void): () => void;
  signUp(name: string, email: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  /** Login com Google/Apple (token do provedor). Web: 'popup' abre a janela do Google. */
  signInSocial(r: { kind: 'google'; idToken: string } | { kind: 'apple'; idToken: string; rawNonce: string } | { kind: 'popup' }): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;

  getProfile(uid: string): Promise<UserProfile | null>;
  saveProfile(p: UserProfile): Promise<void>;

  listPets(uid: string): Promise<Pet[]>;
  savePet(p: Pet): Promise<void>;
  deletePet(petId: string): Promise<void>;

  list<T extends { id: string }>(petId: string, coll: Collection): Promise<T[]>;
  put<T extends { id: string }>(petId: string, coll: Collection, item: T): Promise<void>;
  putMany<T extends { id: string }>(petId: string, coll: Collection, items: T[]): Promise<void>;
  remove(petId: string, coll: Collection, id: string): Promise<void>;
  /** Apaga a conta, o perfil e os passaportes de que a pessoa é dona. */
  deleteAccount(): Promise<void>;
  /** Sobe uma foto (já comprimida) para a nuvem do usuário e devolve o link. Modo local: devolve ''. */
  uploadPhoto(localUri: string, name: string): Promise<string>;
  /** Apaga fotos da nuvem pelos links (ao excluir um passaporte). */
  deletePhotos(urls: string[]): Promise<void>;
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Friendly Portuguese messages for auth errors (Firebase codes + local ones). */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? (e as Error)?.message ?? '';
  const map: Record<string, string> = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/missing-password': 'Digite a senha.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Tente entrar.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'Não encontramos uma conta com esse e-mail.',
    'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
    'auth/network-request-failed': 'Sem conexão com a internet.',
    'auth/account-exists-with-different-credential': 'Esse e-mail já tem uma conta com senha. Entre com e-mail e senha.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere pop-ups e tente de novo.',
    'DEVELOPER_ERROR': 'O login com Google ainda não está configurado neste app.',
    'local/no-social': 'No modo de teste, entre com e-mail e senha.',
  };
  for (const k of Object.keys(map)) if (code.includes(k)) return map[k];
  return 'Não foi possível concluir. Tente de novo.';
}
