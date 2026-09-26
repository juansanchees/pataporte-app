import React from 'react';
import { View } from 'react-native';
import { Page, PageHeader } from '@/components/passport';
import { T } from '@/components/ui';
import { C } from '@/theme';

const SECTIONS: [string, string[]][] = [
  ['O que é o Pataporte', [
    'Um app para organizar a vida do seu pet: vacinas, rotina, peso, diário e viagens.',
    'O passaporte do app NÃO é um documento oficial. Para viajar, o documento válido é o do Ministério da Agricultura (MAPA) e os atestados do veterinário.',
    'O Guia IA dá orientações gerais. Ele não substitui o veterinário. Em emergência, procure atendimento na hora.',
  ]],
  ['Quais dados guardamos', [
    'Seu nome e e-mail, para entrar na conta.',
    'Os dados dos seus pets que você mesmo escreve: nome, raça, nascimento, peso, saúde, vacinas, rotina, diário e viagens.',
    'As fotos do pet ficam no seu celular e ganham uma cópia de segurança na sua conta, na nuvem (só você acessa). Assim você não perde nada ao trocar de celular.',
  ]],
  ['Inteligência artificial', [
    'Quando você usa a leitura da foto ou o Guia IA, a foto, o áudio ou a pergunta vão para a IA do Google (Gemini) — ou da OpenAI, se a do Google estiver fora do ar — só para gerar a resposta.',
    'Junto vai um resumo do pet (raça, idade, peso, cuidados) para a resposta ser certeira. Não enviamos seu nome nem seu e-mail.',
    'Antes do primeiro uso, o app pede a sua permissão. Usamos os planos pagos desses serviços, que não usam seus dados para treinar a IA.',
  ]],
  ['Seus direitos (LGPD)', [
    'Você pode ver, corrigir e apagar os dados a qualquer momento dentro do app.',
    'Em Ajustes → "Excluir minha conta" você apaga a conta e todos os passaportes de uma vez.',
    'Não vendemos seus dados e não mostramos anúncios.',
  ]],
];

export default function Termos() {
  return (
    <Page seed={9} header={<PageHeader title="Termos e privacidade" />}>
      <View style={{ gap: 18 }}>
        {SECTIONS.map(([title, items]) => (
          <View key={title} style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, gap: 10 }}>
            <T v="xbold" style={{ fontSize: 19 }}>{title}</T>
            {items.map((x) => (
              <View key={x} style={{ flexDirection: 'row', gap: 10 }}>
                <T v="xbold" style={{ fontSize: 17, color: C.cover }}>•</T>
                <T style={{ flex: 1, fontSize: 16.5, lineHeight: 24 }}>{x}</T>
              </View>
            ))}
          </View>
        ))}
        <T style={{ fontSize: 15, color: C.inkSoft, textAlign: 'center' }}>Versão completa: pataporte-app.web.app/privacidade · Última atualização: setembro de 2026.</T>
      </View>
    </Page>
  );
}
