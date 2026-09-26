import React, { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useActivePet, useApp } from '@/store/app';
import { backend } from '@/data';
import { Page, PageHeader } from '@/components/passport';
import { Button, ChipRow, InfoNote, SectionTitle, T } from '@/components/ui';
import { Icon, type IconName } from '@/art/Icon';
import { FAMILY_PLAN, PAID_PLANS, PLANS, trialDaysLeft } from '@/domain/commerce';
import { purchasesMode, restore } from '@/services/purchases';
import { track } from '@/services/analytics';
import { CityField } from '@/components/v11/premium/common';
import { C } from '@/theme';
import { art } from '@/domain/words';
import { aiEnabled, aiErrorText, testAi } from '@/services/ai';
import { confirmAsk } from '@/services/confirm';

function Row({ icon, label, value, onPress, right }: { icon: IconName; label: string; value?: string; onPress?: () => void; right?: React.ReactNode }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: C.line }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.paper2, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={18} color={C.cover} /></View>
      <T v="bold" style={{ flex: 1 }}>{label}</T>
      {value ? <T v="mono" style={{ fontSize: 13, color: C.inkSoft, textTransform: 'uppercase' }}>{value}</T> : null}
      {right ?? (onPress ? <Icon name="chevron" size={16} color={C.inkSoft} /> : null)}
    </Pressable>
  );
}

export default function Ajustes() {
  const profile = useApp((s) => s.profile);
  const user = useApp((s) => s.user);
  const on = useApp((s) => s.notificationsOn);
  const pet = useActivePet();
  const effPlan = useApp((s) => s.plan());
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  if (!profile) return null;
  const plan = PLANS.find((p) => p.id === effPlan)!;
  const days = trialDaysLeft(profile);
  // Com PAID_PLANS = false tudo é liberado: a área de classe só aparece para testes (__DEV__).
  const showPlans = PAID_PLANS || __DEV__;
  const planValue = effPlan === 'economica' ? 'Econômica' : days > 0 ? `Teste · ${days} ${days === 1 ? 'dia' : 'dias'}` : 'Primeira';
  const hours = ['07:00', '09:00', '12:00', '19:00'];
  const hourLabel = `${String(profile.notifyHour).padStart(2, '0')}:00`;

  const logout = async () => {
    if (!(await confirmAsk('Sair da conta?', 'Seus dados continuam salvos na sua conta.', 'Sair', true))) return;
    await useApp.getState().signOut(); router.replace('/');
  };
  const removePet = async () => {
    if (!pet) return;
    if (!(await confirmAsk(`Excluir o passaporte ${art(pet).do} ${pet.name}?`, 'Isso apaga vacinas, carimbos, milhas, pesagens, diário e conversas desse pet. Não dá para desfazer.', 'Excluir', true))) return;
    try { await useApp.getState().deleteActivePet(); router.replace('/'); } catch { useApp.getState().showToast('Não foi possível excluir agora. Tente de novo.'); }
  };

  const deleteAccount = async () => {
    if (!(await confirmAsk('Excluir a sua conta?', 'Apaga a sua conta e todos os passaportes, vacinas, fotos do diário e conversas. Não dá para desfazer.', 'Excluir tudo', true))) return;
    try {
      const r = await useApp.getState().deleteAccount();
      if (r === 'relogin') { useApp.getState().showToast('Por segurança, saia e entre de novo na conta. Depois tente excluir outra vez.'); return; }
      router.replace('/');
    } catch { useApp.getState().showToast('Não foi possível excluir agora. Verifique a internet.'); }
  };

  const restoreNow = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const r = await restore();
      track('restaurar_compra', { gatilho: 'ajustes', ok: r.ok });
      if (r.ok) { if (purchasesMode() === 'real') await useApp.getState().applyStorePurchase({ isTrial: r.isTrial, expiresAt: r.expiresAt }); else await useApp.getState().setPlan('primeira'); useApp.getState().showToast('Compra restaurada. Boa viagem na Primeira Classe!'); }
      else useApp.getState().showToast('Não encontramos uma compra nesta conta da loja.');
    } finally { setRestoring(false); }
  };

  const runTest = async () => {
    if (!aiEnabled()) { setAiMsg('Sem chave: crie o arquivo .env com EXPO_PUBLIC_GEMINI_API_KEY e rode npx expo start -c.'); return; }
    setAiMsg('Testando…');
    try { setAiMsg(await testAi()); } catch (e) { setAiMsg(`Falhou: ${aiErrorText(e, true)}`); }
  };

  return (
    <Page seed={25} header={<PageHeader title="Ajustes" eyebrow="PASSAPORTE E CONTA" />}>
      <View style={{ gap: 14 }}>
        {showPlans && <>
        <View style={{ flexDirection: 'row', backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 14 }}>
          <View style={{ flex: 1, padding: 14 }}>
            <T v="label" style={{ fontSize: 13 }}>SUA CLASSE</T>
            <T v="serif" style={{ fontSize: 24 }}>{plan.name}</T>
            <T style={{ fontSize: 14, color: C.inkSoft }}>{plan.features.slice(0, 2).join(' · ')}</T>
          </View>
          <View style={{ width: 98, borderLeftWidth: 2, borderStyle: 'dashed', borderLeftColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
            <T v="label" style={{ fontSize: 13 }}>ASSENTO</T><T v="monoBold" style={{ fontSize: 20 }}>{plan.seat}</T>
          </View>
        </View>
        <Button label={effPlan === 'economica' ? 'Conhecer a Primeira Classe' : 'Ver minha classe'} icon="crown" variant="premium" onPress={() => router.push('/planos')} />
        </>}

        <View>
          <SectionTitle>Conta</SectionTitle>
          <Row icon="user" label={profile.name} value={user?.email} />
          {showPlans && <Row icon="crown" label="Minha classe" value={planValue} onPress={() => router.push('/planos')} />}
          {showPlans && <Row icon="ticket" label={restoring ? 'Restaurando…' : 'Restaurar compra'} onPress={restoreNow} />}
          <CityField style={{ paddingVertical: 12, borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: C.line }} />
          <Row icon="bell" label="Chamadas de embarque" right={<Switch value={on} onValueChange={(v) => useApp.getState().setNotifications(v)} trackColor={{ true: C.cover, false: C.paper3 }} thumbColor={C.goldPale} accessibilityLabel="Ativar chamadas de embarque" />} />
          <View style={{ paddingVertical: 12 }}>
            <T v="label" style={{ marginBottom: 8 }}>HORÁRIO DAS CHAMADAS</T>
            <ChipRow options={hours} value={hourLabel} onChange={(h) => useApp.getState().setNotifications(true, Number(h.slice(0, 2)))} />
          </View>
          {pet && <Row icon="doc" label="Dossiê para o veterinário" onPress={() => router.push('/dossie')} />}
          {PAID_PLANS && FAMILY_PLAN && <Row icon="user" label="Tutores do passaporte" value={profile.plan === 'familia' ? 'Em breve' : 'Família'} onPress={() => router.push('/planos')} />}
        </View>

        <View>
          <SectionTitle>Privacidade e ajuda</SectionTitle>
          <Row icon="shield" label="Onde ficam meus dados" value={backend().mode === 'firebase' ? 'Nuvem' : 'Este celular'} />
          {__DEV__ && <Row icon="chat" label="Testar a IA (Gemini)" value={aiEnabled() ? 'Chave ok' : 'Sem chave'} onPress={runTest} />}
          {aiMsg ? <T v="bold" style={{ fontSize: 14, color: aiMsg.startsWith('Tudo certo') ? C.green : C.red, paddingVertical: 8 }}>{aiMsg}</T> : null}
          <Row icon="doc" label="Termos de uso e privacidade" onPress={() => router.push('/termos' as never)} />
          {pet && <Row icon="trash" label={`Excluir passaporte ${art(pet).do} ${pet.name}`} onPress={removePet} />}
          <Row icon="trash" label="Excluir minha conta" onPress={deleteAccount} />
        </View>
        {__DEV__ && backend().mode === 'local' && <InfoNote tone="gold" text="Modo de teste: tudo fica só neste aparelho. Siga a seção Firebase do COMO-USAR.md para salvar na nuvem." />}
        <Button label="Sair da conta" icon="logout" variant="ghost" onPress={logout} />
        <T v="mono" style={{ fontSize: 13, letterSpacing: 1.2, color: C.inkSoft, textAlign: 'center' }}>PATAPORTE · VERSÃO 1.0.0</T>
      </View>
    </Page>
  );
}
