import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Page, PageHeader } from '@/components/passport';
import { Button, T } from '@/components/ui';
import { C } from '@/theme';

export default function NotFound() {
  return (
    <Page header={<PageHeader title="Página não encontrada" back={false} />}>
      <View style={{ gap: 14, paddingTop: 20 }}>
        <T style={{ fontSize: 16, color: C.inkSoft }}>Esse endereço não existe no Pataporte.</T>
        <Button label="Voltar ao início" onPress={() => router.replace('/')} />
      </View>
    </Page>
  );
}
