import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Login com Google e com Apple.
 * • Google no celular usa o módulo nativo (@react-native-google-signin) — NÃO funciona no Expo Go,
 *   só no app de verdade (build EAS). No navegador usa a janela do Google (popup).
 * • Apple: só no iPhone (a Apple exige oferecer "Entrar com Apple" quando o app tem login do Google).
 *
 * Os IDs abaixo vêm do Firebase (Authentication → Google → "ID do cliente da Web") e do
 * GoogleService-Info.plist (CLIENT_ID). Enquanto estiverem vazios, os botões ficam escondidos.
 */
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '709551643978-l44565e4u09pdo5rkl2j7vdj6kcvuip1.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export type SocialResult = { kind: 'google'; idToken: string } | { kind: 'apple'; idToken: string; rawNonce: string; name?: string } | { kind: 'popup' } | null;

/** O botão "Continuar com Google" aparece? */
export function googleAvailable(): boolean {
  if (Platform.OS === 'web') return true;
  if (inExpoGo) return false;
  return !!GOOGLE_WEB_CLIENT_ID && (Platform.OS !== 'ios' || !!GOOGLE_IOS_CLIENT_ID);
}

/** O botão "Continuar com Apple" aparece? (iPhone, fora do Expo Go) */
export async function appleAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios' || inExpoGo) return false;
  try {
    const Apple = await import('expo-apple-authentication');
    return await Apple.isAvailableAsync();
  } catch { return false; }
}

/** Abre a escolha de conta Google. Devolve o token (ou null se a pessoa cancelou). */
export async function googleSignIn(): Promise<SocialResult> {
  if (Platform.OS === 'web') return { kind: 'popup' };
  // import dinâmico: no Expo Go o módulo nativo não existe
  const { GoogleSignin, isErrorWithCode, statusCodes } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}) });
  try {
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const r = await GoogleSignin.signIn();
    if (r.type !== 'success' || !r.data.idToken) return null;
    return { kind: 'google', idToken: r.data.idToken };
  } catch (e) {
    if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) return null;
    throw e;
  }
}

/** "Entrar com Apple" (iPhone). */
export async function appleSignIn(): Promise<SocialResult> {
  const Apple = await import('expo-apple-authentication');
  const Crypto = await import('expo-crypto');
  const rawNonce = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  try {
    const c = await Apple.signInAsync({
      requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    });
    if (!c.identityToken) return null;
    const name = [c.fullName?.givenName, c.fullName?.familyName].filter(Boolean).join(' ');
    return { kind: 'apple', idToken: c.identityToken, rawNonce, ...(name ? { name } : {}) };
  } catch (e) {
    if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
}

/** Ao sair da conta: esquece a conta Google escolhida (para poder trocar). */
export async function socialSignOut() {
  if (Platform.OS === 'web' || inExpoGo || !GOOGLE_WEB_CLIENT_ID) return;
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch { /* não estava logado com Google */ }
}
