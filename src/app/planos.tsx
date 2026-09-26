import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { PaywallMain } from '@/components/v11/premium/PaywallMain';
import { PaywallSheet } from '@/components/v11/premium/PaywallSheet';
import { parseGatilho } from '@/components/v11/premium/usePaywall';

/**
 * Primeira Classe (spec §6). /planos?gatilho=primeira_vacina|ia_4a_pergunta|ia_foto|segundo_pet|compartilhar|grafico_peso
 * - sem gatilho ou primeira_vacina → paywall principal (mockup Paywall-Primeira)
 * - outros → folha curta do contexto (Paywall-IA, -Foto, -Pet, -Compartilhar)
 *
 * NOTA DE DESENVOLVIMENTO: esta tela NÃO redireciona mais quando PAID_PLANS = false, para dar para pré-visualizar.
 * Com o flag desligado, os outros fluxos chamam paywallTrigger/paywallFor, que retornam null, então ela não abre
 * sozinha em produção; a própria tela mostra uma faixa "Pré-visualização" (DevNote) enquanto o flag estiver off.
 */
export default function Planos() {
  const { gatilho } = useLocalSearchParams<{ gatilho?: string }>();
  const g = parseGatilho(gatilho);
  if (!g || g === 'primeira_vacina') return <PaywallMain gatilho={g} />;
  return <PaywallSheet kind={g} />;
}
