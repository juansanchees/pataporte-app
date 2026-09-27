import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File, Directory, Paths } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Fotos: ficam no aparelho (abrem na hora, até sem internet) E, com o Firebase ligado, ganham uma cópia
 * comprimida na nuvem do usuário (backup). A referência guardada fica "local|link-da-nuvem":
 * se o arquivo local sumir (troca de celular, reinstalação), o app mostra a cópia da nuvem.
 */
const PREFIX = 'pp-photo://';
const SEP = '|';

/** Parte local e parte da nuvem de uma referência de foto. */
export function splitPhoto(ref: string): { local: string; cloud: string } {
  const i = ref.indexOf(SEP + 'http');
  return i >= 0 ? { local: ref.slice(0, i), cloud: ref.slice(i + 1) } : ref.startsWith('http') ? { local: '', cloud: ref } : { local: ref, cloud: '' };
}

export const hasCloud = (ref?: string) => !!ref && !!splitPhoto(ref).cloud;

/**
 * Faz o backup de uma foto na nuvem e devolve a nova referência ("local|nuvem").
 * Sem Firebase, sem internet ou se já tem backup: devolve a mesma referência (tenta de novo depois).
 */
export async function backupPhoto(ref: string): Promise<string> {
  if (!ref || hasCloud(ref) || Platform.OS === 'web' && !ref.startsWith('blob:') && !ref.startsWith('data:')) return ref;
  try {
    const { backend } = await import('@/data');
    if (backend().mode !== 'firebase') return ref;
    const src = resolveLocal(ref);
    const small = await manipulateAsync(src, [{ resize: { width: 1280 } }], { compress: 0.7, format: SaveFormat.JPEG });
    const base = (splitPhoto(ref).local.split('/').pop() || `${Date.now()}.jpg`).replace(/\.[a-z0-9]+$/i, '');
    const url = await backend().uploadPhoto(small.uri, `${base}-${Math.random().toString(36).slice(2, 7)}.jpg`);
    return url ? `${ref}${SEP}${url}` : ref;
  } catch {
    return ref;
  }
}

/** Guarda a foto na pasta do app e devolve um caminho RELATIVO (o caminho absoluto muda em atualizações do iPhone). */
async function keep(uri: string, folder = 'diario'): Promise<string> {
  if (Platform.OS === 'web') return uri;
  try {
    const dir = new Directory(Paths.document, folder);
    dir.create({ idempotent: true });
    const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
    const name = `${Date.now()}.${ext}`;
    await new File(uri).copy(new File(dir, name));
    return `${PREFIX}${folder}/${name}`;
  } catch {
    return uri;
  }
}

/** Converte a referência guardada em um endereço que o <Image> consegue abrir (local primeiro; se sumiu, a nuvem). */
export function resolvePhotoUri(ref: string): string {
  if (!ref) return ref;
  const { local, cloud } = splitPhoto(ref);
  if (!cloud) return resolveLocal(local);
  if (!local || Platform.OS === 'web') return cloud;
  const l = resolveLocal(local);
  try { if (l.startsWith('file:') && !new File(l).exists) return cloud; } catch { return cloud; }
  return l;
}

function resolveLocal(uri: string): string {
  uri = splitPhoto(uri).local || uri;
  if (!uri || !uri.startsWith(PREFIX)) {
    // fotos antigas com caminho absoluto: tenta achar pelo nome na pasta atual do app
    const m = uri?.match(/\/Documents\/(diario|passaporte)\/([^/]+)$/) ?? uri?.match(/\/files\/(diario|passaporte)\/([^/]+)$/);
    if (m && Platform.OS !== 'web') {
      try { const f = new File(Paths.document, m[1], m[2]); if (f.exists) return f.uri; } catch { /* segue */ }
    }
    return uri;
  }
  try { return new File(Paths.document, uri.slice(PREFIX.length)).uri; } catch { return uri; }
}

export interface Picked { uri: string; base64?: string; mime: string }

/**
 * Abre câmera ou galeria. `aspect` define o recorte (4:3 no diário, 3:4 na foto do passaporte).
 * Com `withBase64`, devolve também a imagem em base64 (para a IA analisar).
 */
export async function pickImage(source: 'camera' | 'library', opts: { aspect?: [number, number]; withBase64?: boolean; folder?: string } = {}): Promise<Picked | null> {
  const common: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: opts.aspect ?? [4, 3], quality: 0.6, base64: !!opts.withBase64 };
  let r: ImagePicker.ImagePickerResult;
  try {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Câmera bloqueada', 'Libere o acesso à câmera nas configurações do celular.');
      return null;
    }
    r = await ImagePicker.launchCameraAsync(common);
  } else {
    if (Platform.OS === 'ios') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted && perm.accessPrivileges !== 'limited') {
        Alert.alert('Galeria bloqueada', 'Libere o acesso às fotos nas configurações do celular.');
        return null;
      }
    }
    r = await ImagePicker.launchImageLibraryAsync(common);
  }
  } catch (e) {
    Alert.alert('Não foi possível abrir', `Tente de novo em instantes. (${String(e).slice(0, 80)})`);
    return null;
  }
  const a = r.canceled ? null : r.assets?.[0];
  if (!a) return null;
  let base64 = a.base64 ?? undefined;
  if (opts.withBase64 && !base64 && a.uri.startsWith('data:')) base64 = a.uri.split(',')[1];
  return { uri: await keep(a.uri, opts.folder), base64, mime: a.mimeType ?? 'image/jpeg' };
}

export async function pickPhoto(source: 'camera' | 'library'): Promise<string | null> {
  return (await pickImage(source))?.uri ?? null;
}

/** Dá tempo do alerta/folha fechar antes de abrir a câmera ou a galeria (no iPhone, senão não abre). */
const wait = () => new Promise((r) => setTimeout(r, Platform.OS === 'ios' ? 500 : 0));

export function askPhoto(onPicked: (uri: string) => void) {
  if (Platform.OS === 'web') {
    pickPhoto('library').then((u) => { if (u) onPicked(u); });
    return;
  }
  Alert.alert('Adicionar foto', undefined, [
    { text: 'Câmera', onPress: async () => { await wait(); const u = await pickPhoto('camera'); if (u) onPicked(u); } },
    { text: 'Galeria', onPress: async () => { await wait(); const u = await pickPhoto('library'); if (u) onPicked(u); } },
    { text: 'Cancelar', style: 'cancel' },
  ]);
}
