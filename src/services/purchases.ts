import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Compras (Primeira Classe) via RevenueCat (`react-native-purchases`).
 *
 * REAL: precisa de EXPO_PUBLIC_RC_ANDROID_KEY / EXPO_PUBLIC_RC_IOS_KEY (chaves públicas do RevenueCat)
 * e de um development build (o SDK nativo não roda no Expo Go). Entitlement esperado: "primeira".
 * SIMULADO: sem chave, na web ou no Expo Go — nada trava, as compras "funcionam" localmente (uso em
 * desenvolvimento e para o dono testar o fluxo antes de cadastrar os produtos nas lojas).
 */
export type PurchasePlan = 'annual' | 'monthly';
export interface PurchasesMode { (): 'real' | 'simulated'; }
export interface OfferingInfo { priceString: string }
export interface Offerings { annual: OfferingInfo; monthly: OfferingInfo }
export interface PurchaseResult { ok: boolean; isTrial: boolean; expiresAt: string | null }

const FALLBACK_PRICES: Offerings = { annual: { priceString: 'R$ 197/ano' }, monthly: { priceString: 'R$ 27/mês' } };
const ENTITLEMENT = 'primeira';

const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? '';
const RC_IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '';

const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function rcKey(): string {
  return Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
}

/** Real (SDK nativo configurado) ou simulado (sem chave, web, Expo Go). */
function wantsReal(): boolean {
  return Platform.OS !== 'web' && !inExpoGo && rcKey().length > 5;
}

export function purchasesMode(): 'real' | 'simulated' {
  return wantsReal() ? 'real' : 'simulated';
}

let configured = false;
let listeners: Array<(hasPrimeira: boolean) => void> = [];
// estado local do modo simulado (persiste só durante a sessão do app)
let simulated: { active: boolean; isTrial: boolean; expiresAt: string | null } = { active: false, isTrial: false, expiresAt: null };

async function loadSdk() {
  // import dinâmico: no Expo Go / web o módulo nativo não existe ou não deve rodar
  const mod = await import('react-native-purchases');
  return mod.default ?? mod;
}

/** Chama uma vez, cedo (ex.: ao abrir o app / ao logar), com o uid do tutor. */
export async function initPurchases(uid: string): Promise<void> {
  if (!wantsReal()) return; // modo simulado não precisa configurar nada
  try {
    const Purchases = await loadSdk();
    if (!configured) {
      Purchases.configure({ apiKey: rcKey(), appUserID: uid });
      Purchases.addCustomerInfoUpdateListener((info: { entitlements: { active: Record<string, unknown> } }) => {
        const active = ENTITLEMENT in (info.entitlements?.active ?? {});
        listeners.forEach((l) => l(active));
      });
      configured = true;
    } else {
      await Purchases.logIn(uid);
    }
  } catch {
    // se o módulo nativo falhar (ex.: build antigo), segue em modo simulado
  }
}

/** Preços das ofertas para a tela de planos, com fallback em texto fixo. */
export async function getOfferings(): Promise<Offerings> {
  if (!wantsReal()) return FALLBACK_PRICES;
  try {
    const Purchases = await loadSdk();
    const offerings = await Purchases.getOfferings();
    const current = offerings?.current;
    const annual = current?.annual?.product?.priceString;
    const monthly = current?.monthly?.product?.priceString;
    return {
      annual: { priceString: typeof annual === 'string' && annual ? annual : FALLBACK_PRICES.annual.priceString },
      monthly: { priceString: typeof monthly === 'string' && monthly ? monthly : FALLBACK_PRICES.monthly.priceString },
    };
  } catch {
    return FALLBACK_PRICES;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function simulatedExpiry(): string {
  return new Date(Date.now() + 7 * 24 * 3600_000).toISOString();
}

/** Compra o plano (anual ou mensal), com 7 dias grátis. */
export async function purchase(plan: PurchasePlan): Promise<PurchaseResult> {
  if (!wantsReal()) {
    await sleep(600);
    simulated = { active: true, isTrial: true, expiresAt: simulatedExpiry() };
    listeners.forEach((l) => l(true));
    return { ok: true, isTrial: true, expiresAt: simulated.expiresAt };
  }
  try {
    const Purchases = await loadSdk();
    const offerings = await Purchases.getOfferings();
    const pkg = plan === 'annual' ? offerings?.current?.annual : offerings?.current?.monthly;
    if (!pkg) return { ok: false, isTrial: false, expiresAt: null };
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const ent = customerInfo?.entitlements?.active?.[ENTITLEMENT];
    return { ok: !!ent, isTrial: ent?.periodType === 'TRIAL', expiresAt: ent?.expirationDate ?? null };
  } catch (e) {
    if ((e as { userCancelled?: boolean })?.userCancelled) return { ok: false, isTrial: false, expiresAt: null };
    throw e;
  }
}

/** "Restaurar compra" (troca de aparelho, reinstalação). */
export async function restore(): Promise<PurchaseResult> {
  if (!wantsReal()) {
    const active = simulated.active;
    return { ok: active, isTrial: simulated.isTrial, expiresAt: simulated.expiresAt };
  }
  try {
    const Purchases = await loadSdk();
    const customerInfo = await Purchases.restorePurchases();
    const ent = customerInfo?.entitlements?.active?.[ENTITLEMENT];
    return { ok: !!ent, isTrial: ent?.periodType === 'TRIAL', expiresAt: ent?.expirationDate ?? null };
  } catch {
    return { ok: false, isTrial: false, expiresAt: null };
  }
}

/** A pessoa é Primeira Classe agora? */
export async function hasPrimeira(): Promise<boolean> {
  if (!wantsReal()) return simulated.active;
  try {
    const Purchases = await loadSdk();
    const info = await Purchases.getCustomerInfo();
    return ENTITLEMENT in (info?.entitlements?.active ?? {});
  } catch {
    return false;
  }
}

/** Avisa quando o status de Primeira Classe muda (compra, expiração, restauração). */
export function onEntitlementChange(cb: (hasPrimeira: boolean) => void): () => void {
  listeners.push(cb);
  return () => { listeners = listeners.filter((l) => l !== cb); };
}
