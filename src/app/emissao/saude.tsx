import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/store/app';
import { EmissionPage } from '@/components/emission';
import { T, styles as ui } from '@/components/ui';
import { FOOD_OPTIONS, foodChoice, mealTimesFor } from '@/domain/catalog';
import { Icon, type IconName } from '@/art/Icon';
import { art } from '@/domain/words';
import { C, F } from '@/theme';

/** Bloco numerado: uma pergunta por vez, letra grande. */
function Q({ n, title, children, hint }: { n: number; title: string; children: React.ReactNode; hint?: string }) {
  return (
    <View style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 16, gap: 12, marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.cover, alignItems: 'center', justifyContent: 'center' }}>
          <T v="xbold" style={{ color: C.goldPale, fontSize: 17 }}>{n}</T>
        </View>
        <T v="xbold" style={{ flex: 1, fontSize: 19, lineHeight: 25 }}>{title}</T>
      </View>
      {children}
      {hint ? <T style={{ fontSize: 15, lineHeight: 21, color: C.inkSoft }}>{hint}</T> : null}
    </View>
  );
}

/** Botão grande, com ícone opcional. */
function Big({ label, on, onPress, icon, flex = true, a11y }: { label: string; on: boolean; onPress: () => void; icon?: IconName; flex?: boolean; a11y?: string }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={a11y ?? label} onPress={onPress}
      style={({ pressed }) => ({ flex: flex ? 1 : undefined, minHeight: icon ? 84 : 58, minWidth: 58, paddingHorizontal: 10, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6,
        borderWidth: 2, borderColor: on ? C.cover : C.line, backgroundColor: on ? C.cover : '#FFFFFF', opacity: pressed ? 0.85 : 1 })}>
      {icon ? <Icon name={icon} size={28} color={on ? C.goldPale : C.cover} /> : null}
      <T v="bold" style={{ fontSize: 17, textAlign: 'center', color: on ? C.goldPale : C.ink }}>{label}</T>
    </Pressable>
  );
}

/** "Tem alergia?" Não / Sim → se Sim, aparece o campo "Qual?". */
function YesNo({ n, title, value, onChange, placeholder }: { n: number; title: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const [open, setOpen] = useState(!!value.trim());
  return (
    <Q n={n} title={title}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Big label="Não" on={!open} onPress={() => { setOpen(false); onChange(''); }} a11y={`${title} Não`} />
        <Big label="Sim" on={open} onPress={() => setOpen(true)} a11y={`${title} Sim`} />
      </View>
      {open ? (
        <TextInput maxFontSizeMultiplier={1.15} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.inkFaint} accessibilityLabel={`${title} Qual?`} autoFocus={!value}
          style={ui.input} />
      ) : null}
    </Q>
  );
}

const FOOD_ICON: Record<(typeof FOOD_OPTIONS)[number], IconName> = { Ração: 'bowl', 'Comida caseira': 'heart', 'Os dois': 'sparkle' };

export default function Saude() {
  const d = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const editing = d.editingPetId !== null;
  const [newTime, setNewTime] = useState('');
  const name = d.name || (d.species === 'dog' ? 'seu cão' : 'seu gato');
  const a = d.name ? art(d) : { o: 'o' };

  const addTime = () => {
    const m = newTime.trim().match(/^(\d{1,2})(?::?(\d{2}))?$/);
    const h = m ? Number(m[1]) : 99;
    const mi = m ? Number(m[2] ?? '0') : 99;
    if (!m || h > 23 || mi > 59) { useApp.getState().showToast('Horário inválido. Escreva assim: 12:30'); return; }
    const t = `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
    if (!d.mealTimes.includes(t)) setDraft({ mealTimes: [...d.mealTimes, t].sort(), ...(d.mealsPerDay !== null ? { mealsPerDay: d.mealTimes.length + 1 } : {}) });
    setNewTime('');
  };
  const removeTime = (t: string) => {
    if (d.mealTimes.length <= 1) return useApp.getState().showToast('Deixe pelo menos um horário.');
    setDraft({ mealTimes: d.mealTimes.filter((x) => x !== t), ...(d.mealsPerDay !== null ? { mealsPerDay: d.mealTimes.length - 1 } : {}) });
  };

  const g = parseInt(d.grams, 10);
  const meals = d.mealsPerDay || d.mealTimes.length;
  const perMeal = !d.gramsUnknown && g > 0 && meals ? Math.round(g / meals) : null;
  const choice = foodChoice(d.food);
  const usesRacao = choice !== 'Comida caseira';

  const next = async () => {
    if (editing) { await useApp.getState().saveEdit(); router.back(); return; }
    router.push('/emissao/historico');
  };

  let n = 0;
  return (
    <EmissionPage step={7} title="Comida e saúde" onNext={next} final>
      <T style={{ fontSize: 17, lineHeight: 24, color: C.inkSoft, marginBottom: 14 }}>{`Responda o que souber sobre ${a.o} ${name}. Dá para mudar depois.`}</T>

      <Q n={++n} title="O que come?">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {FOOD_OPTIONS.map((o) => <Big key={o} label={o} icon={FOOD_ICON[o]} on={choice === o} onPress={() => setDraft({ food: o })} />)}
        </View>
      </Q>

      <Q n={++n} title="Quantas vezes por dia?" hint={d.mealsPerDay === null ? 'Tudo bem. Adultos costumam comer 2 vezes; filhotes, 3 ou 4.' : undefined}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[1, 2, 3, 4].map((k) => <Big key={k} label={`${k}x`} a11y={`${k} ${k === 1 ? 'vez' : 'vezes'} por dia`} on={d.mealsPerDay === k} onPress={() => setDraft({ mealsPerDay: k, mealTimes: mealTimesFor(k) })} />)}
        </View>
        <Big label="Não sei" flex={false} on={d.mealsPerDay === null} onPress={() => setDraft({ mealsPerDay: null })} />
      </Q>

      <Q n={++n} title="Em que horários?" hint="O celular avisa na hora de dar a comida.">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {d.mealTimes.map((t) => (
            <Pressable key={t} accessibilityRole="button" accessibilityLabel={`Tirar o horário ${t}`} onPress={() => removeTime(t)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, paddingHorizontal: 16, borderRadius: 14, backgroundColor: C.cover }}>
              <Icon name="clock" size={20} color={C.goldPale} />
              <T v="xbold" style={{ fontSize: 20, color: C.goldPale }}>{t}</T>
              <Icon name="close" size={16} color={C.goldLight} sw={2.6} />
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TextInput maxFontSizeMultiplier={1.15} value={newTime} onChangeText={setNewTime} placeholder="Ex.: 12:00" placeholderTextColor={C.inkFaint} keyboardType="numbers-and-punctuation" onSubmitEditing={addTime} accessibilityLabel="Novo horário"
            style={[ui.input, { flex: 1, fontFamily: F.bodyBold }]} />
          <Pressable accessibilityRole="button" accessibilityLabel="Adicionar horário" onPress={addTime}
            style={{ minHeight: 56, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: C.cover, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="plus" size={20} color={C.cover} sw={2.6} />
            <T v="xbold" style={{ fontSize: 16, color: C.cover }}>Adicionar</T>
          </Pressable>
        </View>
      </Q>

      {usesRacao ? (
        <Q n={++n} title="Quanto de ração por dia?" hint={d.gramsUnknown ? 'Dica: no verso do pacote tem uma tabela pelo peso do pet.' : perMeal ? `Dá ${perMeal} g em cada refeição.` : 'Se não souber, toque em “Não sei”.'}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput maxFontSizeMultiplier={1.15} value={d.gramsUnknown ? '' : d.grams} editable={!d.gramsUnknown} onChangeText={(t) => setDraft({ grams: t.replace(/\D/g, '').slice(0, 4), gramsUnknown: false })} keyboardType="number-pad"
              placeholder="Ex.: 300" placeholderTextColor={C.inkFaint} accessibilityLabel="Gramas de ração por dia"
              style={[ui.input, { width: 130, opacity: d.gramsUnknown ? 0.4 : 1 }]} />
            <T v="bold" style={{ fontSize: 18 }}>gramas</T>
          </View>
          <Big label="Não sei" flex={false} on={d.gramsUnknown} onPress={() => setDraft({ gramsUnknown: !d.gramsUnknown })} />
        </Q>
      ) : null}

      <YesNo n={++n} title="Tem alguma alergia?" value={d.allergies} onChange={(t) => setDraft({ allergies: t })} placeholder="Qual? Ex.: frango" />
      <YesNo n={++n} title="Tem alguma doença?" value={d.conditions} onChange={(t) => setDraft({ conditions: t })} placeholder="Qual? Ex.: diabetes" />
      <YesNo n={++n} title="Toma algum remédio todo dia?" value={d.meds} onChange={(t) => setDraft({ meds: t })} placeholder="Qual? Ex.: nome e horário" />
    </EmissionPage>
  );
}
