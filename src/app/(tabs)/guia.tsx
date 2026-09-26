import React, { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioQuality, IOSOutputFormat, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, type RecordingOptions } from 'expo-audio';
import { useActivePet, useApp } from '@/store/app';
import { Chip, IconButton, T } from '@/components/ui';
import { Microline } from '@/components/passport';
import { RectStamp } from '@/art/Stamp';
import { Emblem, Leather, PageDecor } from '@/art/patterns';
import { Icon } from '@/art/Icon';
import { askPhoto, resolvePhotoUri } from '@/services/photos';
import { aiEnabled, ensureAiConsent } from '@/services/ai';
import { GUIDE_DISCLAIMER } from '@/domain/guide';
import { PAID_PLANS, limitsFor } from '@/domain/commerce';
import { risksFor } from '@/domain/breeds';
import { ageYears, localMonth, today } from '@/domain/dates';
import type { PaywallTriggerId, UrgencyLevel } from '@/domain/types';
import { C, F } from '@/theme';
import { art } from '@/domain/words';

const LEVEL: Record<UrgencyLevel, { color: string; label: string }> = {
  verde: { color: C.green, label: 'NÍVEL VERDE' },
  amarelo: { color: C.amber, label: 'NÍVEL AMARELO' },
  vermelho: { color: C.red, label: 'NÍVEL VERMELHO' },
};

/** Gravação leve (voz): AAC no Android, WAV no iPhone — formatos que o Gemini entende. */
const VOICE: RecordingOptions = {
  extension: '.aac',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  android: { extension: '.aac', outputFormat: 'aac_adts', audioEncoder: 'aac' },
  ios: { extension: '.wav', outputFormat: IOSOutputFormat.LINEARPCM, audioQuality: AudioQuality.MEDIUM, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
  web: { mimeType: 'audio/webm' },
};
const VOICE_MIME = Platform.OS === 'ios' ? 'audio/wav' : Platform.OS === 'android' ? 'audio/aac' : 'audio/webm';

/** Três pontinhos pulando enquanto a IA responde. */
function Thinking() {
  const [n, setN] = useState(0);
  useEffect(() => { const i = setInterval(() => setN((x) => (x + 1) % 4), 380); return () => clearInterval(i); }, []);
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12 }}>
      <T v="bold" style={{ fontSize: 16, color: C.aquaInk }}>{`O Guia está escrevendo${'.'.repeat(n)}`}</T>
    </View>
  );
}

export default function Guia() {
  const pet = useActivePet();
  const chat = useApp((s) => s.data.chat);
  const plan = useApp((s) => s.plan());
  const { q } = useLocalSearchParams<{ q?: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [text, setText] = useState(q ?? '');
  // ?q= (atalho de outra tela) preenche a pergunta; ajuste durante o render em vez de efeito
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) { setLastQ(q); if (q) setText(q); }
  const [photo, setPhoto] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(0);
  const [pending, setPending] = useState<{ text: string; photo?: string; voice?: boolean } | null>(null);
  const [failed, setFailed] = useState<{ why: string; retry: () => void } | null>(null);
  const recorder = useAudioRecorder(VOICE);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80); }, [chat.length, busy]);
  useEffect(() => {
    if (!rec) return;
    const i = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [rec]);
  useEffect(() => () => { try { if (recorder.isRecording) recorder.stop(); } catch { /* ok */ } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (failed || pending) setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80); }, [failed, pending]);

  if (!pet) return null;
  const month = localMonth();
  const used = chat.filter((m) => m.from === 'user' && localMonth(m.at) === month).length;
  const limit = limitsFor(plan).guideMonthly;
  const risks = risksFor(pet);
  const suggestions = [...risks.slice(0, 3).map((r) => r.question), `Quanto de ração ${art(pet).o} ${pet.name} deve comer?`, 'Quais sinais são de emergência?'];
  const age = ageYears(pet.birthDate, today());

  /** Paywall da Primeira Classe (spec §6): 4ª pergunta do mês (8c) ou foto/voz na Econômica (8d). */
  const openPaywall = (g: PaywallTriggerId) => router.push(`/planos?gatilho=${g}` as never);
  /** Antes de mandar: com a cobrança ligada, a Econômica para na 4ª pergunta do mês ou ao anexar foto. */
  const gate = (withMedia: boolean): boolean => {
    const st = useApp.getState();
    const pw = st.paywallFor('ia_4a_pergunta') ?? (withMedia ? st.paywallFor('ia_foto') : null);
    if (pw) { openPaywall(pw); return false; }
    return true;
  };

  const handle = (r: { status: 'ok' | 'limit' | 'noai' | 'error'; why?: string; paywall?: PaywallTriggerId }, retry: () => void) => {
    if (r.status === 'limit') {
      if (r.paywall) openPaywall(r.paywall);
      else useApp.getState().showToast(`Você usou as ${limit} perguntas deste mês. Elas voltam no dia 1º.`);
    }
    if (r.status === 'noai') useApp.getState().showToast('A resposta por voz precisa da IA ligada.');
    if (r.status === 'error') setFailed({ why: r.why ?? 'tente de novo', retry });
  };

  const send = async (override?: string, att?: string) => {
    const msg = (override ?? text).trim();
    const pic = att ?? photo;
    if ((!msg && !pic) || busy) return;
    if (!gate(!!pic)) return;
    if (aiEnabled() && !(await ensureAiConsent())) return;
    setFailed(null);
    setBusy(true);
    setPending({ text: msg || 'Olha essa foto, está tudo bem?', photo: pic });
    setText(''); setPhoto(undefined);
    const r = await useApp.getState().ask(msg || 'Olha essa foto, está tudo bem?', pic);
    setBusy(false);
    setPending(null);
    if (r.status !== 'ok') { setText(msg); setPhoto(pic); }
    handle(r, () => send(msg, pic));
  };

  const startRec = async () => {
    if (!aiEnabled()) return useApp.getState().showToast('Para falar com o Guia por voz, a IA precisa estar ligada.');
    if (!gate(true)) return;
    try {
      if (!(await ensureAiConsent())) return;
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) return useApp.getState().showToast('Libere o microfone nas configurações do celular.');
      setFailed(null);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setSecs(0);
      setRec(true);
    } catch (e) {
      setRec(false);
      useApp.getState().showToast(`Não consegui abrir o microfone: ${String(e).slice(0, 80)}`);
    }
  };

  const stopRec = async (sendIt: boolean) => {
    let dur = secs;
    try {
      dur = Math.max(secs, (recorder.getStatus().durationMillis ?? 0) / 1000);
      await recorder.stop();
    } catch { /* já parado */ }
    setRec(false);
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    const uri = recorder.uri;
    if (!sendIt) return;
    if (!uri) return useApp.getState().showToast('A gravação falhou. Tente de novo.');
    if (dur < 1.2) return useApp.getState().showToast('Áudio muito curto. Segure e fale por pelo menos 2 segundos.');
    sendVoice(uri, photo);
  };

  const sendVoice = async (uri: string, pic?: string) => {
    setFailed(null);
    setBusy(true);
    setPending({ text: 'Mensagem de voz', photo: pic, voice: true });
    setPhoto(undefined);
    const r = await useApp.getState().ask('', pic, { uri, mime: VOICE_MIME });
    setBusy(false);
    setPending(null);
    if (r.status !== 'ok') setPhoto(pic);
    handle(r, () => sendVoice(uri, pic));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PageDecor w={width} h={height} seed={20} band={false} />
      <View style={{ paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}><Leather w={44} h={44} radius={22} /><Emblem size={34} /></View>
          <View style={{ flex: 1 }}><T v="eyebrow">GUIA DE BORDO · IA</T><T v="serif" style={{ fontSize: 21 }} accessibilityRole="header" numberOfLines={1}>{`Pergunte sobre ${art(pet).o} ${pet.name}`}</T></View>
        </View>
        <Microline />
        {limit !== Infinity && (
          <View style={{ marginHorizontal: 24, marginBottom: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper2, borderRadius: 10, paddingLeft: 12 }}>
            <T v="bold" style={{ flex: 1, fontSize: 15, color: C.inkSoft, paddingVertical: 8 }}>{PAID_PLANS && plan === 'economica' ? `Econômica · ${Math.min(used, limit)} de ${limit} perguntas no mês` : `${Math.min(used, limit)} de ${limit} perguntas neste mês`}</T>
            {PAID_PLANS && plan === 'economica' && <Pressable accessibilityRole="button" accessibilityLabel="Perguntas sem limite na Primeira Classe" onPress={() => router.push('/planos')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 12 }}>
              <Icon name="crown" size={14} color={C.goldDark} /><T v="bold" style={{ fontSize: 14, color: C.goldDark }}>Sem limite</T>
            </Pressable>}
          </View>
        )}
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingTop: 8, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 16, borderBottomLeftRadius: 4, padding: 14, gap: 8 }}>
          <T v="monoBold" style={{ fontSize: 13, letterSpacing: 1.2, color: C.aquaInk }}>GUIA DE BORDO</T>
          <T style={{ fontSize: 15.5, lineHeight: 22 }}>{`Oi! Eu já conheço ${art(pet).o} ${pet.name}: ${pet.species === 'dog' ? 'cão' : 'gato'} ${pet.breed === 'SRD' ? `SRD${pet.ancestry?.length ? ` com jeito de ${pet.ancestry.join(' e ')}` : ''}` : pet.breed}, ${age} ${age === 1 ? 'ano' : 'anos'}${pet.weightKg ? `, ${String(pet.weightKg).replace('.', ',')} kg` : ''}.`}</T>
          {risks.length ? <T style={{ fontSize: 15, lineHeight: 21, color: C.inkSoft }}>{`Para esse perfil, vale ficar de olho em: ${risks.map((r) => r.title.toLowerCase()).join(', ')}.`}</T> : null}
          <T v="bold" style={{ fontSize: 14, color: C.aquaInk }}>Escreva, mande foto ou toque no microfone para falar.</T>
        </View>
        {chat.map((m) => m.from === 'user' ? (
          <View key={m.id} style={{ alignSelf: 'flex-end', maxWidth: '82%', alignItems: 'flex-end', gap: 6 }}>
            {m.photoUri ? <View style={{ backgroundColor: '#fff', padding: 6, paddingBottom: 18, transform: [{ rotate: '2deg' }], elevation: 2 }}><Image source={{ uri: resolvePhotoUri(m.photoUri) }} style={{ width: 150, height: 112 }} accessibilityLabel="Foto enviada" /></View> : null}
            <View style={{ backgroundColor: C.cover, borderRadius: 16, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10 }}><T v="bold" style={{ color: C.goldPale, fontSize: 16.5 }}>{m.text}</T></View>
          </View>
        ) : (
          <View key={m.id} style={{ alignSelf: 'flex-start', maxWidth: '92%', backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 16, borderBottomLeftRadius: 4, padding: 14, paddingBottom: 12 }}>
            <T v="bold" style={{ fontSize: 14.5, color: C.aquaInk }}>Guia</T>
            <T style={{ marginTop: 4, fontSize: 17, lineHeight: 25 }}>{m.text}</T>
            {m.level && m.level !== 'verde' ? (
              <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
                <RectStamp lines={[LEVEL[m.level].label, m.action ?? '']} color={LEVEL[m.level].color} width={Math.min(250, Math.max(130, (m.action ?? '').length * 9 + 34))} height={48} rotation={-5} seed={m.text.length} bigIndex={1} />
              </View>
            ) : null}
            {m.level === 'vermelho' && <Chip label="Abrir emergência" icon="heart" on onPress={() => router.push('/sos')} style={{ marginTop: 10, alignSelf: 'flex-start', backgroundColor: C.red, borderColor: C.red }} />}
          </View>
        ))}
        {pending ? (
          <View style={{ alignSelf: 'flex-end', maxWidth: '82%', alignItems: 'flex-end', gap: 6, opacity: 0.7 }}>
            {pending.photo ? <Image source={{ uri: resolvePhotoUri(pending.photo) }} style={{ width: 150, height: 112, borderRadius: 6 }} accessibilityLabel="Foto enviada" /> : null}
            <View style={{ backgroundColor: C.cover, borderRadius: 16, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {pending.voice ? <Icon name="mic" size={18} color={C.goldPale} /> : null}
              <T v="bold" style={{ color: C.goldPale, fontSize: 16.5 }}>{pending.text}</T>
            </View>
          </View>
        ) : null}
        {busy ? <Thinking /> : null}
        {failed ? (
          <View style={{ backgroundColor: C.redPale, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1.5, borderColor: C.red }}>
            <T v="xbold" style={{ fontSize: 17, color: C.red }}>O Guia não respondeu</T>
            <T style={{ fontSize: 16, lineHeight: 22 }}>{`Motivo: ${failed.why}.`}</T>
            <Pressable accessibilityRole="button" onPress={() => { const f = failed; setFailed(null); f.retry(); }}
              style={{ minHeight: 52, borderRadius: 12, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
              <T v="xbold" style={{ fontSize: 17, color: '#fff' }}>Tentar de novo</T>
            </Pressable>
          </View>
        ) : null}
        <T style={{ fontSize: 14, color: C.inkSoft, textAlign: 'center', marginTop: 6 }}>{aiEnabled() ? `Respostas da IA (Gemini). ${GUIDE_DISCLAIMER}` : 'Modo básico: respostas por regras. Ligue a IA com a chave do Gemini.'}</T>
      </ScrollView>

      {!rec && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingHorizontal: 24, paddingVertical: 8 }} style={{ flexGrow: 0 }}>
          {suggestions.map((sg) => (
            <Pressable key={sg} accessibilityRole="button" accessibilityLabel={`Perguntar: ${sg}`} disabled={busy} onPress={() => send(sg)}
              style={{ borderWidth: 1.5, borderColor: C.cover, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.sheet }}>
              <T v="bold" style={{ fontSize: 15, color: C.cover }}>{sg}</T>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {photo ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingBottom: 6 }}>
          <Image source={{ uri: resolvePhotoUri(photo) }} style={{ width: 48, height: 48, borderRadius: 8 }} accessibilityLabel="Foto anexada" />
          <T style={{ flex: 1, fontSize: 14, color: C.inkSoft }}>Foto anexada</T>
          <IconButton icon="close" label="Remover foto" onPress={() => setPhoto(undefined)} />
        </View>
      ) : null}
      {rec ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.redPale }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.red }} />
          <T v="bold" style={{ flex: 1, fontSize: 15, color: C.red }}>{`Gravando… ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`}</T>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancelar gravação" onPress={() => stopRec(false)} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }}>
            <T v="bold" style={{ color: C.inkSoft, fontSize: 14 }}>Cancelar</T>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Parar e enviar áudio" onPress={() => stopRec(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: C.cover }}>
            <Icon name="send" size={16} color={C.goldPale} /><T v="bold" style={{ color: C.goldPale, fontSize: 14 }}>Enviar</T>
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.paper }}>
          <IconButton icon="camera" label="Anexar foto" onPress={() => { const pw = useApp.getState().paywallFor('ia_foto'); if (pw) openPaywall(pw); else askPhoto(setPhoto); }} />
          <TextInput maxFontSizeMultiplier={1.15} value={text} onChangeText={setText} placeholder="Escreva sua pergunta…" placeholderTextColor={C.inkFaint} accessibilityLabel="Mensagem para o guia" multiline
            style={{ flex: 1, minHeight: 44, maxHeight: 110, backgroundColor: 'rgba(255,255,255,0.55)', borderBottomWidth: 2, borderBottomColor: C.inkSoft, borderTopLeftRadius: 10, borderTopRightRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.body, fontSize: 17, color: C.ink }} />
          {text.trim() || photo ? (
            <IconButton icon="send" tone="cover" label="Enviar" onPress={() => send()} />
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Falar com o guia" onPress={startRec} disabled={busy}
              style={({ pressed }) => ({ width: 50, height: 50, borderRadius: 25, backgroundColor: C.coralInk, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}>
              <Icon name="mic" size={24} color="#fff" sw={2.2} />
            </Pressable>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
