import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/store/app';
import { Page, PageHeader } from '@/components/passport';
import { Button, InfoNote, T } from '@/components/ui';
import { Icon } from '@/art/Icon';
import { PAID_PLANS, PLANS, SHOWN_PLANS } from '@/domain/commerce';
import type { Plan } from '@/domain/types';
import { C } from '@/theme';
import { confirmAsk } from '@/services/confirm';

export default function Planos() {
  if (!PAID_PLANS) return <Redirect href="/inicio" />;
  return <PlanosPagos />;
}

function PlanosPagos() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const current = useApp((s) => s.profile?.plan ?? 'economica');
  const setPlan = useApp((s) => s.setPlan);
  const [sel, setSel] = React.useState<Plan>(current === 'economica' ? 'primeira' : current);

  const close = () => (from === 'emissao' ? router.replace('/inicio') : router.canGoBack() ? router.back() : router.replace('/inicio'));

  const confirm = () => {
    if (sel === current) return close();
    const name = PLANS.find((p) => p.id === sel)!.name;
    confirmAsk('Pagamento simulado', `Esta versão de teste ainda não cobra. A classe muda para ${name} para você testar os recursos. A cobrança real entra com a publicação nas lojas.`, 'Trocar de classe').then(async (ok) => {
      if (!ok) return;
      await setPlan(sel); useApp.getState().showToast(`Bem-vindo à ${name}!`); close();
    });
  };

  return (
    <Page seed={13}
      header={<PageHeader title="Escolha sua classe" eyebrow="UPGRADE DE CLASSE" back={from !== 'emissao'} right={<Icon name="crown" size={26} color={C.goldDark} />} />}
      footer={
        <>
          <Button label={sel === 'economica' ? 'Seguir na Econômica' : `Embarcar na ${PLANS.find((p) => p.id === sel)!.name}`} icon={sel === 'economica' ? undefined : 'crown'} variant={sel === 'economica' ? 'primary' : 'premium'} onPress={confirm} />
          {from === 'emissao' && <Button label="Seguir na Econômica (grátis)" variant="ghost" onPress={close} />}
        </>
      }>
      <View style={{ gap: 16, paddingTop: 8 }}>
        {SHOWN_PLANS.map((p) => {
          const on = sel === p.id;
          const gold = p.id === 'primeira';
          return (
            <Pressable key={p.id} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${p.name}, ${p.price}${p.cents} ${p.per}`} onPress={() => setSel(p.id)}
              style={{ borderRadius: 16, borderWidth: on ? 2.5 : 1.5, borderStyle: p.id === 'economica' && !on ? 'dashed' : 'solid', borderColor: on ? (gold ? C.goldDark : C.cover) : C.line, backgroundColor: gold ? C.goldPale : C.sheet, padding: 16, paddingTop: gold ? 20 : 16, gap: 10 }}>
              {gold && <View style={{ position: 'absolute', top: -12, left: 16, backgroundColor: C.goldDark, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}><T v="monoBold" style={{ color: '#fff', fontSize: 13, letterSpacing: 1.2 }}>MAIS ESCOLHIDA</T></View>}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? (gold ? C.goldDark : C.cover) : C.inkFaint, alignItems: 'center', justifyContent: 'center' }}>
                  {on && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: gold ? C.goldDark : C.cover }} />}
                </View>
                <View style={{ flex: 1 }}>
                  <T v="label" style={{ fontSize: 13 }} numberOfLines={1}>{`ASSENTO ${p.seat}${current === p.id ? ' · SUA CLASSE' : ''}`}</T>
                  <T v="serif" style={{ fontSize: 22, lineHeight: 26 }} numberOfLines={1} adjustsFontSizeToFit>{p.name}</T>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingLeft: 34 }}>
                <T v="serif" style={{ fontSize: 30, lineHeight: 34 }} numberOfLines={1}>{p.price}{p.cents ? <T v="serif" style={{ fontSize: 18 }}>{p.cents}</T> : null}</T>
                <T style={{ fontSize: 14, color: C.inkSoft, marginLeft: 4, marginBottom: 4 }}>{p.per}</T>
              </View>
              {p.yearly ? <T v="bold" style={{ fontSize: 15, color: C.green, paddingLeft: 34 }}>{p.yearly}</T> : null}
              <T v="bold" style={{ fontSize: 14.5, color: C.inkSoft, paddingLeft: 34 }}>{p.pitch}</T>
              <View style={{ paddingLeft: 34, gap: 6 }}>
                {p.features.map((f) => (
                  <View key={f} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <View style={{ marginTop: 2 }}><Icon name="check" size={16} color={C.green} sw={2.8} /></View>
                    <T style={{ fontSize: 15, lineHeight: 20, flex: 1 }}>{f}</T>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })}
        <InfoNote tone="gold" text="Versão de teste: nenhum valor é cobrado. A troca de classe é simulada para você testar tudo." />
      </View>
    </Page>
  );
}
