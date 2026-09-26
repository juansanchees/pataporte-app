import React from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useApp } from '@/store/app';
import { Page, PageHeader, StampSlots } from './passport';
import { Button } from './ui';

export const TOTAL_STEPS = 9;

/** Frame shared by the 8 "requerimento" steps. In edit mode the stepper is hidden. */
export function EmissionPage({ step, title, children, onNext, nextLabel = 'Continuar', disabled, extraFooter, seed, final }: {
  step: number; title: string; children: React.ReactNode; onNext: () => void; nextLabel?: string; disabled?: boolean; extraFooter?: React.ReactNode; seed?: number; final?: boolean;
}) {
  const editing = useApp((s) => s.draft.editingPetId !== null);
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Page
        seed={seed ?? step + 3}
        header={
          <View>
            <PageHeader title={title} eyebrow={editing ? 'EDITAR PASSAPORTE' : `ETAPA ${step + 1} DE ${TOTAL_STEPS}`} />
            {!editing && <StampSlots total={TOTAL_STEPS} current={step} />}
          </View>
        }
        footer={<>{extraFooter}<Button label={editing && final ? 'Salvar alterações' : nextLabel} onPress={onNext} disabled={disabled} /></>}
      >
        {children}
      </Page>
    </KeyboardAvoidingView>
  );
}
