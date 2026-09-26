import React from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useApp } from '@/store/app';
import { Page, PageHeader } from './passport';
import { Button } from './ui';
import { ChapterFrame, QTitle } from './v11/cadastro/Frame';

/** v1.1: as telas visuais do capítulo 1 (foto, espécie, raça, cor, sinais). */
export const TOTAL_STEPS = 5;

/**
 * Moldura das telas do capítulo 1 e das telas de edição.
 * - Emissão nova: barra "CAPÍTULO 1 DE 5 · QUEM É VOCÊ" + título centralizado + botão fixo no rodapé.
 * - Edição (Perfil → editar): cabeçalho "EDITAR PASSAPORTE" e "Salvar alterações".
 */
export function EmissionPage({ step: _step, title, children, onNext, nextLabel = 'Continuar', disabled, extraFooter, seed, final }: {
  step: number; title: string; children: React.ReactNode; onNext: () => void; nextLabel?: string; disabled?: boolean; extraFooter?: React.ReactNode; seed?: number; final?: boolean;
}) {
  const editing = useApp((s) => s.draft.editingPetId !== null);
  if (!editing) {
    return (
      <ChapterFrame cap={1} onNext={onNext} nextLabel={nextLabel} disabled={disabled} justify="flex-start" gap={0} footerTop={extraFooter}>
        <View style={{ marginTop: 8, marginBottom: 16 }}><QTitle size={30}>{title}</QTitle></View>
        {children}
      </ChapterFrame>
    );
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Page
        seed={seed ?? 7}
        header={<PageHeader title={title} eyebrow="EDITAR PASSAPORTE" />}
        footer={<>{extraFooter}<Button label={final ? 'Salvar alterações' : nextLabel} onPress={onNext} disabled={disabled} /></>}
      >
        {children}
      </Page>
    </KeyboardAvoidingView>
  );
}
