import React, { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/store/app';
import { EmissionPage } from '@/components/emission';
import { Button, T } from '@/components/ui';
import { Icon } from '@/art/Icon';
import { breedsFor, type Breed } from '@/domain/catalog';
import { C, F } from '@/theme';

const NICK: Record<string, string> = {
  'Spitz Alemão': 'Lulu da Pomerânia', Dachshund: 'Salsicha ou Teckel', Bernese: 'Boiadeiro Bernês', 'Boiadeiro Australiano': 'Blue Heeler',
  'Fox Paulistinha': 'Terrier Brasileiro', 'Pastor Belga': 'Malinois', Galgo: 'Greyhound', 'Pastor de Shetland': 'Sheltie',
  'Sagrado da Birmânia': 'Birmanês', Bombaim: 'Bombay', 'Exótico': 'Persa de pelo curto', 'West Highland Terrier': 'Westie', Corgi: 'Welsh Corgi',
};

const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Todas as raças, de A a Z (SRD no topo). A busca também acha apelidos: "lulu" → Spitz Alemão. */
export default function Raca() {
  const { species, breed } = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const editing = useApp((s) => s.draft.editingPetId !== null);
  const [q, setQ] = useState('');

  const all = useMemo(() => {
    const b = breedsFor(species);
    const srd = b.find((x) => x.name === 'SRD')!;
    return [srd, ...b.filter((x) => x.name !== 'SRD').sort((a, z) => a.name.localeCompare(z.name, 'pt-BR'))];
  }, [species]);

  const list = useMemo(() => {
    const n = norm(q);
    if (!n) return all;
    return all.filter((x) => norm(x.name).includes(n) || x.aliases?.some((a) => norm(a).includes(n)));
  }, [all, q]);

  const choose = (b: Breed) => setDraft({ breed: b.name, coat: b.coats[0].hex, coatName: b.coats[0].name });
  const custom = () => {
    const name = q.trim().replace(/\s+/g, ' ').replace(/(^|\s)\S/g, (c) => c.toUpperCase());
    if (name.length < 3) return;
    const base = all[0];
    setDraft({ breed: name, coat: base.coats[0].hex, coatName: base.coats[0].name });
    setQ('');
  };

  let letter = '';
  return (
    <EmissionPage step={2} title="Qual é a raça?" onNext={() => (editing ? router.back() : router.push('/emissao/cor'))} nextLabel={editing ? 'Usar esta raça' : 'Continuar'}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: C.inkFaint, borderRadius: 14, paddingHorizontal: 14, minHeight: 58, marginBottom: 8 }}>
        <Icon name="search" size={22} color={C.inkSoft} />
        <TextInput maxFontSizeMultiplier={1.15} value={q} onChangeText={setQ} placeholder="Buscar pelo nome" placeholderTextColor={C.inkFaint} accessibilityLabel="Buscar raça" autoCorrect={false}
          style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 18, color: C.ink, minHeight: 54 }} />
        {q ? <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" onPress={() => setQ('')} hitSlop={10}><Icon name="close" size={20} color={C.inkSoft} /></Pressable> : null}
      </View>
      <T style={{ fontSize: 15, color: C.inkSoft, marginBottom: 12 }}>{q ? `${list.length} ${list.length === 1 ? 'raça encontrada' : 'raças encontradas'}` : `Arraste para ver todas (${all.length}). Não sabe? Escolha SRD.`}</T>

      {breed ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 16, borderRadius: 14, borderWidth: 2, borderColor: C.green, backgroundColor: C.greenPale, marginBottom: 12 }}>
          <Icon name="check" size={22} color={C.green} sw={3} />
          <View style={{ flex: 1 }}>
            <T style={{ fontSize: 14.5, color: C.green }}>Escolhida</T>
            <T v="xbold" style={{ fontSize: 18 }}>{breed === 'SRD' ? 'SRD (sem raça definida)' : breed}</T>
          </View>
        </View>
      ) : null}

      <View style={{ borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.sheet, overflow: 'hidden' }}>
        {list.map((b, i) => {
          const on = b.name === breed;
          const first = b.name === 'SRD' ? '' : norm(b.name)[0].toUpperCase();
          const header = !q && first && first !== letter ? (letter = first) : null;
          return (
            <React.Fragment key={b.name}>
              {header ? <T v="xbold" style={{ fontSize: 15, color: C.inkSoft, backgroundColor: C.paper2, paddingHorizontal: 16, paddingVertical: 6 }}>{header}</T> : null}
              <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={b.name === 'SRD' ? 'SRD, sem raça definida' : b.name} onPress={() => choose(b)}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: i && !header ? 1 : 0, borderColor: C.line, backgroundColor: on ? C.greenPale : pressed ? C.paper2 : 'transparent' })}>
                <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, borderColor: on ? C.green : C.inkFaint, backgroundColor: on ? C.green : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                  {on ? <Icon name="check" size={16} color="#fff" sw={3} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <T v={on ? 'xbold' : 'bold'} style={{ fontSize: 18 }}>{b.name === 'SRD' ? 'SRD (sem raça definida)' : b.name}</T>
                  {b.name === 'SRD' ? <T style={{ fontSize: 15, color: C.inkSoft }}>Vira-lata ou mistura</T>
                    : NICK[b.name] ? <T style={{ fontSize: 15, color: C.inkSoft }} numberOfLines={1}>{`Também chamado de ${NICK[b.name]}`}</T> : null}
                </View>
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>

      {q.trim().length >= 3 && !list.some((b) => norm(b.name) === norm(q)) ? (
        <View style={{ marginTop: 14, gap: 8 }}>
          <T style={{ fontSize: 16, color: C.inkSoft }}>{list.length ? 'Não é nenhuma dessas?' : 'Não achamos essa raça na lista.'}</T>
          <Button label={`Usar “${q.trim()}”`} variant="secondary" onPress={custom} />
        </View>
      ) : null}
    </EmissionPage>
  );
}
