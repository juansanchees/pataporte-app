import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useApp } from '@/store/app';
import { PRICES } from '@/domain/commerce';
import type { PaywallTriggerId } from '@/domain/types';
import { getOfferings, purchase, purchasesMode, restore, type Offerings, type PurchasePlan } from '@/services/purchases';
import { track } from '@/services/analytics';
import { goBack } from './common';

/** Gatilhos aceitos em /planos?gatilho=… */
export type Gatilho = PaywallTriggerId;
export const GATILHOS: Gatilho[] = ['primeira_vacina', 'ia_4a_pergunta', 'ia_foto', 'segundo_pet', 'compartilhar', 'grafico_peso'];

export function parseGatilho(v: unknown): Gatilho | null {
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' && (GATILHOS as string[]).includes(s) ? (s as Gatilho) : null;
}

const FALLBACK: Offerings = { annual: { priceString: PRICES.yearlyLabel }, monthly: { priceString: PRICES.monthlyLabel } };

/**
 * Tudo que o paywall faz: preços (RevenueCat com fallback), compra, restaurar, fechar e métricas.
 * Loja de verdade → applyStorePurchase (planState.source 'loja' + validade da loja).
 * Modo simulado → teste grátis (startTrial) se a conta ainda não usou o teste; senão setPlan('primeira').
 * `from: 'emissao'` (paywall da 1ª vacina logo depois de emitir): fechar vai para a Home, nunca volta ao cadastro.
 */
export function usePaywall(gatilho: Gatilho | null, opts?: { silent?: boolean; from?: string }) {
  const [prices, setPrices] = useState<Offerings>(FALLBACK);
  const [busy, setBusy] = useState<null | 'buy' | 'restore'>(null);
  const done = useRef(false);
  const tag = gatilho ?? 'nenhum';

  useEffect(() => {
    let alive = true;
    getOfferings().then((o) => { if (alive) setPrices(o); }).catch(() => {});
    if (opts?.silent) return () => { alive = false; };
    track('paywall_visto', { gatilho: tag });
    if (gatilho) useApp.getState().markPaywallSeen(gatilho).catch(() => {});
    return () => { alive = false; };
  }, [gatilho, tag]); // eslint-disable-line react-hooks/exhaustive-deps

  const leave = () => {
    if (opts?.from === 'emissao') router.dismissTo('/inicio');
    else goBack();
  };
  const close = () => {
    if (!done.current) track('paywall_fechado', { gatilho: tag });
    leave();
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
      if (purchasesMode() === 'real') {
        await st.applyStorePurchase({ isTrial: r.isTrial, expiresAt: r.expiresAt, period: periodo });
        track(r.isTrial ? 'trial_iniciado' : 'assinatura', { gatilho: tag, periodo });
        st.showToast(r.isTrial ? 'Pronto! Primeira Classe liberada: 7 dias grátis.' : 'Bem-vindo à Primeira Classe!');
        leave();
        return;
      }
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
      leave();
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
        if (purchasesMode() === 'real') await st.applyStorePurchase({ isTrial: r.isTrial, expiresAt: r.expiresAt });
        else await st.setPlan('primeira');
        st.showToast('Compra restaurada. Boa viagem na Primeira Classe!');
        leave();
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
