import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Pet, UserProfile } from '@/domain/types';
import type { AuthUser, Backend, Collection } from './backend';

/**
 * Modo de teste (sem Firebase): tudo fica salvo só neste aparelho.
 * Liga automaticamente quando o arquivo .env não tem as chaves do Firebase.
 */
const K = {
  accounts: 'pp:accounts',
  session: 'pp:session',
  profile: (uid: string) => `pp:profile:${uid}`,
  pets: 'pp:pets',
  coll: (petId: string, c: Collection) => `pp:${petId}:${c}`,
};

type Account = { uid: string; email: string; name: string; password: string };

async function read<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}
async function write(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** Uma escrita por vez em cada chave (duas gravações juntas não apagam uma à outra). */
const locks = new Map<string, Promise<unknown>>();
function locked<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  locks.set(key, next);
  next.finally(() => { if (locks.get(key) === next) locks.delete(key); }).catch(() => {});
  return next;
}

export function createLocalBackend(): Backend {
  const listeners = new Set<(u: AuthUser | null) => void>();
  const emit = (u: AuthUser | null) => listeners.forEach((l) => l(u));

  async function current(): Promise<AuthUser | null> {
    return read<AuthUser | null>(K.session, null);
  }

  return {
    mode: 'local',
    onAuth(cb) {
      listeners.add(cb);
      current().then(cb);
      return () => listeners.delete(cb);
    },
    async signUp(name, email, password) {
      const accounts = await read<Account[]>(K.accounts, []);
      const e = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(e)) throw { code: 'auth/invalid-email' };
      if (password.length < 6) throw { code: 'auth/weak-password' };
      if (accounts.some((a) => a.email === e)) throw { code: 'auth/email-already-in-use' };
      const acc: Account = { uid: 'local-' + Date.now().toString(36), email: e, name: name.trim() || 'Tutor', password };
      await write(K.accounts, [...accounts, acc]);
      const u = { uid: acc.uid, email: acc.email, name: acc.name };
      await write(K.session, u);
      emit(u);
    },
    async signIn(email, password) {
      const accounts = await read<Account[]>(K.accounts, []);
      const acc = accounts.find((a) => a.email === email.trim().toLowerCase());
      if (!acc || acc.password !== password) throw { code: 'auth/invalid-credential' };
      const u = { uid: acc.uid, email: acc.email, name: acc.name };
      await write(K.session, u);
      emit(u);
    },
    async signInSocial() {
      throw { code: 'local/no-social' };
    },
    async resetPassword() {
      throw { code: 'local/no-reset' };
    },
    async signOut() {
      await AsyncStorage.removeItem(K.session);
      emit(null);
    },
    async getProfile(uid) {
      return read<UserProfile | null>(K.profile(uid), null);
    },
    async saveProfile(p) {
      await write(K.profile(p.uid), p);
    },
    async listPets(uid) {
      const pets = await read<Pet[]>(K.pets, []);
      return pets.filter((p) => p.guardianIds.includes(uid));
    },
    async savePet(p) {
      await locked(K.pets, async () => {
        const pets = await read<Pet[]>(K.pets, []);
        const i = pets.findIndex((x) => x.id === p.id);
        if (i >= 0) pets[i] = p;
        else pets.push(p);
        await write(K.pets, pets);
      });
    },
    async deletePet(petId) {
      await locked(K.pets, async () => {
        const pets = await read<Pet[]>(K.pets, []);
        await write(K.pets, pets.filter((p) => p.id !== petId));
      });
      const colls: Collection[] = ['cares', 'stamps', 'ledger', 'weights', 'diary', 'chat', 'trips'];
      await AsyncStorage.multiRemove(colls.map((c) => K.coll(petId, c)));
    },
    async list(petId, coll) {
      return read(K.coll(petId, coll), []);
    },
    async put(petId, coll, item) {
      const key = K.coll(petId, coll);
      await locked(key, async () => {
        const items = await read<{ id: string }[]>(key, []);
        const i = items.findIndex((x) => x.id === item.id);
        if (i >= 0) items[i] = item;
        else items.push(item);
        await write(key, items);
      });
    },
    async putMany(petId, coll, list) {
      const key = K.coll(petId, coll);
      await locked(key, async () => {
        const items = await read<{ id: string }[]>(key, []);
        for (const item of list) {
          const i = items.findIndex((x) => x.id === item.id);
          if (i >= 0) items[i] = item;
          else items.push(item);
        }
        await write(key, items);
      });
    },
    async remove(petId, coll, id) {
      const key = K.coll(petId, coll);
      await locked(key, async () => {
        const items = await read<{ id: string }[]>(key, []);
        await write(key, items.filter((x) => x.id !== id));
      });
    },
    async deletePhotos() { /* nada na nuvem */ },
    async uploadPhoto() {
      return ''; // modo de teste: as fotos ficam só no aparelho
    },
    async deleteAccount() {
      const u = await current();
      if (!u) return;
      const pets = (await read<Pet[]>(K.pets, [])).filter((p) => p.ownerId === u.uid);
      for (const p of pets) await this.deletePet(p.id);
      await locked(K.accounts, async () => {
        const accounts = await read<Account[]>(K.accounts, []);
        await write(K.accounts, accounts.filter((a) => a.uid !== u.uid));
      });
      await AsyncStorage.multiRemove([K.profile(u.uid), K.session]);
      emit(null);
    },
  };
}
