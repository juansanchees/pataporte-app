import React, { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Page, PageHeader } from '@/components/passport';
import { Button, SectionTitle, T } from '@/components/ui';
import { Icon, type IconName } from '@/art/Icon';
import { C } from '@/theme';

/**
 * Embaixada 24h. Sem gamificação de propósito.
 * Textos de primeiros socorros são orientações gerais e conservadoras: sempre levam ao veterinário.
 */
const AID: { title: string; icon: IconName; steps: string[] }[] = [
  { title: 'Engasgo', icon: 'help', steps: ['Mantenha a calma e segure o pet com firmeza.', 'Abra a boca com cuidado e veja se o objeto está visível. Só retire se conseguir pegar com facilidade.', 'Não empurre o objeto para dentro nem enfie os dedos às cegas.', 'Se ele não conseguir respirar ou a gengiva ficar azulada, vá ao veterinário imediatamente.'] },
  { title: 'Corte ou sangramento', icon: 'heart', steps: ['Pressione o local com gaze ou pano limpo por alguns minutos.', 'Não use álcool nem pomadas humanas.', 'Se o sangramento não parar, o corte for fundo ou em olho/boca, procure o veterinário.'] },
  { title: 'Calor excessivo', icon: 'info', steps: ['Leve o pet para a sombra ou lugar ventilado.', 'Molhe patas, barriga e pescoço com água fresca (não gelada).', 'Ofereça água aos poucos.', 'Ofegância intensa, vômito ou fraqueza: veterinário com urgência.'] },
  { title: 'Envenenamento', icon: 'shield', steps: ['Afaste o pet da substância e guarde a embalagem ou uma amostra.', 'Não induza vômito e não dê leite, óleo ou remédios sem orientação.', 'Ligue para o veterinário ou vá a uma clínica 24h agora.'] },
];

const TOXIC = ['Chocolate', 'Uva e passa', 'Cebola', 'Alho', 'Xilitol', 'Macadâmia', 'Álcool', 'Café'];

export default function Sos() {
  const [open, setOpen] = useState<number | null>(null);
  const searchMaps = () => Linking.openURL('https://www.google.com/maps/search/?api=1&query=veterin%C3%A1rio%2024%20horas').catch(() => {});
  return (
    <Page seed={23} tone={C.red} watermark={false} header={<PageHeader title="Emergência" eyebrow="EMBAIXADA 24H" color={C.red} />}>
      <View style={{ gap: 14 }}>
        <Button label="Achar clínica 24h perto de mim" icon="pin" variant="danger" onPress={searchMaps} style={{ minHeight: 64 }} />
        <T style={{ fontSize: 14, color: C.inkSoft }}>Abre o mapa com as clínicas veterinárias 24h mais próximas, com telefone e rota.</T>
        <SectionTitle>Primeiros socorros</SectionTitle>
        {AID.map((a, i) => (
          <Pressable key={a.title} accessibilityRole="button" accessibilityState={{ expanded: open === i }} onPress={() => setOpen(open === i ? null : i)}
            style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: open === i ? C.red : C.line, borderRadius: 14, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name={a.icon} size={22} color={C.red} />
              <T v="xbold" style={{ flex: 1 }}>{a.title}</T>
              <Icon name="chevron" size={16} color={C.inkSoft} />
            </View>
            {open === i && <View style={{ marginTop: 10, gap: 6 }}>{a.steps.map((s, k) => <T key={k} style={{ fontSize: 14 }}>{`${k + 1}. ${s}`}</T>)}</View>}
          </Pressable>
        ))}
        <SectionTitle>Nunca oferecer</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {TOXIC.map((t) => <View key={t} style={{ borderWidth: 1.5, borderColor: C.red, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 }}><T v="monoBold" style={{ fontSize: 13, color: C.red, textTransform: 'uppercase' }}>{t}</T></View>)}
        </View>
        <T style={{ fontSize: 14, color: C.inkSoft }}>Em dúvida, ligue para o veterinário antes de agir. Aqui não tem milha: o foco é o seu pet.</T>
      </View>
    </Page>
  );
}
