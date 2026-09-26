import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useActivePet } from '@/store/app';
import { T } from '@/components/ui';
import { BottomCard, TypeOption } from '@/components/v11/lembrete/shared';
import { REMINDER_TYPES } from '@/domain/today';
import type { ReminderType } from '@/domain/types';
import { C } from '@/theme';

const ROUTE: Record<ReminderType, string> = {
  remedio: '/lembrete/remedio',
  passeio: '/lembrete/simples?tipo=passeio',
  banho: '/lembrete/simples?tipo=banho',
  consulta: '/lembrete/simples?tipo=consulta',
  comida: '/lembrete/simples?tipo=comida',
  outro: '/lembrete/simples?tipo=outro',
};

/** Lembrete-Novo: sheet "O que vamos lembrar?" — pula direto se ?tipo= já veio definido. */
export default function LembreteNovo() {
  const pet = useActivePet();
  const { tipo } = useLocalSearchParams<{ tipo?: string }>();
  const valid = REMINDER_TYPES.some((t) => t.type === tipo);

  useEffect(() => {
    if (valid) router.replace(ROUTE[tipo as ReminderType] as any);
  }, [valid, tipo]);

  if (!pet) return <Redirect href="/" />;
  if (valid) return <View style={{ flex: 1 }} />;

  return (
    <BottomCard>
      <View style={{ alignItems: 'center', gap: 2, marginBottom: 4 }}>
        <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 10 }} />
        <T v="eyebrow">{pet.name.toUpperCase()}</T>
        <T v="serif" style={{ fontSize: 26 }}>O que vamos lembrar?</T>
      </View>
      <View style={{ gap: 10 }}>
        {REMINDER_TYPES.map((t) => (
          <TypeOption key={t.type} type={t.type} label={t.label} onPress={() => router.replace(ROUTE[t.type] as any)} />
        ))}
      </View>
    </BottomCard>
  );
}
