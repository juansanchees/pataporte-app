import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useApp } from '@/store/app';
import { PRICES } from '@/domain/commerce';
import type { PaywallTriggerId } from '@/domain/types';
import { getOfferings, purchase, restore, type Offerings, type PurchasePlan } from '@/services/purchases';
import { track } from '@/services/analytics';
import { goBack } from './common';

/** Gatilhos aceitos em /planos?gatilho=… (grafico_peso ainda não é um PaywallTriggerId da store). */
export type Gatilho = PaywallTriggerId | 'grafico_peso';
const STORE_TRIGGERS: PaywallTriggerId[] = ['primeira_vacina', 'ia_4a_pergunta', 'ia_foto', 'segundo_pet', 'compartilhar'];
export const GATILHOS: Gatilho[] = [...STORE_TRIGGERS, 'grafico_peso'];

export function parseGatilho(v: unknown): Gatilho | null {
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' && (GATILHOS as string[]).includes(s) ? (s as Gatilho) : null;
}

const FALLBACK: Offerings = { annual: { priceString: PRICES.yearlyLabel }, monthly: { priceString: PRICES.monthlyLabel } };

/**
 * Tudo que o paywall faz: preços (RevenueCat com fallback), compra, restaurar, fechar e métricas.
 * Compra ok → teste grátis (startTrial) quando a loja devolve período de teste e a conta ainda não usou o teste;
 * senão setPlan('primeira'). Ver PEDIDOS: a store ainda não tem uma ação "compra da loja" (source 'loja').
 */
export function usePaywall(gatilho: Gatilho | null, opts?: { silent?: boolean }) {
  const [prices, setPrices] = useState<Offerings>(FALLBACK);
  const [busy, setBusy] = useState<null | 'buy' | 'restore'>(null);
  const done = useRef(false);
  const tag = gatilho ?? 'nenhum';

  useEffect(() => {
    let alive = true;
    getOfferings().then((o) => { if (alive) setPrices(o); }).catch(() => {});
    if (opts?.silent) return () => { alive = false; };
    track('paywall_visto', { gatilho: tag });
    if (gatilho && (STORE_TRIGGERS as string[]).includes(gatilho)) {
      useApp.getState().markPaywallSeen(gatilho as PaywallTriggerId).catch(() => {});
    }
    return () => { alive = false; };
  }, [gatilho, tag]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    if (!done.current) track('paywall_fechado', { gatilho: tag });
    goBack();
  };

  const buy = async (period: PurchasePlan = 'annual') => {
    if (busy) return;
    setBusy('buy');
    const st = useApp.getState();
    const periodo = period === 'annual' ? 'anual' : 'mensal';
    try {
      const r = await purchase(period);
      if (!r.ok) return; // cancelou na loja
      done.current = true;
      const trialUsed = !!useApp.getState().profile?.planState?.trialEndsAt;
      if (r.isTrial && !trialUsed) {
        await st.startTrial(periodo);
        track('trial_iniciado', { gatilho: tag, periodo });
        st.showToast('Pronto! Primeira Classe liberada: 7 dias grátis.');
      } else {
        await st.setPlan('primeira');
        track('assinatura', { gatilho: tag, periodo });
        st.showToast('Bem-vindo à Primeira Classe!');
      }
      goBack();
    } catch {
      st.showToast('Não foi possível concluir agora. Verifique a internet e tente de novo.');
    } finally {
      setBusy(null);
    }
  };

  const restoreNow = async () => {
    if (busy) return;
    setBusy('restore');
    const st = useApp.getState();
    try {
      const r = await restore();
      track('restaurar_compra', { gatilho: tag, ok: r.ok });
      if (r.ok) {
        done.current = true;
        await st.setPlan('primeira');
        st.showToast('Compra restaurada. Boa viagem na Primeira Classe!');
        goBack();
      } else {
        st.showToast('Não encontramos uma compra nesta conta da loja.');
      }
    } finally {
      setBusy(null);
    }
  };

  return { prices, busy, buy, restoreNow, close, compare: () => router.push('/planos-comparar' as never) };
}

/** "Esperar até 1º de outubro" (quando as perguntas grátis voltam). */
export function nextMonthFirst(now = new Date()): string {
  const names = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `1º de ${names[(now.getMonth() + 1) % 12]}`;
}
