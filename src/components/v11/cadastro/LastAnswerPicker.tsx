import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { T } from '@/components/ui';
import { MONTH_NAMES, fmtBR, parseBR, today } from '@/domain/dates';
import type { LastAnswer } from '@/domain/types';
import { C, F } from '@/theme';
import { DateBoxes, Pill, RadioOption } from './Options';

type Kind = LastAnswer['kind'];
const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

/** Converte o que está na tela numa resposta completa (ou null se falta algo). */
function build(kind: Kind | null, dateText: string, year: number, month: number | null, within: string | null): LastAnswer | null {
  switch (kind) {
    case 'data': {
      const d = parseBR(dateText);
      if (!d || d > today() || d < '1995-01-01') return null;
      return { kind: 'data', date: d };
    }
    case 'mes': return month ? { kind: 'mes', year, month } : null;
    case 'naolembro': return within ? { kind: 'naolembro', within: within as 'menos1ano' } : null;
    case 'nunca': return { kind: 'nunca' };
    case 'naosei': return { kind: 'naosei' };
    default: return null;
  }
}

/**
 * "Quando foi?" — o mesmo padrão para vacinas (menos/mais de 1 ano) e vermífugo/antipulgas (menos/mais de 1 mês):
 * 1 sei a data · 2 sei mais ou menos o mês · 3 não lembro quando · 4 nunca · 5 não sei.
 * `preview(answer)` aparece dentro da opção aberta assim que a resposta fica completa ("Próxima dose: …").
 */
export function LastAnswerPicker({ scope, value, onChange, preview, pairLast }: {
  scope: 'ano' | 'mes'; value?: LastAnswer; onChange: (a: LastAnswer | null) => void; preview?: (a: LastAnswer) => React.ReactNode; pairLast?: boolean;
}) {
  const t = today();
  const thisYear = Number(t.slice(0, 4));
  const thisMonth = Number(t.slice(5, 7));
  const vaccine = scope === 'ano';
  const [kind, setKind] = useState<Kind | null>(value?.kind ?? null);
  const [dateText, setDateText] = useState(value?.kind === 'data' ? fmtBR(value.date) : '');
  const [year, setYear] = useState(value?.kind === 'mes' ? value.year : thisYear);
  const [month, setMonth] = useState<number | null>(value?.kind === 'mes' ? value.month : null);
  const [within, setWithin] = useState<string | null>(value?.kind === 'naolembro' ? value.within : null);

  const answer = build(kind, dateText, year, month, within);
  const key = JSON.stringify(answer);
  useEffect(() => { onChange(answer); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (k: Kind) => setKind(k);
  const dateBad = kind === 'data' && dateText.replace(/\D/g, '').length === 8 && !answer;
  const L = vaccine
    ? { data: 'Sim, sei a data', mes: 'Sim, sei mais ou menos o mês', nao: 'Sim, mas não lembro quando', menos: 'Menos de 1 ano (está em dia)', mais: 'Mais de 1 ano', wMenos: 'menos1ano', wMais: 'mais1ano' }
    : { data: 'Sei a data', mes: 'Sei mais ou menos o mês', nao: 'Não lembro quando', menos: 'Menos de 1 mês (está em dia)', mais: 'Mais de 1 mês', wMenos: 'menos1mes', wMais: 'mais1mes' };
  const pv = answer && preview ? preview(answer) : null;

  const last2 = (
    <>
      <RadioOption label="Nunca tomou" on={kind === 'nunca'} onPress={() => pick('nunca')} compact={pairLast}>{pv}</RadioOption>
      <RadioOption label={pairLast ? 'Não sei' : 'Não sei se tomou'} a11y="Não sei se tomou" on={kind === 'naosei'} onPress={() => pick('naosei')} compact={pairLast}>{pv}</RadioOption>
    </>
  );

  return (
    <View style={{ gap: 8 }} accessibilityRole="radiogroup">
      <RadioOption label={L.data} on={kind === 'data'} onPress={() => pick('data')}>
        <DateBoxes value={dateText} onChange={setDateText} />
        {dateBad ? <T v="bold" style={{ fontSize: 16, color: C.red, textAlign: 'center' }}>Confira a data: ela não pode ser no futuro.</T> : null}
        {pv}
      </RadioOption>

      <RadioOption label={L.mes} on={kind === 'mes'} onPress={() => pick('mes')}>
        <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: C.line, borderRadius: 12, padding: 3, gap: 3 }}>
          {[thisYear - 1, thisYear].map((y) => {
            const on = y === year;
            return (
              <Pressable key={y} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`Ano ${y}`} onPress={() => { setYear(y); if (y === thisYear && month && month > thisMonth) setMonth(null); }}
                style={{ flex: 1, minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.cover : 'transparent' }}>
                <T style={{ fontFamily: F.monoBold, fontSize: 16, color: on ? '#FFFFFF' : C.inkSoft }}>{y}</T>
              </Pressable>
            );
          })}
        </View>
        {[0, 6].map((row) => (
          <View key={row} style={{ flexDirection: 'row', gap: 6 }}>
            {MONTHS.slice(row, row + 6).map((m, k) => {
              const i = row + k;
              const n = i + 1;
              const future = year === thisYear && n > thisMonth;
              const on = month === n;
              return (
                <Pressable key={m} disabled={future} accessibilityRole="radio" accessibilityState={{ selected: on, disabled: future }} accessibilityLabel={`${MONTH_NAMES[i]} de ${year}`} onPress={() => setMonth(n)}
                  style={{ flex: 1, minWidth: 0, minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                    borderWidth: on ? 0 : 1.5, borderColor: future ? '#E4D9BE' : C.line, backgroundColor: on ? C.cover : future ? '#EFE7D4' : '#FFFFFF' }}>
                  <T style={{ fontFamily: F.monoBold, fontSize: 14, color: on ? '#FFFFFF' : future ? C.inkFaint : C.ink }}>{m}</T>
                </Pressable>
              );
            })}
          </View>
        ))}
        {month ? <T v="xbold" style={{ fontSize: 16, lineHeight: 20, color: C.cover, textAlign: 'center' }}>{`Vamos considerar meados de ${MONTH_NAMES[month - 1]}.`}</T> : null}
        {pv}
      </RadioOption>

      <RadioOption label={L.nao} on={kind === 'naolembro'} onPress={() => pick('naolembro')}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pill label={L.menos} on={within === L.wMenos} onPress={() => setWithin(L.wMenos)} />
          <Pill label={L.mais} on={within === L.wMais} onPress={() => setWithin(L.wMais)} />
        </View>
        {pv}
      </RadioOption>

      {pairLast ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>{last2}</View> : last2}
    </View>
  );
}
