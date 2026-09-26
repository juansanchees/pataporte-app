import { useEffect } from 'react';
import { router, usePathname } from 'expo-router';
import { useApp } from '@/store/app';

/**
 * Mostra o paywall pedido pela store (`pendingPaywall`, ex.: 1ª vacina registrada FORA do cadastro — carimbo na
 * ficha do cuidado, carteirinha com o pet já criado). Espera a animação do carimbo terminar e nunca abre no meio
 * do cadastro nem por cima de outro paywall. A tela /planos chama markPaywallSeen, que limpa o pedido (1 vez só).
 */
export function PendingPaywallHost() {
  const pending = useApp((s) => s.pendingPaywall);
  const stampFx = useApp((s) => s.stampFx);
  const stampAsk = useApp((s) => s.stampAsk);
  const path = usePathname();
  const busy = !!stampFx || !!stampAsk || path.startsWith('/emissao') || path.startsWith('/planos') || path === '/emitido' || path === '/';

  useEffect(() => {
    if (!pending || busy) return;
    const t = setTimeout(() => {
      if (useApp.getState().pendingPaywall === pending) router.push(`/planos?gatilho=${pending}` as never);
    }, 700);
    return () => clearTimeout(t);
  }, [pending, busy, path]);

  return null;
}
