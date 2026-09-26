import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useActivePet, useApp } from '@/store/app';
import { Page, PageHeader, PetPhoto } from '@/components/passport';
import { Button, T } from '@/components/ui';
import { Icon } from '@/art/Icon';
import { breedProfile, risksFor, sizeFor } from '@/domain/breeds';
import { C } from '@/theme';
import { art } from '@/domain/words';

/** Saúde da raça: o que é comum, sinais de alerta e como prevenir. */
export default function Raca() {
  const pet = useActivePet();
  const [open, setOpen] = useState<string | null>(null);
  if (!pet) return <Redirect href="/" />;
  const profile = breedProfile(pet.species, pet.breed);
  const risks = risksFor(pet);
  const size = pet.size ?? sizeFor(pet.species, pet.breed, pet.weightKg);
  const title = pet.breed === 'SRD' ? `SRD${pet.ancestry?.length ? ` com jeito de ${pet.ancestry.join(' e ')}` : ''}` : pet.breed;

  return (
    <Page seed={29} header={<PageHeader title="Saúde da raça" eyebrow={`O QUE PREVENIR NO ${pet.name.toUpperCase()}`} />}
      footer={<Button label="Perguntar ao Guia IA" icon="chat" onPress={() => router.push({ pathname: '/guia', params: { q: `O que devo fazer para prevenir problemas comuns ${art(pet).no} ${pet.name}?` } })} />}>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: C.sheet, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 14 }}>
          <PetPhoto pet={pet} w={78} h={96} photo />
          <View style={{ flex: 1, gap: 4 }}>
            <T v="serif" style={{ fontSize: 21, lineHeight: 25 }}>{title}</T>
            <T v="bold" style={{ fontSize: 14, color: C.inkSoft }}>{`Porte ${size}${profile ? ` · energia ${profile.energy}` : ''}`}</T>
            {profile ? <T style={{ fontSize: 14, lineHeight: 20 }}>{profile.about}</T> : <T style={{ fontSize: 14, lineHeight: 20 }}>Sem raça definida: os cuidados seguem o porte e as raças que lembra.</T>}
          </View>
        </View>
        {pet.temperament?.length ? <T style={{ fontSize: 14.5, color: C.inkSoft }}>{`Jeito: ${pet.temperament.join(', ').toLowerCase()}.`}</T> : null}

        {risks.map((r) => {
          const on = open === r.id;
          return (
            <View key={r.id} style={{ backgroundColor: C.sheet, borderWidth: 1, borderColor: on ? C.cover : C.line, borderRadius: 16, overflow: 'hidden' }}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: on }} onPress={() => setOpen(on ? null : r.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: r.urgent ? C.redPale : C.amberPale, alignItems: 'center', justifyContent: 'center' }}><Icon name="shield" size={20} color={r.urgent ? C.red : C.amber} /></View>
                <View style={{ flex: 1 }}>
                  <T v="xbold" style={{ fontSize: 16.5 }}>{r.title}</T>
                  <T style={{ fontSize: 15, color: C.inkSoft }} numberOfLines={on ? undefined : 2}>{r.what}</T>
                </View>
                <View style={{ transform: [{ rotate: on ? '90deg' : '0deg' }] }}><Icon name="chevron" size={18} color={C.inkSoft} /></View>
              </Pressable>
              {on && (
                <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
                  <View style={{ backgroundColor: C.greenPale, borderRadius: 12, padding: 12, gap: 6 }}>
                    <T v="bold" style={{ fontSize: 14.5, color: C.green }}>Como prevenir</T>
                    {r.prevent.map((p) => <View key={p} style={{ flexDirection: 'row', gap: 8 }}><Icon name="check" size={16} color={C.green} sw={2.6} /><T style={{ flex: 1, fontSize: 14.5, lineHeight: 20 }}>{p}</T></View>)}
                  </View>
                  <View style={{ backgroundColor: C.redPale, borderRadius: 12, padding: 12, gap: 6 }}>
                    <T v="bold" style={{ fontSize: 14.5, color: C.red }}>Sinais para levar ao veterinário</T>
                    {r.signs.map((p) => <View key={p} style={{ flexDirection: 'row', gap: 8 }}><Icon name="info" size={16} color={C.red} /><T style={{ flex: 1, fontSize: 14.5, lineHeight: 20 }}>{p}</T></View>)}
                  </View>
                  <Button label={r.question} icon="chat" small variant="secondary" onPress={() => router.push({ pathname: '/guia', params: { q: r.question } })} style={{ alignSelf: 'stretch' }} />
                </View>
              )}
            </View>
          );
        })}
        <T style={{ fontSize: 14.5, color: C.inkSoft }}>Informação geral de prevenção. Cada pet é único: confirme sempre com o veterinário.</T>
        <Button label="Corrigir raça, porte e jeito" icon="edit" variant="ghost" onPress={() => { useApp.getState().startEdit(pet); router.push('/emissao/perfil'); }} />
      </View>
    </Page>
  );
}
