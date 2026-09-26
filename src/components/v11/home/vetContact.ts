import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/store/app';

/**
 * Telefone do veterinário para a tela de Emergência. Fica no perfil (`profile.vet`), então vale em todos
 * os aparelhos da conta. Versões anteriores guardavam SÓ neste aparelho: lemos esse valor antigo uma vez
 * e passamos para o perfil (depois ele é apagado daqui).
 */
export interface VetContact { name: string; phone: string }

const LEGACY_KEY = 'pataporte.vetContact';

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function useVetContact(): [VetContact | null, (v: VetContact | null) => Promise<void>, boolean] {
  const stored = useApp((s) => s.profile?.vet);
  const hasProfile = useApp((s) => !!s.profile);
  const vet: VetContact | null = stored?.phone ? { name: stored.name ?? '', phone: stored.phone } : null;

  // migração: valor antigo salvo só no aparelho → perfil
  useEffect(() => {
    if (!hasProfile) return;
    let alive = true;
    AsyncStorage.getItem(LEGACY_KEY).then(async (raw) => {
      if (!alive || !raw) return;
      try {
        const v = JSON.parse(raw);
        if (!useApp.getState().profile?.vet && v && typeof v.phone === 'string' && v.phone) {
          await useApp.getState().setVet({ name: String(v.name ?? ''), phone: v.phone });
        }
      } catch { /* ignora */ }
      await AsyncStorage.removeItem(LEGACY_KEY).catch(() => {});
    }).catch(() => {});
    return () => { alive = false; };
  }, [hasProfile]);

  const save = (v: VetContact | null) => useApp.getState().setVet(v);
  return [vet, save, hasProfile];
}
