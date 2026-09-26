import React, { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/store/app';
import { T } from '@/components/ui';
import { HomeIcon, type HomeIconName } from '@/art/icons-home';
import { telHref, useVetContact } from '@/components/v11/home/vetContact';
import { C, F } from '@/theme';

/**
 * Emergência (Emergencia). Sem gamificação de propósito.
 * Orientações gerais e conservadoras (sem doses, sem remédios): sempre levam ao veterinário.
 */
const SITUATIONS: { title: string; icon: HomeIconName; steps: string[]; extra?: string[] }[] = [
  {
    title: 'Comeu algo perigoso', icon: 'warning',
    steps: [
      'Afaste o pet do que ele comeu e guarde a embalagem ou um pedaço.',
      'Não provoque vômito e não dê leite, óleo, sal nem remédio sem o veterinário mandar.',
      'Ligue para o veterinário agora e conte o que ele comeu, quanto e a que horas.',
    ],
    extra: ['Chocolate', 'Uva e passa', 'Cebola', 'Alho', 'Xilitol', 'Macadâmia', 'Álcool', 'Café', 'Remédio de gente'],
  },
  {
    title: 'Não consegue respirar direito', icon: 'wind',
    steps: [
      'Mantenha a calma e leve o pet para um lugar arejado e fresco.',
      'Olhe a boca: só tire um objeto se der para pegar com facilidade. Não enfie os dedos às cegas.',
      'Gengiva roxa ou azulada, desmaio ou muito cansaço: vá ao veterinário imediatamente.',
    ],
  },
  {
    title: 'Convulsão', icon: 'bolt',
    steps: [
      'Afaste móveis e objetos para ele não se machucar. Não segure a boca nem coloque a mão.',
      'Deixe o ambiente escuro e em silêncio. Veja quanto tempo dura.',
      'Mais de 5 minutos, ou uma crise atrás da outra: vá ao veterinário agora.',
      'Mesmo que passe rápido, leve ao veterinário depois.',
    ],
  },
  {
    title: 'Machucado ou sangramento', icon: 'drop',
    steps: [
      'Aperte o local com gaze ou pano limpo por alguns minutos.',
      'Não use álcool nem pomada de gente.',
      'Se não parar de sangrar, se o corte for fundo ou for no olho ou na boca, vá ao veterinário.',
    ],
  },
  {
    title: 'Vomitando muito', icon: 'sick',
    steps: [
      'Tire a comida por enquanto e deixe água fresca por perto.',
      'Vômito várias vezes, com sangue, barriga inchada ou o pet muito fraco: vá ao veterinário agora.',
      'Filhotes e pets idosos perdem água rápido. Na dúvida, não espere.',
    ],
  },
];

const MAPS_URL = Platform.select({
  ios: 'http://maps.apple.com/?q=veterin%C3%A1rio%2024%20horas',
  default: 'https://www.google.com/maps/search/?api=1&query=veterin%C3%A1rio%2024%20horas',
});

export default function Emergencia() {
  const insets = useSafeAreaInsets();
  const [vet, saveVet, loaded] = useVetContact();
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const back = () => (router.canGoBack() ? router.back() : router.replace('/inicio'));
  const call = () => {
    if (!vet) return;
    Linking.openURL(telHref(vet.phone)).catch(() => useApp.getState().showToast(`Não consegui ligar. Disque ${vet.phone}.`));
  };
  const near = () => Linking.openURL(MAPS_URL).catch(() => useApp.getState().showToast('Não consegui abrir o mapa.'));
  const startEdit = () => { setName(vet?.name ?? ''); setPhone(vet?.phone ?? ''); setEditing(true); };
  const save = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8) { useApp.getState().showToast('Confira o telefone (com DDD).'); return; }
    await saveVet({ name: name.trim(), phone: phone.trim() });
    setEditing(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* topo */}
        <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={back}
            style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: pressed ? C.paper2 : C.sheet, alignItems: 'center', justifyContent: 'center' })}>
            <HomeIcon name="back" size={22} color={C.cover} sw={2.4} />
          </Pressable>
          <T v="serif" accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34, color: C.cover }}>Emergência</T>
        </View>

        {/* ligar para o veterinário */}
        <View style={{ marginTop: 12, borderRadius: 24, backgroundColor: C.red, padding: 18, paddingTop: 16, gap: 4, shadowColor: C.red, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: 5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <HomeIcon name="heartPulse" size={26} color={C.white} />
            </View>
            <T v="monoBold" style={{ fontSize: 13, letterSpacing: 1, color: C.white }}>SEU VETERINÁRIO</T>
          </View>
          <T v="xbold" style={{ marginTop: 10, fontSize: 22, lineHeight: 28, color: C.white }}>Ligar para o veterinário</T>
          {editing ? (
            <View style={{ gap: 10, marginTop: 8 }}>
              <TextInput maxFontSizeMultiplier={1.15} value={name} onChangeText={setName} placeholder="Nome da clínica (opcional)" placeholderTextColor="#8A7F72" accessibilityLabel="Nome da clínica ou do veterinário"
                style={{ minHeight: 52, borderRadius: 14, backgroundColor: C.white, paddingHorizontal: 14, fontFamily: F.bodyBold, fontSize: 17, color: C.ink }} />
              <TextInput maxFontSizeMultiplier={1.15} value={phone} onChangeText={setPhone} placeholder="Telefone com DDD" placeholderTextColor="#8A7F72" keyboardType="phone-pad" accessibilityLabel="Telefone do veterinário com DDD"
                style={{ minHeight: 52, borderRadius: 14, backgroundColor: C.white, paddingHorizontal: 14, fontFamily: F.bodyBold, fontSize: 17, color: C.ink }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={{ flex: 1, minHeight: 52, borderRadius: 26, borderWidth: 2, borderColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
                  <T v="xbold" style={{ fontSize: 17, color: C.white }}>Cancelar</T>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={save} style={{ flex: 1, minHeight: 52, borderRadius: 26, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
                  <T v="xbold" style={{ fontSize: 17, color: C.red }}>Salvar</T>
                </Pressable>
              </View>
              <T v="bold" style={{ fontSize: 15, color: C.white, opacity: 0.95 }}>Fica salvo neste celular.</T>
            </View>
          ) : vet ? (
            <>
              {vet.name ? <T v="bold" numberOfLines={1} style={{ fontSize: 16, lineHeight: 21, color: C.white }}>{vet.name}</T> : null}
              <T v="bold" numberOfLines={1} style={{ fontSize: 16, lineHeight: 21, color: C.white }}>{vet.phone}</T>
              <Pressable accessibilityRole="button" accessibilityLabel={`Ligar agora para ${vet.name || 'o veterinário'}`} onPress={call}
                style={({ pressed }) => ({ marginTop: 12, minHeight: 56, borderRadius: 28, backgroundColor: pressed ? C.redPale : C.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 })}>
                <HomeIcon name="phone" size={22} color={C.red} sw={2.2} />
                <T v="xbold" style={{ fontSize: 18, color: C.red }}>Ligar agora</T>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Mudar telefone do veterinário" onPress={startEdit} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <T v="bold" style={{ fontSize: 16, color: C.white, textDecorationLine: 'underline' }}>Mudar telefone</T>
              </Pressable>
            </>
          ) : (
            <>
              <T v="bold" style={{ fontSize: 16, lineHeight: 22, color: C.white }}>{loaded ? 'Cadastre o telefone do seu veterinário para ligar com um toque.' : ' '}</T>
              <Pressable accessibilityRole="button" onPress={startEdit}
                style={({ pressed }) => ({ marginTop: 12, minHeight: 56, borderRadius: 28, backgroundColor: pressed ? C.redPale : C.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 12 })}>
                <HomeIcon name="phone" size={22} color={C.red} sw={2.2} />
                <T v="xbold" numberOfLines={2} style={{ flexShrink: 1, fontSize: 18, lineHeight: 23, color: C.red, textAlign: 'center' }}>Cadastrar telefone do veterinário</T>
              </Pressable>
            </>
          )}
        </View>

        {/* veterinário 24h perto de mim */}
        <Pressable accessibilityRole="link" accessibilityLabel="Veterinário 24 horas perto de mim. Abre o mapa" onPress={near}
          style={({ pressed }) => ({ marginTop: 12, minHeight: 56, borderRadius: 28, borderWidth: 2, borderColor: C.cover, backgroundColor: pressed ? C.paper2 : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 12 })}>
          <HomeIcon name="pin" size={22} color={C.cover} sw={2.2} />
          <T v="xbold" numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, fontSize: 17, color: C.cover }}>Veterinário 24h perto de mim</T>
        </Pressable>

        {/* o que aconteceu? */}
        <T v="serif" accessibilityRole="header" style={{ marginTop: 18, fontSize: 22, lineHeight: 28, color: C.cover }}>O que aconteceu?</T>
        <View style={{ marginTop: 8, gap: 6 }}>
          {SITUATIONS.map((s, i) => {
            const on = open === i;
            return (
              <View key={s.title} style={{ borderRadius: 16, backgroundColor: C.sheet, overflow: 'hidden', borderWidth: on ? 2 : 0, borderColor: C.red }}>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: on }} accessibilityLabel={s.title} onPress={() => setOpen(on ? null : i)}
                  style={({ pressed }) => ({ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 10, paddingRight: 14, backgroundColor: pressed ? C.paper2 : 'transparent' })}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F7DCD5', alignItems: 'center', justifyContent: 'center' }}>
                    <HomeIcon name={s.icon} size={22} color="#9E2F20" />
                  </View>
                  <T v="xbold" style={{ flex: 1, fontSize: 17 }}>{s.title}</T>
                  <HomeIcon name={on ? 'up' : 'chevron'} size={20} color={C.inkSoft} sw={2.4} />
                </Pressable>
                {on ? (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
                    {s.steps.map((st, k) => (
                      <View key={k} style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.cover, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                          <T v="xbold" style={{ fontSize: 14, color: C.white }}>{String(k + 1)}</T>
                        </View>
                        <T style={{ flex: 1, fontSize: 17, lineHeight: 24 }}>{st}</T>
                      </View>
                    ))}
                    {s.extra ? (
                      <View style={{ gap: 6 }}>
                        <T v="bold" style={{ fontSize: 16, color: C.inkSoft }}>Perigosos para pets:</T>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {s.extra.map((x) => (
                            <View key={x} style={{ borderWidth: 1.5, borderColor: C.red, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 }}>
                              <T v="bold" style={{ fontSize: 15, color: C.red }}>{x}</T>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                      {vet ? (
                        <Pressable accessibilityRole="button" onPress={call} style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 26, backgroundColor: pressed ? C.coralInk : C.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 })}>
                          <HomeIcon name="phone" size={20} color={C.white} sw={2.2} />
                          <T v="xbold" style={{ fontSize: 17, color: C.white }}>Ligar</T>
                        </Pressable>
                      ) : null}
                      <Pressable accessibilityRole="link" onPress={near} style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 26, borderWidth: 2, borderColor: C.cover, backgroundColor: pressed ? C.paper2 : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 8 })}>
                        <HomeIcon name="pin" size={20} color={C.cover} sw={2.2} />
                        <T v="xbold" numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, fontSize: 17, color: C.cover }}>Vet 24h</T>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* nota */}
        <View accessibilityRole="text" style={{ marginTop: 10, minHeight: 60, borderRadius: 16, backgroundColor: C.amberPale, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <HomeIcon name="info" size={22} color="#7A5204" sw={2.2} />
          <T v="xbold" style={{ flex: 1, fontSize: 16, lineHeight: 21, color: '#7A5204' }}>Em dúvida, procure um veterinário na hora.</T>
        </View>
        <T style={{ marginTop: 10, fontSize: 15, lineHeight: 21, color: C.inkSoft }}>Estas são orientações gerais e não substituem o atendimento do veterinário.</T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
