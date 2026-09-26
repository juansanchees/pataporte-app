/** Rotas de outras áreas da v1.1 que a Home/Agenda/abertura chamam (criadas por outros engenheiros). */

/** Tela da dose (engenheiro #3): marcar / "já tinha dado" / pular. `iso` = horário previsto da dose. */
export function doseRoute(reminderId: string, iso: string): string {
  return `/lembrete/dose?id=${encodeURIComponent(reminderId)}&dose=${encodeURIComponent(iso)}`;
}

/** Novo lembrete (engenheiro #3), opcionalmente já com o tipo escolhido. */
export function newReminderRoute(tipo?: 'remedio' | 'comida' | 'passeio' | 'banho' | 'consulta' | 'outro'): string {
  return tipo ? `/lembrete/novo?tipo=${tipo}` : '/lembrete/novo';
}

/** Paywall (engenheiro #4) aberto por um gatilho. */
export function paywallRoute(gatilho: string): string {
  return `/planos?gatilho=${encodeURIComponent(gatilho)}`;
}

/** Hub de milhas (engenheiro #4 transforma /mapa nele). */
export const MILES_ROUTE = '/mapa';
