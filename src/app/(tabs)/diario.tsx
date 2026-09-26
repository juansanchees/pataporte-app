import React, { useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivePet, useApp } from '@/store/app';
import { Page, PageHeader } from '@/components/passport';
import { Button, IconButton, MilesChip, T } from '@/components/ui';
import { RectStamp } from '@/art/Stamp';
import { Icon } from '@/art/Icon';
import { pickPhoto, resolvePhotoUri } from '@/services/photos';
import { chapters, DIARY_KINDS, fmtKg, kindDef, monthTitle } from '@/domain/diary';
import { addDays, fmtBR, fmtShort, today } from '@/domain/dates';
import type { DiaryEntry, DiaryKind } from '@/domain/types';
import { C, F } from '@/theme';
import { art } from '@/domain/words';

const MOODS: { k: NonNullable<DiaryEntry['mood']>; label: string; color: string }[] = [
  { k: 'feliz', label: 'Feliz', color: C.green },
  { k: 'normal', label: 'Normal', color: C.amber },
  { k: 'abatido', label: 'Abatido', color: C.red },
];

/** Diário de vida: um capítulo por mês com tudo que aconteceu na vida do pet. */
export default function Diario() {
  const pet = useActivePet();
  const data = useApp((s) => s.data);
  const [open, setOpen] = useState<DiaryKind | null>(null);
  const [pickKind, setPickKind] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const t = today();
  const list = useMemo(() => (pet ? chapters(data, pet.issuedAt.slice(0, 10), t) : []), [data, pet, t]);
  if (!pet) return null;

  return (
    <Page seed={21}
      header={<PageHeader title="Diário de vida" eyebrow={`A HISTÓRIA ${art(pet).DO} ${pet.name.toUpperCase()}`} back={false} right={<IconButton icon="plus" tone="cover" label="Novo registro" onPress={() => setPickKind(true)} />} />}>
      <View style={{ gap: 18 }}>
        <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 14, gap: 10 }}>
          <T v="xbold" style={{ fontSize: 16 }}>{`O que aconteceu com ${art(pet).o} ${pet.name} hoje?`}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DIARY_KINDS.map((k) => (
              <Pressable key={k.k} accessibilityRole="button" accessibilityLabel={`Registrar ${k.label}`} onPress={() => setOpen(k.k)}
                style={({ pressed }) => ({ width: '23%', flexGrow: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, backgroundColor: pressed ? C.paper3 : C.paper2 })}>
                <Icon name={k.icon} size={22} color={C.cover} />
                <T v="bold" style={{ fontSize: 14.5, textAlign: 'center' }} numberOfLines={1}>{k.short}</T>
              </Pressable>
            ))}
          </View>
          <MilesChip text="+5 MILHAS PELA FOTO DO DIA" />
        </View>

        {list.map((ch) => (
          <View key={ch.month} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <T v="eyebrow">{`CAPÍTULO ${ch.number}`}</T>
                <T v="serif" style={{ fontSize: 26, lineHeight: 30 }}>{monthTitle(ch.month)}</T>
              </View>
              {ch.month === t.slice(0, 7) ? <View style={{ backgroundColor: C.cover, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}><T v="bold" style={{ color: C.goldPale, fontSize: 14 }}>Este mês</T></View> : null}
            </View>

            <View style={{ backgroundColor: C.yellowCard, borderWidth: 1, borderColor: C.yellowLine, borderRadius: 14, padding: 14, gap: 6 }}>
              <T v="bold" style={{ fontSize: 14, color: C.goldDark }}>Resumo do mês</T>
              {ch.summary.length ? (
                <T style={{ fontSize: 15, lineHeight: 22 }}>{ch.summary.join(' · ')}</T>
              ) : (
                <T style={{ fontSize: 15, lineHeight: 22, color: C.inkSoft }}>Nada registrado ainda. Conte um passeio, um banho ou uma conquista.</T>
              )}
              {ch.stamped.length ? <T style={{ fontSize: 14, color: C.inkSoft }}>{`Carimbos: ${ch.stamped.map((s) => `${s.name} (${fmtShort(s.day)})`).join(', ')}`}</T> : null}
              {ch.weight ? <T style={{ fontSize: 14, color: C.inkSoft }}>{`Peso: ${fmtKg(ch.weight.from)} → ${fmtKg(ch.weight.to)}`}</T> : null}
            </View>

            {ch.entries.map((e, i) => {
              const k = kindDef(e.kind);
              const mood = MOODS.find((m) => m.k === e.mood);
              return (
                <Pressable key={e.id} onPress={() => setEditing(e)} onLongPress={() => setConfirmDel(e.id)} accessibilityLabel={`${k.label}, ${fmtShort(e.day)}. ${e.note}`}
                  style={{ backgroundColor: '#fff', borderRadius: 4, padding: 12, gap: 8, transform: [{ rotate: `${[-0.8, 0.8, -0.4][i % 3]}deg` }], elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name={k.icon} size={18} color={C.cover} />
                    <T v="xbold" style={{ flex: 1, fontSize: 15 }}>{k.label}</T>
                    <RectStamp lines={[fmtShort(e.day)]} color={[C.green, C.blue, C.coralInk, C.purple][i % 4]} width={76} height={28} rotation={6} seed={i + 121} bigIndex={-1} />
                  </View>
                  {e.uri ? <Image source={{ uri: resolvePhotoUri(e.uri) }} style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: C.paper3 }} accessibilityLabel="Foto do registro" /> : null}
                  {e.tags?.length ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {e.tags.map((tg) => <View key={tg} style={{ backgroundColor: C.paper2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}><T v="bold" style={{ fontSize: 14.5 }}>{tg}</T></View>)}
                    </View>
                  ) : null}
                  {e.note ? <T v="italic" style={{ fontSize: 15.5, lineHeight: 22 }}>{e.note}</T> : null}
                  {mood ? <T v="bold" style={{ fontSize: 15, color: mood.color }}>{`Estava ${mood.label.toLowerCase()}`}</T> : null}
                  {confirmDel === e.id && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button label="Manter" small variant="secondary" onPress={() => setConfirmDel(null)} style={{ flex: 1 }} />
                      <Button label="Apagar" small variant="danger" onPress={() => { useApp.getState().deleteDiary(e.id); setConfirmDel(null); }} style={{ flex: 1 }} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
        <T style={{ fontSize: 14.5, color: C.inkSoft, textAlign: 'center' }}>Toque num registro para editar. Segure para apagar. As fotos ficam salvas neste celular.</T>
      </View>

      <KindPicker visible={pickKind} onClose={() => setPickKind(false)} onPick={(k) => { setPickKind(false); setTimeout(() => setOpen(k), Platform.OS === 'ios' ? 450 : 0); }} />
      {open && <Composer kind={open} petName={pet.name} petSex={pet.sex} onClose={() => setOpen(null)} />}
      {editing && <Composer kind={editing.kind ?? 'momento'} entry={editing} petName={pet.name} petSex={pet.sex} onClose={() => setEditing(null)} />}
    </Page>
  );
}

function KindPicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (k: DiaryKind) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(11,35,40,0.55)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={{ backgroundColor: C.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 24 + insets.bottom, gap: 8 }}>
          <T v="serif" style={{ fontSize: 24, marginBottom: 6 }}>O que você quer registrar?</T>
          {DIARY_KINDS.map((k) => (
            <Pressable key={k.k} accessibilityRole="button" onPress={() => onPick(k.k)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: C.line }}>
              <Icon name={k.icon} size={22} color={C.cover} />
              <View style={{ flex: 1 }}><T v="xbold" style={{ fontSize: 15.5 }}>{k.label}</T><T style={{ fontSize: 14.5, color: C.inkSoft }}>{k.question}</T></View>
              <Icon name="chevron" size={16} color={C.inkSoft} />
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function Composer({ kind, petName, petSex, onClose, entry }: { kind: DiaryKind; petName: string; petSex?: 'M' | 'F'; onClose: () => void; entry?: DiaryEntry }) {
  const def = kindDef(kind);
  const insets = useSafeAreaInsets();
  const t = today();
  const [tags, setTags] = useState<string[]>(entry?.tags ?? []);
  const [note, setNote] = useState(entry?.note ?? '');
  const [uri, setUri] = useState(entry?.uri ?? '');
  const [mood, setMood] = useState<DiaryEntry['mood']>(entry?.mood);
  const [when, setWhen] = useState<'hoje' | 'ontem'>(entry && entry.day !== t ? 'ontem' : 'hoje');
  const [busy, setBusy] = useState(false);
  const toggle = (tg: string) => setTags(def.multi ? (tags.includes(tg) ? tags.filter((x) => x !== tg) : [...tags, tg]) : tags[0] === tg ? [] : [tg]);
  const can = !!(note.trim() || tags.length || uri);
  const save = async () => {
    if (!can) return;
    setBusy(true);
    if (entry) {
      const day = entry.day < addDays(t, -1) ? entry.day : when === 'hoje' ? t : addDays(t, -1);
      await useApp.getState().updateDiary({ ...entry, uri, note: note.trim(), tags, mood, day });
    } else {
      await useApp.getState().addDiary({ uri, note, kind, tags, mood, day: when === 'hoje' ? t : addDays(t, -1) });
    }
    onClose();
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(11,35,40,0.55)', justifyContent: 'flex-end' }}>
        <View style={{ maxHeight: '92%', backgroundColor: C.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26 }}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 24 + insets.bottom, gap: 14 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name={def.icon} size={26} color={C.cover} />
              <View style={{ flex: 1 }}><T v="eyebrow">{def.label.toUpperCase()}</T><T v="serif" style={{ fontSize: 23, lineHeight: 27 }}>{def.question}</T></View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {def.tags.map((tg) => {
                const on = tags.includes(tg);
                return (
                  <Pressable key={tg} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(tg)}
                    style={{ minHeight: 42, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center', borderWidth: on ? 2 : 1.5, borderStyle: on ? 'solid' : 'dashed', borderColor: on ? C.cover : C.inkFaint, backgroundColor: on ? C.cover : 'rgba(255,255,255,0.5)' }}>
                    <T v="bold" style={{ fontSize: 14, color: on ? C.goldPale : C.ink }}>{tg}</T>
                  </Pressable>
                );
              })}
            </View>
            <TextInput maxFontSizeMultiplier={1.15} value={note} onChangeText={setNote} placeholder={def.placeholder} placeholderTextColor={C.inkFaint} multiline accessibilityLabel="Anotação"
              style={{ minHeight: 84, textAlignVertical: 'top', backgroundColor: 'rgba(255,255,255,0.6)', borderBottomWidth: 2, borderBottomColor: C.inkSoft, borderRadius: 10, padding: 12, fontFamily: F.body, fontSize: 15.5, color: C.ink }} />
            <View style={{ gap: 6 }}>
              <T v="bold" style={{ fontSize: 14 }}>{`Como ${art({ sex: petSex }).o} ${petName} estava?`}</T>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {MOODS.map((m) => (
                  <Pressable key={m.k} accessibilityRole="radio" accessibilityState={{ selected: mood === m.k }} onPress={() => setMood(mood === m.k ? undefined : m.k)}
                    style={{ flex: 1, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: mood === m.k ? m.color : C.line, backgroundColor: mood === m.k ? 'rgba(255,255,255,0.8)' : 'transparent' }}>
                    <T v="bold" style={{ fontSize: 14, color: mood === m.k ? m.color : C.inkSoft }}>{m.label}</T>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['hoje', 'ontem'] as const).map((w) => (
                <Pressable key={w} accessibilityRole="radio" accessibilityState={{ selected: when === w }} onPress={() => setWhen(w)}
                  style={{ flex: 1, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: when === w ? C.paper3 : 'transparent', borderWidth: 1, borderColor: C.line }}>
                  <T v="bold" style={{ fontSize: 14 }}>{w === 'hoje' ? `Hoje · ${fmtBR(t).slice(0, 5)}` : `Ontem · ${fmtBR(addDays(t, -1)).slice(0, 5)}`}</T>
                </Pressable>
              ))}
            </View>
            {uri ? (
              <View>
                <Image source={{ uri: resolvePhotoUri(uri) }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 8 }} accessibilityLabel="Foto escolhida" />
                <Button label="Remover foto" variant="ghost" small onPress={() => setUri('')} style={{ alignSelf: 'center' }} />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button label="Câmera" icon="camera" variant="secondary" small onPress={async () => { const u = await pickPhoto('camera'); if (u) setUri(u); }} style={{ flex: 1, alignSelf: 'auto' }} />
                <Button label="Galeria" icon="image" variant="secondary" small onPress={async () => { const u = await pickPhoto('library'); if (u) setUri(u); }} style={{ flex: 1, alignSelf: 'auto' }} />
              </View>
            )}
            <Button label={entry ? 'Salvar alterações' : 'Salvar no diário'} icon="check" onPress={save} disabled={!can} loading={busy} />
            <Button label="Cancelar" variant="ghost" onPress={onClose} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
