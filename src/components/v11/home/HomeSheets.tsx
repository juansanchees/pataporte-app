import React, { useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/store/app';
import { Button, T } from '@/components/ui';
import { Icon } from '@/art/Icon';
import type { Routine } from '@/domain/types';
import { C, F } from '@/theme';

/** Folha que sobe de baixo (usada pela Home). */
export function BottomSheet({ visible, onClose, children, title }: { visible: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(42,38,34,0.45)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" />
        <View accessibilityViewIsModal style={{ backgroundColor: C.sheet, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 + insets.bottom, gap: 12 }}>
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: '#D9CBAE', alignSelf: 'center' }} />
          {title ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
              <T v="serif" accessibilityRole="header" style={{ flex: 1, fontSize: 24, lineHeight: 30, color: C.cover }}>{title}</T>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1E7D2', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={20} color={C.cover} sw={2.4} />
              </Pressable>
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

/**
 * "Quanto tempo durou o passeio?" antes de marcar o passeio. Com `onReminder` (passeio extra, sem nada
 * agendado agora) mostra também o atalho "Criar lembrete de passeio".
 */
export function WalkSheet({ visible, petName, onPick, onClose, onReminder }: { visible: boolean; petName: string; onPick: (minutes: string) => void; onClose: () => void; onReminder?: () => void }) {
  const opts = ['15 min', '30 min', '1 hora', 'Mais de 1 hora'];
  return (
    <BottomSheet visible={visible} onClose={onClose} title={`Quanto tempo durou o passeio ${petName}?`}>
      <T style={{ fontSize: 16, color: C.inkSoft }}>Fica registrado no diário.</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {opts.map((o) => (
          <Pressable key={o} accessibilityRole="button" onPress={() => onPick(o)}
            style={({ pressed }) => ({ width: '47%', flexGrow: 1, minHeight: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? C.coverDark : C.cover })}>
            <T v="xbold" style={{ fontSize: 17, color: C.white }}>{o}</T>
          </Pressable>
        ))}
      </View>
      {onReminder ? (
        <Pressable accessibilityRole="button" onPress={onReminder}
          style={({ pressed }) => ({ minHeight: 52, borderRadius: 26, borderWidth: 2, borderColor: C.cover, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.8 : 1 })}>
          <Icon name="bell" size={20} color={C.cover} />
          <T v="xbold" style={{ fontSize: 17, color: C.cover }}>Criar lembrete de passeio</T>
        </Pressable>
      ) : null}
    </BottomSheet>
  );
}

function Toggle({ on, label, sub, onPress }: { on: boolean; label: string; sub: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}>
      <View style={{ flex: 1 }}><T v="bold" style={{ fontSize: 16 }}>{label}</T><T style={{ fontSize: 15, color: C.inkSoft }}>{sub}</T></View>
      <View style={{ width: 50, height: 30, borderRadius: 15, backgroundColor: on ? C.cover : C.paper3, padding: 3, alignItems: on ? 'flex-end' : 'flex-start' }}><View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' }} /></View>
    </Pressable>
  );
}

/** Horários da rotina (passeios, brincar, água, dentes, caixa de areia). Veio da Home v1.0. */
export function RoutineEditor({ routine, species, onClose }: { routine: Routine; species: 'dog' | 'cat'; onClose: () => void }) {
  const [r, setR] = useState<Routine>(routine);
  const [newWalk, setNewWalk] = useState('');
  const fix = (v: string) => {
    const m = v.trim().match(/^(\d{1,2})(?::?(\d{2}))?$/);
    if (!m) return null;
    const h = Number(m[1]); const mi = Number(m[2] ?? '0');
    return h <= 23 && mi <= 59 ? `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` : null;
  };
  const addWalk = () => {
    const t = fix(newWalk);
    if (!t) { useApp.getState().showToast('Horário inválido. Use o formato 17:30.'); return; }
    if (!r.walkTimes.includes(t)) setR({ ...r, walkTimes: [...r.walkTimes, t].sort() });
    setNewWalk('');
  };
  return (
    <BottomSheet visible onClose={onClose} title="Horários do dia">
      <T style={{ fontSize: 15, color: C.inkSoft }}>Os horários da comida ficam na ficha de saúde. Aqui você ajusta o resto.</T>
      <View>
        <T v="bold" style={{ fontSize: 16, marginBottom: 6 }}>Passeios</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {r.walkTimes.map((w) => (
            <Pressable key={w} accessibilityRole="button" accessibilityLabel={`Remover passeio das ${w}`} onPress={() => setR({ ...r, walkTimes: r.walkTimes.filter((x) => x !== w) })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.cover, borderRadius: 12, paddingHorizontal: 12, minHeight: 48 }}>
              <T v="monoBold" style={{ color: C.goldPale, fontSize: 15 }}>{w}</T><Icon name="close" size={14} color={C.goldPale} sw={2.4} />
            </Pressable>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.inkFaint, borderRadius: 12, paddingLeft: 10 }}>
            <TextInput maxFontSizeMultiplier={1.15} value={newWalk} onChangeText={setNewWalk} placeholder="17:30" placeholderTextColor={C.inkFaint} keyboardType="numbers-and-punctuation" onSubmitEditing={addWalk} accessibilityLabel="Novo horário de passeio"
              style={{ width: 64, minHeight: 48, fontFamily: F.monoBold, fontSize: 15, color: C.ink }} />
            <Pressable accessibilityRole="button" accessibilityLabel="Adicionar passeio" onPress={addWalk} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={18} color={C.inkSoft} sw={2.4} /></Pressable>
          </View>
        </View>
        {species === 'cat' && !r.walkTimes.length ? <T style={{ fontSize: 15, color: C.inkSoft, marginTop: 4 }}>Gatos normalmente não passeiam. Adicione se o seu passeia na guia.</T> : null}
      </View>
      <Toggle on={!!r.playTime} label="Hora de brincar" sub={r.playTime ? `Todo dia às ${r.playTime}` : 'Desligado'} onPress={() => setR({ ...r, playTime: r.playTime ? null : '20:00' })} />
      <Toggle on={r.water} label="Trocar a água" sub="Uma vez por dia" onPress={() => setR({ ...r, water: !r.water })} />
      <Toggle on={r.teeth} label="Escovar os dentes" sub="Previne tártaro" onPress={() => setR({ ...r, teeth: !r.teeth })} />
      {species === 'cat' && <Toggle on={r.litter} label="Limpar a caixa de areia" sub="Todo dia" onPress={() => setR({ ...r, litter: !r.litter })} />}
      <Button label="Salvar horários" icon="check" onPress={async () => { await useApp.getState().setRoutine(r); onClose(); }} />
    </BottomSheet>
  );
}
