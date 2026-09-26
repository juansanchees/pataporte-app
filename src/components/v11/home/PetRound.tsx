import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { PetAvatar } from '@/components/passport';
import { resolvePhotoUri } from '@/services/photos';
import type { Mood, Pet } from '@/domain/types';
import { C } from '@/theme';

/**
 * Foto redonda do pet (cartão da Home, chip de troca, lista "Seus pets").
 * Usa a foto real (mesmo helper do passaporte); sem foto — ou se a foto falhar — mostra o avatar desenhado.
 */
export function PetRound({ pet, size, border = 4, bg = C.aquaPale, mood = 'feliz' }: {
  pet: Pick<Pet, 'species' | 'coat' | 'details' | 'equipped' | 'photoUri' | 'name'>; size: number; border?: number; bg?: string; mood?: Mood;
}) {
  const [broken, setBroken] = useState(false);
  const uri = pet.photoUri && !broken ? resolvePhotoUri(pet.photoUri) : '';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderWidth: border, borderColor: C.white, overflow: 'hidden', alignItems: 'center', justifyContent: uri ? 'center' : 'flex-end' }}>
      {uri ? (
        <Image source={{ uri }} onError={() => setBroken(true)} style={{ width: size, height: size }} resizeMode="cover" accessibilityLabel={`Foto ${pet.name ? `de ${pet.name}` : 'do pet'}`} />
      ) : (
        <View style={{ marginBottom: -size * 0.06 }}><PetAvatar pet={pet} mood={mood} size={Math.round(size * 1.05)} /></View>
      )}
    </View>
  );
}
