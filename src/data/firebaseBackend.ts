import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where, writeBatch,
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator, ref as sref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { PET_COLLECTIONS, type Pet, type UserProfile } from '@/domain/types';
import type { AuthUser, Backend, Collection } from './backend';

/**
 * Configuração pública do projeto Firebase "pataporte-app" (não é segredo: a segurança vem das regras
 * do Firestore). O .env pode sobrescrever; EXPO_PUBLIC_BACKEND=local força o modo de teste no aparelho.
 */
const PATAPORTE_FIREBASE: FirebaseOptions = {
  apiKey: 'AIzaSyCt9d2Q1dOIR4-hmBM9kASBydvDTzQpvIM',
  authDomain: 'pataporte-app.firebaseapp.com',
  projectId: 'pataporte-app',
  storageBucket: 'pataporte-app.firebasestorage.app',
  messagingSenderId: '709551643978',
  appId: '1:709551643978:web:c7dbc9f023c8688393f5b3',
};

export function firebaseConfigFromEnv(): FirebaseOptions | null {
  if (process.env.EXPO_PUBLIC_BACKEND === 'local') return null;
  const cfg = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
  if (!cfg.apiKey || !cfg.projectId || !cfg.appId) return PATAPORTE_FIREBASE;
  return cfg as FirebaseOptions;
}

/** Firestore rejects `undefined`; strip it recursively. */
function clean<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function createFirebaseBackend(config: FirebaseOptions): Backend {
  const app = getApps()[0] ?? initializeApp(config);
  // React Native keeps the session in AsyncStorage (see expo.fyi/firebase-js-auth-setup).
  const rnPersistence = (FirebaseAuth as unknown as { getReactNativePersistence?: (s: typeof AsyncStorage) => FirebaseAuth.Persistence }).getReactNativePersistence;
  let auth: FirebaseAuth.Auth;
  try {
    auth = Platform.OS === 'web' || !rnPersistence
      ? FirebaseAuth.getAuth(app)
      : FirebaseAuth.initializeAuth(app, { persistence: rnPersistence(AsyncStorage) });
  } catch {
    auth = FirebaseAuth.getAuth(app); // already initialized (fast refresh)
  }
  const db = getFirestore(app);
  const storage = getStorage(app);
  // desenvolvimento: EXPO_PUBLIC_USE_EMULATORS=1 usa os emuladores locais (firebase emulators:start)
  if (process.env.EXPO_PUBLIC_USE_EMULATORS === '1') {
    try { FirebaseAuth.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true }); } catch { /* já conectado */ }
    try { connectFirestoreEmulator(db, '127.0.0.1', 8080); } catch { /* já conectado */ }
    try { connectStorageEmulator(storage, '127.0.0.1', 9199); } catch { /* já conectado */ }
  }

  const toUser = (u: FirebaseAuth.User): AuthUser => ({ uid: u.uid, email: u.email ?? '', name: u.displayName ?? '' });
  const petsCol = collection(db, 'pets');
  const sub = (petId: string, c: Collection) => collection(db, 'pets', petId, c);

  return {
    mode: 'firebase',
    onAuth(cb) {
      return FirebaseAuth.onAuthStateChanged(auth, (u) => cb(u ? toUser(u) : null));
    },
    async signUp(name, email, password) {
      const cred = await FirebaseAuth.createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) await FirebaseAuth.updateProfile(cred.user, { displayName: name.trim() });
    },
    async signInSocial(r) {
      if (r.kind === 'popup') { await FirebaseAuth.signInWithPopup(auth, new FirebaseAuth.GoogleAuthProvider()); return; }
      const cred = r.kind === 'google'
        ? FirebaseAuth.GoogleAuthProvider.credential(r.idToken)
        : new FirebaseAuth.OAuthProvider('apple.com').credential({ idToken: r.idToken, rawNonce: r.rawNonce });
      await FirebaseAuth.signInWithCredential(auth, cred);
    },
    async signIn(email, password) {
      await FirebaseAuth.signInWithEmailAndPassword(auth, email.trim(), password);
    },
    async resetPassword(email) {
      await FirebaseAuth.sendPasswordResetEmail(auth, email.trim());
    },
    async signOut() {
      await FirebaseAuth.signOut(auth);
    },
    async getProfile(uid) {
      const s = await getDoc(doc(db, 'users', uid));
      return s.exists() ? (s.data() as UserProfile) : null;
    },
    async saveProfile(p) {
      await setDoc(doc(db, 'users', p.uid), clean(p));
    },
    async listPets(uid) {
      const s = await getDocs(query(petsCol, where('guardianIds', 'array-contains', uid)));
      return s.docs.map((d) => d.data() as Pet);
    },
    async savePet(p) {
      await setDoc(doc(db, 'pets', p.id), clean(p));
    },
    async deletePet(petId) {
      const colls: Collection[] = [...PET_COLLECTIONS];
      // subcoleções primeiro (as regras conferem o pet "pai"), em lotes de até 400 (limite do Firestore: 500)
      for (const c of colls) {
        const s = await getDocs(sub(petId, c));
        for (let i = 0; i < s.docs.length; i += 400) {
          const batch = writeBatch(db);
          s.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
      await deleteDoc(doc(db, 'pets', petId));
    },
    async list<T extends { id: string }>(petId: string, coll: Collection) {
      const s = await getDocs(sub(petId, coll));
      return s.docs.map((d) => d.data() as T);
    },
    async put(petId, coll, item) {
      await setDoc(doc(db, 'pets', petId, coll, item.id), clean(item));
    },
    async putMany(petId, coll, items) {
      for (let i = 0; i < items.length; i += 400) {
        const batch = writeBatch(db);
        items.slice(i, i + 400).forEach((it) => batch.set(doc(db, 'pets', petId, coll, it.id), clean(it)));
        await batch.commit();
      }
    },
    async deletePhotos(urls) {
      await Promise.all(urls.map((u) => deleteObject(sref(storage, u)).catch(() => undefined)));
    },
    async uploadPhoto(localUri, name) {
      const u = auth.currentUser;
      if (!u) throw new Error('not-logged');
      const blob = await (await fetch(localUri)).blob();
      const r = sref(storage, `users/${u.uid}/photos/${name}`);
      await uploadBytes(r, blob, { contentType: 'image/jpeg', cacheControl: 'public,max-age=31536000' });
      return getDownloadURL(r);
    },
    async deleteAccount() {
      const u = auth.currentUser;
      if (!u) return;
      // a consulta precisa bater com a regra de leitura (guardianIds); o filtro de dono é feito aqui
      const mine = await getDocs(query(petsCol, where('guardianIds', 'array-contains', u.uid)));
      for (const d of mine.docs) if ((d.data() as Pet).ownerId === u.uid) await this.deletePet(d.id);
      // fotos na nuvem
      try {
        const all = await listAll(sref(storage, `users/${u.uid}/photos`));
        await Promise.all(all.items.map((it) => deleteObject(it).catch(() => undefined)));
      } catch { /* sem fotos */ }
      await deleteDoc(doc(db, 'users', u.uid));
      await deleteDoc(doc(db, 'usage', u.uid)).catch(() => undefined);
      await FirebaseAuth.deleteUser(u); // pode pedir login recente: "auth/requires-recent-login"
    },
    async remove(petId, coll, id) {
      await deleteDoc(doc(db, 'pets', petId, coll, id));
    },
  };
}
