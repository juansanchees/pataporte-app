import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { appleAvailable, googleAvailable } from '@/services/socialAuth';
import { router } from 'expo-router';
import { useApp } from '@/store/app';
import { authErrorMessage, backend } from '@/data';
import { Page } from '@/components/passport';
import { Button, Field, InfoNote, T } from '@/components/ui';
import { Emblem, Leather } from '@/art/patterns';
import { C, F } from '@/theme';
import { Icon } from '@/art/Icon';

/** "G" colorido do Google (marca oficial, usada no botão de login como pede o guia do Google). */
function GoogleG({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

export default function Login() {
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signUp, resetPassword } = useApp.getState();
  const local = backend().mode === 'local';
  const showGoogle = !local && googleAvailable();
  const [showApple, setShowApple] = useState(false);
  const [socialBusy, setSocialBusy] = useState<'google' | 'apple' | null>(null);
  useEffect(() => { if (!local) appleAvailable().then(setShowApple); }, [local]);

  const social = async (p: 'google' | 'apple') => {
    setError('');
    setSocialBusy(p);
    try {
      const r = await useApp.getState().signInWith(p);
      if (r === 'ok') goNext();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setSocialBusy(null);
    }
  };

  const goNext = () => {
    // wait for auth listener to load profile/pets
    const tick = () => {
      const s = useApp.getState();
      if (!s.user || !s.booted) return setTimeout(tick, 120);
      if (s.loadError) return router.replace('/');
      if (s.pets.length === 0) { s.startNewPassport(); router.replace('/emissao/foto'); } else router.replace('/inicio');
    };
    tick();
  };

  const submit = async () => {
    setError('');
    if (mode === 'criar' && name.trim().length < 2) return setError('Escreva o seu nome.');
    if (!email.trim() || !pw) return setError('Preencha e-mail e senha.');
    setBusy(true);
    try {
      if (mode === 'criar') await signUp(name, email, pw);
      else await signIn(email, pw);
      goNext();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) return setError('Digite seu e-mail acima para receber o link.');
    try {
      await resetPassword(email);
      Alert.alert('Pronto', 'Enviamos um link para redefinir a senha no seu e-mail.');
    } catch (e) {
      setError(local ? 'No modo de teste não há recuperação de senha.' : authErrorMessage(e));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Page seed={3} contentStyle={{ paddingTop: 30 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <View style={{ width: 62, height: 78, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            <Leather w={62} h={78} radius={8} />
            <Emblem size={48} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="eyebrow">POSTO DE EMISSÃO</T>
            <T v="serif" style={{ fontSize: 30, lineHeight: 33 }}>{mode === 'entrar' ? 'Bem-vindo a bordo' : 'Criar sua conta'}</T>
          </View>
        </View>
        <T style={{ color: C.inkSoft, marginBottom: 18 }}>
          {mode === 'entrar' ? 'Entre para abrir o Pataporte do seu pet.' : 'Crie a conta do tutor para emitir o Pataporte e começar a juntar carimbos.'}
        </T>
        {local && __DEV__ && <View style={{ marginBottom: 16 }}><InfoNote tone="gold" icon="info" text="Modo de teste: os dados ficam só neste aparelho. Configure o Firebase para salvar na nuvem." /></View>}

        {showGoogle || showApple ? (
          <View style={{ gap: 10, marginBottom: 18 }}>
            {showApple ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Continuar com Apple" onPress={() => social('apple')} disabled={!!socialBusy}
                style={({ pressed }) => ({ minHeight: 56, borderRadius: 14, backgroundColor: '#000', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: pressed ? 0.85 : 1 })}>
                {socialBusy === 'apple' ? <ActivityIndicator color="#fff" /> : <T style={{ color: '#fff', fontSize: 22, lineHeight: 26 }}>{'\uF8FF'}</T>}
                <T v="xbold" style={{ color: '#fff', fontSize: 17 }}>Continuar com Apple</T>
              </Pressable>
            ) : null}
            {showGoogle ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Continuar com Google" onPress={() => social('google')} disabled={!!socialBusy}
                style={({ pressed }) => ({ minHeight: 56, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#DADCE0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: pressed ? 0.85 : 1 })}>
                {socialBusy === 'google' ? <ActivityIndicator color={C.ink} /> : <GoogleG />}
                <T style={{ fontFamily: F.bodyXBold, color: '#1F1F1F', fontSize: 17 }}>Continuar com Google</T>
              </Pressable>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
              <T style={{ fontSize: 15, color: C.inkSoft }}>ou com e-mail</T>
              <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
            </View>
          </View>
        ) : null}

        {mode === 'criar' && <Field pt="Seu nome" en="Name" value={name} onChangeText={setName} placeholder="Como quer ser chamado" autoCapitalize="words" />}
        <Field pt="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" inputStyle={{ textTransform: 'none' }} />
        <Field pt="Senha" en="Password" value={pw} onChangeText={setPw} placeholder="Mínimo 6 caracteres" secureTextEntry autoComplete={mode === 'criar' ? 'new-password' : 'password'} inputStyle={{ textTransform: 'none' }} />
        {error ? <View style={{ marginBottom: 12 }}><InfoNote tone="red" text={error} /></View> : null}
        <Button label={mode === 'entrar' ? 'Entrar' : 'Criar conta e emitir'} onPress={submit} loading={busy} />
        <Button label={mode === 'entrar' ? 'Ainda não tenho conta · Criar agora' : 'Já tenho conta · Entrar'} variant="ghost" onPress={() => { setMode(mode === 'entrar' ? 'criar' : 'entrar'); setError(''); }} style={{ marginTop: 6 }} />
        {mode === 'entrar' && <Button label="Esqueci a senha" variant="ghost" small onPress={forgot} style={{ alignSelf: 'center' }} />}
        <T style={{ fontSize: 13, color: C.inkSoft, textAlign: 'center', marginTop: 14 }}>
          Ao continuar você aceita os Termos de Uso e a Política de Privacidade (LGPD).
        </T>
      </Page>
    </KeyboardAvoidingView>
  );
}
