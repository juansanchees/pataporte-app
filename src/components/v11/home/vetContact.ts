import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Telefone do veterinário para a tela de Emergência.
 * O perfil (UserProfile) ainda não tem esse campo — por enquanto fica salvo SÓ neste aparelho.
 * PEDIDO ao store: `profile.vet?: { name?: string; phone: string }` para sincronizar entre aparelhos.
 */
export interface VetContact { name: string; phone: string }

const KEY = 'pataporte.vetContact';

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function useVetContact(): [VetContact | null, (v: VetContact | null) => Promise<void>, boolean] {
  const [vet, setVet] = useState<VetContact | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY).then((raw) => {
      if (!alive) return;
      try { const v = raw ? JSON.parse(raw) : null; if (v && typeof v.phone === 'string' && v.phone) setVet({ name: String(v.name ?? ''), phone: v.phone }); } catch { /* ignora */ }
      setLoaded(true);
    }).catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);
  const save = async (v: VetContact | null) => {
    setVet(v);
    try {
      if (v) await AsyncStorage.setItem(KEY, JSON.stringify(v));
      else await AsyncStorage.removeItem(KEY);
    } catch { /* ignora */ }
  };
  return [vet, save, loaded];
}
