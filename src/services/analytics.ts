import { Platform } from 'react-native';
import { getApp } from 'firebase/app';

/**
 * Métricas do Pataporte (§8 do spec). Provedores plugáveis, ligados só quando o dono
 * configurar as chaves — sem chave nenhuma, tudo vira um "no-op" (e um log em __DEV__).
 * NUNCA manda dado pessoal (nome, e-mail, telefone): só ids, plano e contagens.
 */
export type AnalyticsEvent =
  | 'first_open'
  | 'signup'
  | 'login'
  | 'cadastro_capitulo_concluido'
  | 'cadastro_concluido'
  | 'vacina_registrada'
  | 'primeira_vacina'
  | 'paywall_visto'
  | 'paywall_fechado'
  | 'trial_iniciado'
  | 'assinatura'
  | 'restaurar_compra'
  | 'lembrete_criado'
  | 'dose_marcada'
  | 'ia_pergunta'
  | 'ia_foto'
  | 'carteirinha_lida'
  | 'milhas_ganhas'
  | 'pet_adicionado'
  | 'compartilhar';

export type EventParams = Record<string, string | number | boolean | undefined>;

interface Provider {
  name: string;
  track(event: AnalyticsEvent, params?: EventParams): void;
  identify(uid: string): void;
  setUserProperty(name: string, value: string): void;
}

// ------------------------------------------------------------------ Firebase Analytics (web)
// No nativo (Android/iOS build), o Firebase Analytics precisa do módulo nativo
// @react-native-firebase/analytics (NÃO instalado ainda) — TODO: quando o dono topar
// adicionar Firebase nativo, trocar este provider por um baseado nele (mesma interface).
function firebaseWebProvider(): Provider | null {
  if (Platform.OS !== 'web') return null;
  let analyticsMod: typeof import('firebase/analytics') | null = null;
  let instance: import('firebase/analytics').Analytics | null = null;
  let ready: Promise<void> | null = null;

  async function ensure() {
    if (!ready) {
      ready = (async () => {
        try {
          const mod = await import('firebase/analytics');
          if (await mod.isSupported()) {
            analyticsMod = mod;
            instance = mod.getAnalytics(getApp());
          }
        } catch {
          // sem suporte (ex.: navegador sem cookies/localStorage) — fica em no-op
        }
      })();
    }
    return ready;
  }
  void ensure();

  return {
    name: 'firebase',
    track(event, params) {
      // os nomes dos nossos eventos não são os eventos "recomendados" do GA (que têm overloads próprios);
      // são todos eventos customizados válidos para o Firebase Analytics.
      void ensure().then(() => { if (analyticsMod && instance) analyticsMod.logEvent(instance, event as Parameters<typeof analyticsMod.logEvent>[1] & string, params); });
    },
    identify(uid) {
      void ensure().then(() => { if (analyticsMod && instance) analyticsMod.setUserId(instance, uid); });
    },
    setUserProperty(name, value) {
      void ensure().then(() => { if (analyticsMod && instance) analyticsMod.setUserProperties(instance, { [name]: value }); });
    },
  };
}

// TODO (nativo): quando o dono instalar @react-native-firebase/analytics e configurar o app
// (google-services.json / GoogleService-Info.plist + plugin no app.json), criar aqui um provider
// equivalente usando `import analytics from '@react-native-firebase/analytics'` com a mesma interface
// (analytics().logEvent(event, params), analytics().setUserId(uid), analytics().setUserProperty(name, value)).

// ------------------------------------------------------------------ Meta (Facebook)
// Habilitado só quando EXPO_PUBLIC_META_APP_ID estiver configurado. Ainda não instalamos o SDK nativo
// (react-native-fbsdk-next) — TODO: quando o dono topar, trocar por chamadas reais de
// `import { AppEventsLogger } from 'react-native-fbsdk-next'`.
function metaProvider(): Provider | null {
  const appId = process.env.EXPO_PUBLIC_META_APP_ID ?? '';
  if (!appId) return null;
  return {
    name: 'meta',
    track(event, params) {
      if (__DEV__) console.log('[meta:TODO react-native-fbsdk-next]', event, params ?? {});
    },
    identify() { /* TODO: AppEventsLogger não usa id de usuário diretamente */ },
    setUserProperty() { /* TODO */ },
  };
}

const providers: Provider[] = [firebaseWebProvider(), metaProvider()].filter((p): p is Provider => !!p);

function devLog(event: AnalyticsEvent, params?: EventParams) {
  if (__DEV__) console.log(`[analytics]${providers.length ? '' : ' (no-op, sem provedor)'}`, event, params ?? {});
}

/** Registra um evento de métricas. Nunca inclua e-mail, nome ou outra PII em `params`. */
export function track(event: AnalyticsEvent, params?: EventParams): void {
  devLog(event, params);
  providers.forEach((p) => { try { p.track(event, params); } catch { /* nunca derruba o app por causa de métricas */ } });
}

/** Associa os eventos seguintes ao id do tutor (uid do Firebase — nunca e-mail/nome). */
export function identify(uid: string): void {
  providers.forEach((p) => { try { p.identify(uid); } catch { /* ignora */ } });
  if (!providers.length && __DEV__) console.log('[analytics] identify (no-op)', uid);
}

/** Propriedade de usuário "plano" (economica | primeira | familia) para segmentar relatórios. */
export function setPlanProperty(plan: string): void {
  providers.forEach((p) => { try { p.setUserProperty('plan', plan); } catch { /* ignora */ } });
  if (!providers.length && __DEV__) console.log('[analytics] setPlanProperty (no-op)', plan);
}

/** Só para testes/depuração: quais provedores estão ativos. */
export function activeProviders(): string[] {
  return providers.map((p) => p.name);
}
