import React, { useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivePet, useApp } from '@/store/app';
import { Page, PageHeader, VisaSticker } from '@/components/passport';
import { IdPage } from '@/components/IdPage';
import { IconButton, SectionTitle, T } from '@/components/ui';
import { Icon, type IconName } from '@/art/Icon';
import { levelFor, milesTotals, moodFor } from '@/domain/gamification';
import { foodLabel, gramsPerMeal } from '@/domain/catalog';
import { ageYears, today } from '@/domain/dates';
import { pickImage } from '@/services/photos';
import { C } from '@/theme';
import { art } from '@/domain/words';

export default function Perfil() {
  const pet = useActivePet();
  const data = useApp((s) => s.data);
  const profile = useApp((s) => s.profile);
  const [menu, setMenu] = useState(false);
  const insets = useSafeAreaInsets();
  if (!pet) return <Redirect href="/" />;
  const t = today();
  const { total } = milesTotals(data.ledger);
  const lv = levelFor(total);
  const edit = (path: '/emissao/dados' | '/emissao/saude' | '/emissao/cor') => { useApp.getState().startEdit(pet); router.push(path); };
  const age = ageYears(pet.birthDate, t);
  const g = gramsPerMeal(pet);
  const meals = pet.mealsPerDay === null ? 'Não sabe quantas vezes' : `${pet.mealsPerDay ?? pet.mealTimes.length}x por dia`;
  const rows: [string, string][] = [
    ['Idade', `${age} ${age === 1 ? 'ano' : 'anos'}`],
    ['Peso', pet.weightKg ? `${String(pet.weightKg).replace('.', ',')} kg` : 'Não registrado'],
    ['Alergias', pet.allergies || 'Nenhuma'],
    ['Condições', pet.conditions || 'Nenhuma'],
    ['Remédios', pet.meds || 'Nenhum'],
    ['Comida', `${foodLabel(pet.food)} · ${meals}`],
    ['Quantidade', pet.gramsPerDay ? `${pet.gramsPerDay} g por dia${g ? ` (${g} g por refeição)` : ''}` : 'Não informada'],
    ['Horários', pet.mealTimes.join(', ') || '—'],
  ];

  const photo = async (src: 'camera' | 'library') => {
    setMenu(false);
    // iPhone: a galeria/câmera só abre depois que a folha terminar de fechar
    await new Promise((r) => setTimeout(r, Platform.OS === 'ios' ? 700 : 150));
    const p = await pickImage(src, { aspect: [3, 4], folder: 'passaporte' });
    if (p) await useApp.getState().setPetPhoto(p.uri);
  };

  // spec §6: "Compartilhar passaporte" na Econômica (com a cobrança ligada) abre o paywall 8f; senão vai ao dossiê (PDF/envio).
  const share = () => {
    const pw = useApp.getState().paywallFor('compartilhar');
    if (pw) router.push(`/planos?gatilho=${pw}` as never);
    else router.push('/dossie');
  };
  const actions: [IconName, string, string, () => void][] = [
    ['doc', 'Dossiê para o veterinário', 'Um resumo com vacinas, peso, alimentação e observações do diário. Mostre na consulta ou envie em PDF.', () => router.push('/dossie')],
    ['share', 'Compartilhar passaporte', `Mande o passaporte ${art(pet).do} ${pet.name} para a família ou para o veterinário.`, share],
    ['plane', 'Milhas, viagens e loja', 'Veja o saldo, viaje no mapa, vista o avatar e confira o ranking.', () => router.push('/mapa')],
    ['suitcase', 'Vou viajar', `Veja o que ${art(pet).o} ${pet.name} precisa para viajar, o que já tem e o que falta.`, () => router.push('/viagem')],
    ['scale', 'Peso e evolução', 'Registre o peso e acompanhe o gráfico mês a mês.', () => router.push('/peso')],
    ['shield', 'Saúde da raça', 'Problemas comuns na raça e como prevenir.', () => router.push('/raca' as never)],
  ];
  const edits: [IconName, string, string, () => void][] = [
    ['edit', 'Dados do pet', 'Nome, nascimento, sexo, peso e castração.', () => edit('/emissao/dados')],
    ['heart', 'Saúde e alimentação', 'Alergias, remédios, ração, quantidade e horários.', () => edit('/emissao/saude')],
    ['star', 'Raça, porte e jeito', 'Raças que puxou, tamanho e personalidade.', () => { useApp.getState().startEdit(pet); router.push('/emissao/perfil'); }],
    ['paw', 'Avatar desenhado', 'Cor do pelo, manchas, olhos, orelhas e rabo.', () => edit('/emissao/cor')],
  ];

  return (
    <Page seed={16} header={<PageHeader title="Página de identificação" eyebrow={`PATAPORTE ${art(pet).DO} ${pet.name.toUpperCase()}`} right={<IconButton icon="gear" label="Ajustes" onPress={() => router.push('/ajustes')} />} />}>
      <View style={{ gap: 16 }}>
        <IdPage pet={pet} mood={moodFor(data.cares, t)} guardian={profile?.name} stamp="humor" onPhoto={() => setMenu(true)} />
        <T style={{ fontSize: 15, color: C.inkSoft, textAlign: 'center', marginTop: -6 }}>Toque na foto para trocar.</T>
        <VisaSticker level={lv.n} name={lv.name} miles={total} />

        <View style={{ gap: 10 }}>{actions.map(([icon, title, sub, on]) => <ActionRow key={title} icon={icon} title={title} sub={sub} onPress={on} strong />)}</View>

        <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 16, paddingBottom: 6 }}>
          <SectionTitle style={{ marginTop: 12 }}>Ficha de saúde</SectionTitle>
          {rows.map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: C.line }}>
              <T style={{ fontSize: 15, color: C.inkSoft }}>{k}</T>
              <T v="xbold" style={{ fontSize: 15, flexShrink: 1, textAlign: 'right' }}>{v}</T>
            </View>
          ))}
        </View>

        <SectionTitle>Editar</SectionTitle>
        <View style={{ gap: 10 }}>{edits.map(([icon, title, sub, on]) => <ActionRow key={title} icon={icon} title={title} sub={sub} onPress={on} />)}</View>
      </View>

      <Modal visible={menu} transparent animationType="slide" onRequestClose={() => setMenu(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(11,35,40,0.55)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setMenu(false)} accessibilityLabel="Fechar" />
          <View style={{ backgroundColor: C.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 24 + insets.bottom, gap: 10 }}>
            <T v="serif" style={{ fontSize: 24 }}>Foto do passaporte</T>
            <T style={{ fontSize: 14.5, color: C.inkSoft }}>Você pode recortar a foto depois de escolher. Dica: rosto de frente, com boa luz.</T>
            <ActionRow icon="camera" title="Tirar foto agora" sub="Abre a câmera" onPress={() => photo('camera')} />
            <ActionRow icon="image" title="Escolher da galeria" sub="Use uma foto que você já tem" onPress={() => photo('library')} />
            {pet.photoUri ? <ActionRow icon="paw" title="Usar o avatar desenhado" sub="Tira a foto e mostra o desenho" onPress={() => { setMenu(false); useApp.getState().setPetPhoto(null); }} /> : null}
            <ActionRow icon="edit" title="Ajustar o avatar desenhado" sub="Cor, manchas, olhos, orelhas e rabo" onPress={() => { setMenu(false); edit('/emissao/cor'); }} />
          </View>
        </View>
      </Modal>
    </Page>
  );
}

function ActionRow({ icon, title, sub, onPress, strong }: { icon: IconName; title: string; sub: string; onPress: () => void; strong?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: strong ? C.cover : C.sheet, borderWidth: 1, borderColor: strong ? C.cover : C.line, borderRadius: 14, padding: 14, opacity: pressed ? 0.85 : 1 })}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: strong ? 'rgba(221,189,126,0.18)' : C.paper2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={22} color={strong ? C.goldLight : C.cover} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="xbold" style={{ fontSize: 16, color: strong ? C.goldPale : C.ink }}>{title}</T>
        <T style={{ fontSize: 15, lineHeight: 18, color: strong ? 'rgba(243,230,198,0.8)' : C.inkSoft }}>{sub}</T>
      </View>
      <Icon name="chevron" size={18} color={strong ? C.goldLight : C.inkSoft} />
    </Pressable>
  );
}
