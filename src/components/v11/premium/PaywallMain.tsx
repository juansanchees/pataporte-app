import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivePet, useApp } from '@/store/app';
import { T } from '@/components/ui';
import { PIcon, PawSolid, type PremiumIconName } from '@/art/icons-premium';
import { PAID_PLANS, PAYWALL_SCREENS, PRICES, trialDaysLeft } from '@/domain/commerce';
import { fmtExtenso } from '@/domain/dates';
import { C, F } from '@/theme';
import { LegalLinks, PillButton, TextButton } from './common';
import { usePaywall, type Gatilho } from './usePaywall';

/** Mockup Paywall-Primeira (8a): folha "cartão de embarque" Primeira 1A × Econômica 32C. */
const BENEFITS: { icon: PremiumIconName | 'paws'; title: string; sub: string }[] = [
  { icon: 'bell', title: 'Aviso antes de cada vacina', sub: 'no celular, 7 dias antes e no dia' },
  { icon: 'pillClock', title: 'Nunca mais perca a hora do remédio', sub: 'vermífugo, antipulga e remédios' },
  { icon: 'sparkle', title: 'Tire dúvidas com a IA quando quiser', sub: 'mande foto da receita ou do exame' },
  { icon: 'cardHeart', title: 'Cartão de emergência sempre pronto', sub: 'passaporte com QR code e PDF' },
  { icon: 'paws', title: 'Até 5 pets, com a família junto', sub: 'compartilhe com outra pessoa' },
];

const SHEET = C.sheet;

export function Scrim({ children, onClose, top }: { children: React.ReactNode; onClose: () => void; top?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(29,74,82,0.62)', justifyContent: top ? 'flex-start' : 'flex-end' }}>
      {!top && <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" />}
      {children}
    </View>
  );
}

export function SheetHandle({ onClose }: { onClose: () => void }) {
  return (
    <>
      <View accessibilityElementsHidden importantForAccessibility="no" style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: C.line, alignSelf: 'center' }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} hitSlop={6}
        style={({ pressed }) => ({ position: 'absolute', right: 10, top: 8, width: 48, height: 48, borderRadius: 24, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1, zIndex: 2 })}>
        <PIcon name="close" size={20} sw={2.6} />
      </Pressable>
    </>
  );
}

/** Meia-lua do picote do cartão de embarque. */
function Notch({ side, top, size, color, border, offset }: { side: 'left' | 'right'; top: number; size: number; color: string; border: number; offset?: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', [side]: offset ?? -border, top, width: size / 2, height: size, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', [side]: -size / 2, top: 0, width: size, height: size, borderRadius: size / 2, backgroundColor: SHEET, borderWidth: border, borderColor: color }} />
    </View>
  );
}

export function DevNote() {
  if (PAID_PLANS) return null;
  // NOTA DE DESENVOLVIMENTO: com PAID_PLANS = false a cobrança está desligada e os gatilhos (paywallTrigger) retornam
  // null — esta tela só abre para pré-visualizar/testar. As compras usam o modo simulado de services/purchases.
  return (
    <View style={{ backgroundColor: C.amberPale, borderRadius: 12, padding: 10, marginTop: 10 }}>
      <T v="bold" style={{ fontSize: 15, color: C.amber, textAlign: 'center' }}>Pré-visualização: a cobrança está desligada (PAID_PLANS = false). Nada é cobrado.</T>
    </View>
  );
}

export function PaywallMain({ gatilho, from }: { gatilho: Gatilho | null; from?: string }) {
  const pet = useActivePet();
  const profile = useApp((s) => s.profile);
  const plan = useApp((s) => s.plan());
  const insets = useSafeAreaInsets();
  const { prices, busy, buy, restoreNow, close, compare } = usePaywall(gatilho, { from });
  const [sel, setSel] = useState<'primeira' | 'economica'>('primeira');
  const [period, setPeriod] = useState<'annual' | 'monthly'>('annual');
  const petName = pet?.name ?? '';
  const trialUsed = !!profile?.planState?.trialEndsAt;
  const price = period === 'annual' ? prices.annual.priceString : prices.monthly.priceString;

  if (plan === 'primeira') return <AlreadyFirst onClose={close} onRestore={restoreNow} restoring={busy === 'restore'} />;

  return (
    <Scrim onClose={close} top>
      <View style={{ flex: 1, marginTop: insets.top + 16, backgroundColor: SHEET, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 8 }}
        accessibilityViewIsModal>
        <SheetHandle onClose={close} />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 12 }} showsVerticalScrollIndicator={false}>
          <DevNote />
          {gatilho === 'primeira_vacina' && (
            <View accessibilityRole="text" style={{ marginTop: 12, alignSelf: 'center', minHeight: 30, borderRadius: 15, backgroundColor: C.greenPale, paddingLeft: 5, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#2E6B41', alignItems: 'center', justifyContent: 'center' }}><PIcon name="check" size={12} color="#FFFFFF" sw={3} /></View>
              <T v="xbold" style={{ fontSize: 15, color: '#2E6B41' }}>1ª vacina registrada!</T>
            </View>
          )}
          <T v="serif" accessibilityRole="header" style={{ marginTop: gatilho === 'primeira_vacina' ? 8 : 40, marginHorizontal: 12, fontSize: 28, lineHeight: 33, color: C.cover, textAlign: 'center' }}>
            {PAYWALL_SCREENS.primeira_vacina.title(petName)}
          </T>

          {/* PRIMEIRA CLASSE (cartão de embarque) */}
          <Pressable accessibilityRole="radio" accessibilityState={{ selected: sel === 'primeira' }} accessibilityLabel="Primeira Classe, 7 dias grátis" onPress={() => setSel('primeira')}
            style={{ marginTop: 22, borderWidth: 2.5, borderColor: sel === 'primeira' ? C.gold : C.line, borderRadius: 20, backgroundColor: C.goldPale, padding: 12, paddingBottom: 12, shadowColor: C.goldDark, shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 2 }}>
            <View style={{ position: 'absolute', right: 14, top: -14, minHeight: 26, borderRadius: 13, backgroundColor: C.goldDark, paddingHorizontal: 10, justifyContent: 'center' }}>
              <T v="monoBold" style={{ fontSize: 12, color: '#FFFFFF', letterSpacing: 1 }}>{trialUsed ? 'PRIMEIRA CLASSE' : '7 DIAS GRÁTIS'}</T>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 26 }}>
              <Radio on={sel === 'primeira'} />
              <T v="serif" numberOfLines={1} style={{ flex: 1, fontSize: 22, lineHeight: 26, color: C.cover }}>Primeira Classe</T>
              <View style={{ alignItems: 'flex-end' }}>
                <T v="monoBold" style={{ fontSize: 12, lineHeight: 13, color: C.goldDark }}>ASSENTO</T>
                <T v="monoBold" style={{ fontSize: 16, lineHeight: 18, color: C.cover }}>1A</T>
              </View>
            </View>
            <View style={{ marginTop: 8, gap: 6 }}>
              {BENEFITS.map((b) => (
                <View key={b.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: SHEET, borderWidth: 1.5, borderColor: C.goldLight, alignItems: 'center', justifyContent: 'center' }}>
                    {b.icon === 'paws' ? <PawSolid size={15} color={C.cover} /> : <PIcon name={b.icon} size={16} sw={2.2} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <T v="xbold" style={{ fontSize: 16, lineHeight: 20 }}>{b.title}</T>
                    <T v="bold" style={{ fontSize: 15, lineHeight: 19, color: C.inkSoft }}>{b.sub}</T>
                  </View>
                </View>
              ))}
            </View>
            {/* picote */}
            <View style={{ marginTop: 6, marginHorizontal: -2, height: 16, justifyContent: 'center' }}>
              <View style={{ borderTopWidth: 2, borderStyle: 'dashed', borderColor: C.gold }} />
              <Notch side="left" top={-5} size={26} color={sel === 'primeira' ? C.gold : C.line} border={2.5} offset={-12.5} />
              <Notch side="right" top={-5} size={26} color={sel === 'primeira' ? C.gold : C.line} border={2.5} offset={-12.5} />
            </View>
            {/* Anual × Mensal */}
            <View accessibilityRole="radiogroup" accessibilityLabel="Forma de pagamento" style={{ marginTop: 4, minHeight: 56, borderRadius: 16, backgroundColor: SHEET, borderWidth: 1.5, borderColor: C.line, padding: 3, flexDirection: 'row', gap: 4 }}>
              <PeriodBtn on={period === 'annual'} label="ANUAL" price={prices.annual.priceString} badge="ECONOMIZE 39%" flex={1.15}
                a11y={`Anual, ${prices.annual.priceString}, economize 39%`} onPress={() => { setPeriod('annual'); setSel('primeira'); }} />
              <PeriodBtn on={period === 'monthly'} label="MENSAL" price={prices.monthly.priceString} flex={1}
                a11y={`Mensal, ${prices.monthly.priceString}`} onPress={() => { setPeriod('monthly'); setSel('primeira'); }} />
            </View>
            <View style={{ marginTop: 8, minHeight: 40, alignItems: 'center', justifyContent: 'center' }}>
              {period === 'annual' ? (
                <>
                  <T style={{ fontFamily: F.bodyBlack, fontSize: 16, lineHeight: 20, color: C.goldDark, textAlign: 'center' }}>{PRICES.weeklyLabel}</T>
                  <T v="bold" style={{ fontSize: 16, lineHeight: 20, color: C.goldDark, textAlign: 'center' }}>{`— menos que um sachê pro ${petName || 'seu pet'}`}</T>
                </>
              ) : (
                <T v="bold" style={{ fontSize: 16, lineHeight: 20, color: C.goldDark, textAlign: 'center' }}>{`${prices.monthly.priceString} · sem fidelidade`}</T>
              )}
            </View>
          </Pressable>

          {/* ECONÔMICA (mini cartão) */}
          <View style={{ marginTop: 12, minHeight: 58, borderWidth: 2, borderColor: sel === 'economica' ? C.cover : C.line, borderRadius: 16, backgroundColor: SHEET, flexDirection: 'row', alignItems: 'center' }}>
            <Notch side="left" top={16} size={22} color={sel === 'economica' ? C.cover : C.line} border={2} />
            <Pressable accessibilityRole="radio" accessibilityState={{ selected: sel === 'economica' }} accessibilityLabel="Econômica, grátis, 1 pet, 3 perguntas por mês" onPress={() => setSel('economica')}
              style={{ flex: 1, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14 }}>
              <Radio on={sel === 'economica'} muted />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <T v="serif" numberOfLines={1} style={{ fontSize: 18, lineHeight: 22, color: C.cover, flexShrink: 1 }}>Econômica · grátis</T>
                  <T v="monoBold" style={{ fontSize: 12, color: C.inkSoft }}>32C</T>
                </View>
                <T v="bold" numberOfLines={1} style={{ fontSize: 15, color: C.inkSoft }}>1 pet, 3 perguntas por mês</T>
              </View>
            </Pressable>
            <View style={{ height: 38, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: C.line }} />
            <Pressable accessibilityRole="button" accessibilityLabel="Ver diferenças entre Econômica e Primeira Classe" onPress={compare}
              style={{ minHeight: 48, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <T v="xbold" style={{ fontSize: 15, color: C.cover, textDecorationLine: 'underline' }}>ver diferenças</T>
              <PIcon name="chevronRight" size={14} sw={2.8} />
            </Pressable>
          </View>

          <View style={{ marginTop: 14 }}>
            {sel === 'primeira' ? (
              <PillButton label={trialUsed ? 'Assinar a Primeira Classe' : 'Testar 7 dias grátis'} icon="arrowRight" loading={busy === 'buy'} onPress={() => buy(period)} />
            ) : (
              <PillButton label="Continuar na Econômica" onPress={close} />
            )}
          </View>
          <T v="bold" style={{ marginTop: 8, marginHorizontal: 4, fontSize: 15, lineHeight: 20, color: C.inkSoft, textAlign: 'center' }}>
            {trialUsed ? `${price}. Renova sozinho. Cancele quando quiser.` : `Grátis por ${PRICES.trialDays} dias, depois ${price}. Avisamos 2 dias antes de cobrar. Renova sozinho. Cancele quando quiser.`}
          </T>
          {sel === 'primeira' && <TextButton label="Continuar na Econômica" onPress={close} />}
          <LegalLinks onRestore={restoreNow} restoring={busy === 'restore'} />
        </ScrollView>
      </View>
    </Scrim>
  );
}

function Radio({ on, muted }: { on: boolean; muted?: boolean }) {
  const c = on ? C.cover : muted ? C.inkSoft : C.cover;
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderColor: c, alignItems: 'center', justifyContent: 'center' }}>
      {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.cover }} />}
    </View>
  );
}

function PeriodBtn({ on, label, price, badge, flex, onPress, a11y }: { on: boolean; label: string; price: string; badge?: string; flex: number; onPress: () => void; a11y: string }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={a11y} onPress={onPress}
      style={{ flex, minHeight: 48, borderRadius: 12, backgroundColor: on ? C.cover : 'transparent', paddingHorizontal: 10, justifyContent: 'center' }}>
      <T v="monoBold" style={{ fontSize: 12, lineHeight: 14, color: on ? C.goldLight : C.inkSoft }}>{label}</T>
      <T numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.bodyBlack, fontSize: 17, lineHeight: 21, color: on ? '#FFFFFF' : C.cover }}>{price}</T>
      {badge ? (
        <View style={{ position: 'absolute', right: 6, top: -12, minHeight: 20, borderRadius: 10, backgroundColor: '#2E6B41', paddingHorizontal: 6, justifyContent: 'center' }}>
          <T v="monoBold" style={{ fontSize: 11.5, color: '#FFFFFF', letterSpacing: 0.4 }}>{badge}</T>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Já está na Primeira Classe (teste, loja ou mês trocado por milhas). */
function AlreadyFirst({ onClose, onRestore, restoring }: { onClose: () => void; onRestore: () => void; restoring: boolean }) {
  const profile = useApp((s) => s.profile);
  const insets = useSafeAreaInsets();
  const days = trialDaysLeft(profile);
  const until = profile?.planState?.until;
  const line = days > 0 ? `Teste grátis: faltam ${days} ${days === 1 ? 'dia' : 'dias'}.`
    : until ? `Liberada até ${fmtExtenso(until.slice(0, 10))}.`
    : 'Sua classe está ativa.';
  return (
    <Scrim onClose={onClose}>
      <View style={{ backgroundColor: SHEET, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 20, paddingBottom: insets.bottom + 18 }} accessibilityViewIsModal>
        <SheetHandle onClose={onClose} />
        <DevNote />
        <View style={{ marginTop: 20, alignSelf: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: C.goldPale, borderWidth: 2.5, borderColor: C.gold, alignItems: 'center', justifyContent: 'center' }}>
          <PIcon name="crown" size={30} color={C.goldDark} />
        </View>
        <T v="serif" accessibilityRole="header" style={{ marginTop: 14, fontSize: 26, lineHeight: 32, color: C.cover, textAlign: 'center' }}>Você viaja na Primeira Classe</T>
        <T v="bold" style={{ marginTop: 6, fontSize: 17, lineHeight: 23, color: C.inkSoft, textAlign: 'center' }}>{line}</T>
        <View style={{ marginTop: 14, gap: 8 }}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <PIcon name="check" size={18} color={C.green} sw={2.8} />
              <T v="bold" style={{ flex: 1, fontSize: 16 }}>{b.title}</T>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 18 }}><PillButton label="Voltar" onPress={onClose} /></View>
        <LegalLinks onRestore={onRestore} restoring={restoring} />
      </View>
    </Scrim>
  );
}
