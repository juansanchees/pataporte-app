import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivePet, useApp } from '@/store/app';
import { T } from '@/components/ui';
import { Icon } from '@/art/Icon';
import { CadIcon } from '@/art/icons-cadastro';
import { BackButton, BigButton, VetNote } from '@/components/v11/cadastro/Frame';
import { useCadastro } from '@/components/v11/cadastro/session';
import { noteVaccine, startVaccines } from '@/components/v11/cadastro/flow';
import { resolvePhotoUri } from '@/services/photos';
import { track } from '@/services/analytics';
import { vaccineById, type VaccineId } from '@/domain/vaccines';
import { careDurationMonths, PARASITE_CODE, type ParasiteKind } from '@/domain/parasites';
import { fmtBR, parseBR, today } from '@/domain/dates';
import type { CardItem } from '@/shared/aiPrompts';
import type { ParasiteDuration, Species } from '@/domain/types';
import { C, F } from '@/theme';

type Target = VaccineId | ParasiteKind;
interface Row { key: Target; name: string; date: string; confidence: number; editing: boolean; removed: boolean }

const LOW = 0.7;

/** Qual item do app corresponde ao que a IA leu. */
function targetOf(it: CardItem, species: Species): Target | null {
  if (it.kind === 'vermifugo') return 'vermifugo';
  if (it.kind === 'antipulga') return 'antipulgas';
  if (it.kind !== 'vacina') return null;
  switch (it.matched) {
    case 'v10': case 'v8': return species === 'dog' ? 'V10' : null;
    case 'v4': case 'v5': case 'felv': return species === 'cat' ? 'V4F' : null;
    case 'antirrabica': return 'ARB';
    case 'gripe': return species === 'dog' ? 'GRP' : null;
    case 'giardia': return species === 'dog' ? 'GIA' : null;
    default: return null;
  }
}

const nameOf = (k: Target) => (k === 'vermifugo' ? 'Vermífugo' : k === 'antipulgas' ? 'Antipulgas' : vaccineById(k)?.short ?? k);
const isVaccine = (k: Target): k is VaccineId => k !== 'vermifugo' && k !== 'antipulgas';

/** "10092025" → "10/09/2025" enquanto digita. */
function maskDate(t: string): string {
  const x = t.replace(/\D/g, '').slice(0, 8);
  return [x.slice(0, 2), x.slice(2, 4), x.slice(4)].filter(Boolean).join('/');
}

const validDate = (s: string) => { const d = parseBR(s); return !!d && d <= today() && d >= '1995-01-01'; };

/** Carteirinha-Resultado: conferir o que a IA leu (baixa confiança em âmbar "CONFIRA A DATA"), corrigir e salvar. */
export default function CarteirinhaResultado() {
  const { origem } = useLocalSearchParams<{ origem?: string }>();
  const cadastro = origem === 'cadastro';
  const insets = useSafeAreaInsets();
  const card = useCadastro((s) => s.card);
  const pet = useActivePet();
  const species = useApp((s) => (cadastro ? s.draft.species : pet?.species ?? s.draft.species));
  const [busy, setBusy] = useState(false);

  const initial = useMemo(() => {
    const by = new Map<Target, Row>();
    let skipped = 0;
    for (const it of card?.items ?? []) {
      const k = targetOf(it, species);
      if (!k) { skipped++; continue; }
      const cur = by.get(k);
      const date = it.date ?? '';
      // várias doses do mesmo item: fica a mais recente
      if (!cur || (date && (!cur.date || date > (parseBR(cur.date) ?? '')))) {
        by.set(k, { key: k, name: nameOf(k), date: date ? fmtBR(date) : '', confidence: date ? it.confidence : 0, editing: false, removed: false });
      }
    }
    return { rows: [...by.values()], skipped };
  }, [card, species]);
  const [rows, setRows] = useState<Row[]>(initial.rows);

  if (!card) return <Redirect href={{ pathname: '/carteirinha', params: { origem: cadastro ? 'cadastro' : 'pet' } }} />;

  const live = rows.filter((r) => !r.removed);
  const vaccines = live.filter((r) => isVaccine(r.key)).length;
  const allOk = live.length > 0 && live.every((r) => validDate(r.date));
  const patch = (k: Target, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === k ? { ...r, ...p } : r)));

  const save = async () => {
    if (!allOk) return;
    setBusy(true);
    const s = useApp.getState();
    const session = useCadastro.getState();
    const fromCard: Record<string, boolean> = { ...session.fromCard };
    try {
      for (const r of live) {
        const date = parseBR(r.date)!;
        const answer = { kind: 'data' as const, date };
        if (isVaccine(r.key)) {
          if (cadastro) { s.setDraftVaccine(r.key, answer); noteVaccine(r.key, answer); }
          else { await s.registerVaccineAnswer(r.key, answer); track('vacina_registrada', { vacina: r.key, origem: 'carteirinha' }); }
        } else {
          const kind = r.key;
          if (cadastro) {
            s.setDraftParasite(kind, answer, s.draft.parasites?.[kind]?.duration ?? 'naosei');
          } else {
            const care = s.data.cares.find((c) => c.code === PARASITE_CODE[kind]);
            const months = care ? careDurationMonths(care) : 1;
            await s.setParasiteLast(kind, answer, ([1, 3, 8, 12].includes(months) ? months : 'naosei') as ParasiteDuration);
          }
        }
        fromCard[r.key] = true;
      }
      session.set({ fromCard, card: null });
      if (cadastro) { startVaccines(true); return; }
      s.showToast(`${live.length} ${live.length === 1 ? 'item salvo' : 'itens salvos'} no passaporte.`);
      router.canGoBack() ? router.back() : router.replace('/inicio');
    } catch {
      setBusy(false);
      s.showToast('Não foi possível salvar. Verifique a internet.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton onPress={() => router.replace({ pathname: '/carteirinha', params: { origem: cadastro ? 'cadastro' : 'pet' } })} />
        <T v="serif" accessibilityRole="header" style={{ flex: 1, fontSize: 25, lineHeight: 30, color: C.cover }}>Confira o que a IA leu</T>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 12, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 52, height: 66, borderRadius: 8, overflow: 'hidden', borderWidth: 1.5, borderColor: C.line, backgroundColor: '#FFFFFF' }}>
            <Image source={{ uri: resolvePhotoUri(card.uri) }} style={{ width: 52, height: 66 }} accessibilityLabel="Foto da carteirinha" />
          </View>
          <View style={{ backgroundColor: C.greenPale, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}>
            <T v="eyebrow" style={{ fontSize: 12.5, color: C.green, fontWeight: '700' }}>{`${vaccines} ${vaccines === 1 ? 'VACINA ENCONTRADA' : 'VACINAS ENCONTRADAS'}`}</T>
          </View>
        </View>

        {live.map((r) => {
          const low = r.confidence < LOW || !r.date;
          const bad = !validDate(r.date);
          const showInput = r.editing || low;
          return (
            <View key={r.key} style={{ minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, borderWidth: 1.5,
              borderColor: low ? '#E3B24D' : C.line, backgroundColor: low ? '#FCF6E8' : C.sheet }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: low ? C.amberPale : C.greenPale, alignItems: 'center', justifyContent: 'center' }}>
                {low ? <CadIcon name="warn" size={18} color={C.amber} /> : <Icon name="check" size={18} color={C.green} sw={3} />}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <T v="xbold" style={{ fontSize: 18, lineHeight: 23 }}>{r.name}</T>
                {showInput ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <TextInput maxFontSizeMultiplier={1.15} value={r.date} onChangeText={(t) => patch(r.key, { date: maskDate(t) })} keyboardType="number-pad" placeholder="DD/MM/AAAA" placeholderTextColor={C.inkFaint}
                      accessibilityLabel={`Data de ${r.name}${low ? ', confira' : ''}`}
                      style={{ width: 150, height: 48, borderRadius: 10, borderWidth: 1.5, borderColor: bad ? C.red : low ? '#D89A1F' : C.line, backgroundColor: '#FFFFFF', fontFamily: F.monoBold, fontSize: 17, color: C.ink, paddingHorizontal: 10 }} />
                    {low ? (
                      <View style={{ backgroundColor: '#F0D488', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}>
                        <T v="eyebrow" style={{ fontSize: 12, color: '#6E4B00', fontWeight: '700' }}>CONFIRA A DATA</T>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <T style={{ fontFamily: F.monoBold, fontSize: 16, color: C.inkSoft }}>{r.date}</T>
                )}
                {r.editing ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Tirar ${r.name} da lista`} onPress={() => patch(r.key, { removed: true })} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
                    <T v="bold" style={{ fontSize: 16, color: C.red, textDecorationLine: 'underline' }}>Tirar da lista</T>
                  </Pressable>
                ) : null}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={r.editing ? `Pronto, ${r.name}` : `Editar ${r.name}`} onPress={() => patch(r.key, { editing: !r.editing })}
                style={{ width: 48, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: low ? '#E3B24D' : C.line, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={r.editing ? 'check' : 'edit'} size={20} color={C.cover} />
              </Pressable>
            </View>
          );
        })}

        {!live.length ? <T v="bold" style={{ fontSize: 16, color: C.inkSoft, textAlign: 'center' }}>Nenhum item na lista. Tire outra foto ou digite à mão.</T> : null}
        {initial.skipped ? <T style={{ fontSize: 16, color: C.inkSoft }}>{`${initial.skipped} ${initial.skipped === 1 ? 'item que não reconhecemos ficou' : 'itens que não reconhecemos ficaram'} de fora.`}</T> : null}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Icon name="info" size={18} color={C.inkSoft} />
          <T v="bold" style={{ flex: 1, fontSize: 16, lineHeight: 21, color: C.inkSoft }}>A IA pode errar. Toque no lápis para corrigir.</T>
        </View>
        <VetNote text="Não é documento oficial. Confirme as datas com o veterinário." />
      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: insets.bottom + 18, gap: 10 }}>
        {live.length && !allOk ? <T v="bold" style={{ fontSize: 16, color: C.red, textAlign: 'center' }}>Confira as datas em âmbar antes de salvar.</T> : null}
        <BigButton label="Está certo, salvar" onPress={save} disabled={!allOk} loading={busy} />
        <BigButton variant="outline" label="Tirar outra foto" onPress={() => router.replace({ pathname: '/carteirinha', params: { origem: cadastro ? 'cadastro' : 'pet' } })} />
      </View>
    </View>
  );
}
