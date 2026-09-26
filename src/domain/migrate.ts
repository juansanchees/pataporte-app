import { defaultDuration } from './parasites';
import type { Care, PetData, UserProfile } from './types';

/**
 * v1.1 — dados salvos na v1.0 continuam abrindo: campos novos ganham padrão aqui (na leitura).
 * Nada é regravado no banco só por abrir; o valor migrado é salvo na próxima edição do item.
 */

/** Vermífugo/antipulgas sem duração: vermífugo 3 meses, antipulgas 1 mês (ou a recorrência mensal que já tinha). */
export function migrateCare(c: Care): Care {
  let out = c;
  if ((c.category === 'vermifugo' || c.category === 'antiparasitario') && !c.durationMonths) {
    const fromRec = c.recurrence?.unit === 'month' && [1, 3, 8, 12].includes(c.recurrence.every) ? (c.recurrence.every as 1 | 3 | 8 | 12) : null;
    const months = fromRec ?? defaultDuration(c.category);
    out = { ...out, durationMonths: months, recurrence: c.recurrence ?? { unit: 'month', every: months } };
  }
  if (!Array.isArray(out.reminders)) out = { ...out, reminders: [] };
  return out;
}

export function migratePetData(d: Partial<PetData>): PetData {
  return {
    cares: (d.cares ?? []).map(migrateCare),
    stamps: d.stamps ?? [],
    ledger: d.ledger ?? [],
    weights: d.weights ?? [],
    diary: d.diary ?? [],
    chat: d.chat ?? [],
    trips: d.trips ?? [],
    reminders: (d.reminders ?? []).map((r) => ({ ...r, repeat: r.repeat ?? 'once', notify: r.notify ?? true, active: r.active ?? true })),
    doses: d.doses ?? [],
  };
}

export function migrateProfile(p: UserProfile): UserProfile {
  return { ...p, plan: p.plan ?? 'economica', notifyHour: p.notifyHour ?? 9 };
}
