import type { Backend } from './backend';
import { createFirebaseBackend, firebaseConfigFromEnv } from './firebaseBackend';
import { createLocalBackend } from './localBackend';

let instance: Backend | null = null;

/** Firebase when the .env has the keys; otherwise the local test mode. */
export function backend(): Backend {
  if (!instance) {
    const cfg = firebaseConfigFromEnv();
    instance = cfg ? createFirebaseBackend(cfg) : createLocalBackend();
  }
  return instance;
}

export * from './backend';
