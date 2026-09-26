import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
// v1.1: acessórios novos da Loja do avatar (ids em DUTY_ITEMS.acc): chapeu_viagem, bone, gorro, coroa,
// chapeu_palha, lenco_tango, cachecol_lisboa, boina, bandana_toquio.
import { RosetteG } from './patterns';
import { C } from '@/theme';
import type { Mood, Species } from '@/domain/types';

export interface AvatarProps {
  species: Species;
  coat: string;
  mood?: Mood;
  size?: number;
  patch?: boolean;
  patchColor?: string;
  eye?: string;
  ears?: string; // 'Caídas' | 'Em pé' | 'Meio-termo'
  acc?: string[];
}

export function Avatar({ species, coat, mood = 'feliz', size = 200, patch = false, patchColor = '#FFFFFF', eye = '#2A2622', ears, acc = [] }: AvatarProps) {
  const cx = 120;
  const dark = '#2A2622';
  const upright = species === 'cat' || ears === 'Em pé';
  const half = ears === 'Meio-termo';
  return (
    <Svg width={size} height={size} viewBox="0 0 240 236" accessibilityLabel={`Avatar, humor ${mood}`}>
      {/* ears */}
      {upright ? (
        <G>
          <Path d={`M ${cx - 72} 94 L ${cx - 94} 28 L ${cx - 36} 66 Z`} fill={coat} />
          <Path d={`M ${cx + 72} 94 L ${cx + 94} 28 L ${cx + 36} 66 Z`} fill={coat} />
          <Path d={`M ${cx - 70} 84 L ${cx - 82} 48 L ${cx - 50} 68 Z`} fill="#FFD9CC" opacity={0.7} />
          <Path d={`M ${cx + 70} 84 L ${cx + 82} 48 L ${cx + 50} 68 Z`} fill="#FFD9CC" opacity={0.7} />
        </G>
      ) : (
        <G>
          <Ellipse cx={cx - 74} cy={half ? 70 : 84} rx={32} ry={half ? 40 : 50} fill={coat} transform={`rotate(${half ? -40 : -20} ${cx - 74} ${half ? 70 : 84})`} />
          <Ellipse cx={cx + 74} cy={half ? 70 : 84} rx={32} ry={half ? 40 : 50} fill={coat} transform={`rotate(${half ? 40 : 20} ${cx + 74} ${half ? 70 : 84})`} />
          <Ellipse cx={cx - 74} cy={88} rx={17} ry={31} fill="#000" opacity={0.08} transform={`rotate(${-20} ${cx - 74} 88)`} />
          <Ellipse cx={cx + 74} cy={88} rx={17} ry={31} fill="#000" opacity={0.08} transform={`rotate(${20} ${cx + 74} 88)`} />
        </G>
      )}
      {/* head */}
      <Circle cx={cx} cy={132} r={98} fill={coat} />
      {patch && <Ellipse cx={cx + 36} cy={98} rx={30} ry={26} fill={patchColor} opacity={0.9} />}
      {species === 'dog' ? (
        <G>
          <Ellipse cx={cx} cy={148} rx={32} ry={23} fill="#FFF8EE" opacity={0.92} />
          <Ellipse cx={cx} cy={134} rx={11} ry={8} fill={dark} />
          <Ellipse cx={cx - 3} cy={131} rx={3} ry={2} fill="#fff" opacity={0.6} />
        </G>
      ) : (
        <Path d={`M ${cx - 8} 132 L ${cx + 8} 132 L ${cx} 142 Z`} fill={dark} />
      )}
      {/* eyes + mouth by mood */}
      {mood === 'feliz' && (
        <G>
          <Path d={`M ${cx - 47} 120 Q ${cx - 38} 105 ${cx - 29} 120`} stroke={dark} strokeWidth={7} fill="none" strokeLinecap="round" />
          <Path d={`M ${cx + 29} 120 Q ${cx + 38} 105 ${cx + 47} 120`} stroke={dark} strokeWidth={7} fill="none" strokeLinecap="round" />
          <Path d={`M ${cx - 26} 152 Q ${cx} 174 ${cx + 26} 152`} stroke={dark} strokeWidth={6} fill="none" strokeLinecap="round" />
          <Circle cx={cx - 60} cy={142} r={11} fill="#FF9E86" opacity={0.55} />
          <Circle cx={cx + 60} cy={142} r={11} fill="#FF9E86" opacity={0.55} />
        </G>
      )}
      {mood === 'neutro' && (
        <G>
          <Circle cx={cx - 38} cy={121} r={9} fill={eye} />
          <Circle cx={cx + 38} cy={121} r={9} fill={eye} />
          <Circle cx={cx - 35} cy={118} r={2.5} fill="#fff" />
          <Circle cx={cx + 41} cy={118} r={2.5} fill="#fff" />
          <Line x1={cx - 15} y1={156} x2={cx + 15} y2={156} stroke={dark} strokeWidth={6} strokeLinecap="round" />
        </G>
      )}
      {mood === 'triste' && (
        <G>
          <Circle cx={cx - 38} cy={123} r={8.5} fill={eye} />
          <Circle cx={cx + 38} cy={123} r={8.5} fill={eye} />
          <Path d={`M ${cx - 52} 110 L ${cx - 27} 101`} stroke={dark} strokeWidth={5} strokeLinecap="round" />
          <Path d={`M ${cx + 52} 110 L ${cx + 27} 101`} stroke={dark} strokeWidth={5} strokeLinecap="round" />
          <Path d={`M ${cx - 22} 164 Q ${cx} 147 ${cx + 22} 164`} stroke={dark} strokeWidth={6} fill="none" strokeLinecap="round" />
          <Path d={`M ${cx - 41} 136 q -5 9 0 13 q 5 -4 0 -13 z`} fill="#7FC6E8" />
        </G>
      )}
      {species === 'cat' && (
        <G opacity={0.35}>
          {[-1, 1].map((s) => (
            <G key={s}>
              <Line x1={cx + s * 100} y1={140} x2={cx + s * 56} y2={138} stroke={dark} strokeWidth={3} strokeLinecap="round" />
              <Line x1={cx + s * 100} y1={154} x2={cx + s * 56} y2={153} stroke={dark} strokeWidth={3} strokeLinecap="round" />
            </G>
          ))}
        </G>
      )}
      {/* accessories */}
      {acc.includes('bandana') && (
        <G>
          <Path d="M 58 196 Q 120 214 182 196 L 120 234 Z" fill={C.coral} />
          <Circle cx={104} cy={206} r={3} fill="#fff" /><Circle cx={130} cy={210} r={3} fill="#fff" /><Circle cx={118} cy={222} r={3} fill="#fff" />
        </G>
      )}
      {acc.includes('coleira') && (
        <G>
          <Path d="M 52 196 Q 120 222 188 196" stroke={C.gold} strokeWidth={12} fill="none" strokeLinecap="round" />
          <Path d="M 52 196 Q 120 222 188 196" stroke={C.goldDark} strokeWidth={2} fill="none" strokeDasharray="4 6" />
          <Circle cx={120} cy={222} r={9} fill={C.goldLight} stroke={C.goldDark} strokeWidth={2} />
        </G>
      )}
      {acc.includes('gravata') && (
        <G>
          <Path d="M 120 214 L 94 200 L 94 228 Z" fill={C.blue} />
          <Path d="M 120 214 L 146 200 L 146 228 Z" fill={C.blue} />
          <Circle cx={120} cy={214} r={7} fill="#24497C" />
        </G>
      )}
      {acc.includes('oculos') && (
        <G>
          <Rect x={cx - 62} y={106} width={46} height={30} rx={12} fill="#1C1A18" />
          <Rect x={cx + 16} y={106} width={46} height={30} rx={12} fill="#1C1A18" />
          <Path d={`M ${cx - 16} 114 Q ${cx} 106 ${cx + 16} 114`} stroke="#1C1A18" strokeWidth={5} fill="none" />
          <Path d={`M ${cx - 54} 114 L ${cx - 40} 112`} stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.55} />
          <Path d={`M ${cx + 24} 114 L ${cx + 38} 112`} stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.55} />
        </G>
      )}
      {acc.includes('quepe') && (
        <G>
          <Path d="M 50 70 Q 60 18 120 16 Q 180 18 190 70 Z" fill={C.cover} />
          <Rect x={48} y={62} width={144} height={16} rx={8} fill={C.coverDark} />
          <Path d="M 60 76 Q 120 100 180 76 L 176 84 Q 120 108 64 84 Z" fill={C.coverDeep} />
          <Path d="M 104 44 L 120 38 L 136 44 L 120 52 Z" fill={C.goldLight} />
          <Path d="M 88 44 Q 104 40 112 45 M 152 44 Q 136 40 128 45" stroke={C.goldLight} strokeWidth={3} fill="none" strokeLinecap="round" />
        </G>
      )}
      {/* ---- v1.1: Loja do avatar (pescoço) */}
      {acc.includes('lenco_tango') && (
        <G>
          <Path d="M 58 196 Q 120 214 182 196 L 120 234 Z" fill="#B03F29" stroke="#7C2A1A" strokeWidth={2} strokeLinejoin="round" />
          <Circle cx={100} cy={206} r={3.4} fill="#2A2622" /><Circle cx={136} cy={208} r={3.4} fill="#2A2622" /><Circle cx={118} cy={222} r={3.4} fill="#2A2622" />
          <Circle cx={120} cy={203} r={9} fill="#B03F29" stroke="#7C2A1A" strokeWidth={2} />
          <Path d="M 116 208 L 108 226 M 124 208 L 132 226" stroke="#7C2A1A" strokeWidth={3} strokeLinecap="round" />
        </G>
      )}
      {acc.includes('cachecol_lisboa') && (
        <G>
          <Path d="M 48 190 Q 120 222 192 190 L 192 208 Q 120 240 48 208 Z" fill={C.blue} stroke="#24497C" strokeWidth={2} strokeLinejoin="round" />
          <Path d="M 70 200 L 70 214 M 96 207 L 96 222 M 144 207 L 144 222 M 170 200 L 170 214" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
          <Rect x={62} y={206} width={26} height={30} rx={4} fill={C.blue} stroke="#24497C" strokeWidth={2} />
          <Path d="M 62 216 H 88 M 62 226 H 88" stroke={C.goldLight} strokeWidth={3} />
        </G>
      )}
      {/* ---- v1.1: Loja do avatar (cabeça) */}
      {acc.includes('chapeu_viagem') && (
        <G>
          <Ellipse cx={120} cy={64} rx={98} ry={15} fill={C.gold} stroke={C.coverDark} strokeWidth={3} />
          <Path d="M 66 64 C 66 26 88 10 120 10 C 152 10 174 26 174 64 Z" fill={C.gold} stroke={C.coverDark} strokeWidth={3} strokeLinejoin="round" />
          <Rect x={68} y={46} width={104} height={12} fill={C.cover} />
          <Path d="M 100 20 Q 120 14 140 20" stroke={C.goldLight} strokeWidth={4} fill="none" strokeLinecap="round" />
        </G>
      )}
      {acc.includes('bone') && (
        <G>
          <Path d="M 170 70 L 228 72 C 228 86 202 92 170 84 Z" fill="#2E6B41" stroke={C.coverDark} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M 52 76 C 52 28 84 12 120 12 C 156 12 188 28 188 76 Z" fill="#2E6B41" stroke={C.coverDark} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M 118 14 C 104 30 102 52 106 76" stroke="#DCEBD9" strokeWidth={3} fill="none" strokeLinecap="round" />
          <Circle cx={120} cy={13} r={7} fill={C.coverDark} />
        </G>
      )}
      {acc.includes('gorro') && (
        <G>
          <Path d="M 48 82 C 48 30 82 14 120 14 C 158 14 192 30 192 82 Z" fill={C.purple} stroke={C.coverDark} strokeWidth={3} strokeLinejoin="round" />
          <Rect x={42} y={66} width={156} height={26} rx={10} fill={C.purplePale} stroke={C.coverDark} strokeWidth={3} />
          <Path d="M 62 68 V 90 M 82 68 V 90 M 102 68 V 90 M 122 68 V 90 M 142 68 V 90 M 162 68 V 90 M 182 68 V 90" stroke={C.purple} strokeWidth={3} />
          <Circle cx={120} cy={12} r={14} fill={C.purplePale} stroke={C.coverDark} strokeWidth={3} />
        </G>
      )}
      {acc.includes('coroa') && (
        <G>
          <Path d="M 70 72 L 72 22 L 96 48 L 120 10 L 144 48 L 168 22 L 170 72 Z" fill={C.gold} stroke={C.goldDark} strokeWidth={3} strokeLinejoin="round" />
          <Rect x={66} y={66} width={108} height={16} rx={4} fill={C.goldDark} stroke="#5E4518" strokeWidth={2} />
          <Circle cx={120} cy={52} r={8} fill={C.coral} />
          <Circle cx={92} cy={60} r={5} fill={C.purple} /><Circle cx={148} cy={60} r={5} fill={C.purple} />
          <Circle cx={72} cy={22} r={5} fill={C.goldLight} /><Circle cx={120} cy={10} r={5} fill={C.goldLight} /><Circle cx={168} cy={22} r={5} fill={C.goldLight} />
        </G>
      )}
      {acc.includes('chapeu_palha') && (
        <G>
          <Ellipse cx={120} cy={66} rx={112} ry={20} fill={C.goldLight} stroke={C.goldDark} strokeWidth={3} />
          <Path d="M 72 66 C 72 30 90 18 120 18 C 150 18 168 30 168 66 Z" fill={C.goldLight} stroke={C.goldDark} strokeWidth={3} strokeLinejoin="round" />
          <Rect x={73} y={48} width={94} height={11} fill={C.coral} />
          <Path d="M 22 70 L 34 64 M 206 64 L 218 70 M 88 30 L 98 36 M 142 36 L 152 30 M 44 76 L 56 72 M 184 72 L 196 76" stroke={C.goldDark} strokeWidth={2.4} strokeLinecap="round" />
        </G>
      )}
      {acc.includes('boina') && (
        <G>
          <Path d="M 48 66 C 46 38 86 20 128 22 C 172 24 198 40 194 60 C 190 74 152 80 118 80 C 82 80 50 78 48 66 Z" fill="#12333A" stroke={C.coverDeep} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M 126 22 L 130 8" stroke="#12333A" strokeWidth={7} strokeLinecap="round" />
          <Path d="M 70 56 Q 120 70 176 52" stroke="#2B4A50" strokeWidth={3} fill="none" strokeLinecap="round" />
        </G>
      )}
      {acc.includes('bandana_toquio') && (
        <G>
          <Path d="M 204 80 L 234 104 L 216 108 Z" fill="#FFFFFF" stroke="#9A8E7C" strokeWidth={2} strokeLinejoin="round" />
          <Path d="M 204 84 L 226 122 L 210 118 Z" fill="#FFFFFF" stroke="#9A8E7C" strokeWidth={2} strokeLinejoin="round" />
          <Path d="M 28 84 Q 120 50 212 84 L 212 102 Q 120 68 28 102 Z" fill="#FFFFFF" stroke="#9A8E7C" strokeWidth={2} strokeLinejoin="round" />
          <Circle cx={120} cy={76} r={11} fill={C.red} />
        </G>
      )}
    </Svg>
  );
}

export function PassportPhoto({ w, h, children, holo = true, corners = true, bg = C.photo }: { w: number; h: number; children: React.ReactNode; holo?: boolean; corners?: boolean; bg?: string }) {
  return (
    <View style={{ width: w, height: h, borderRadius: 6, backgroundColor: bg, borderWidth: 1, borderColor: C.line, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
      <View style={{ marginBottom: -6 }}>{children}</View>
      {(holo || corners) && (
        <Svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          {holo && <RosetteG cx={w * 0.82} cy={h * 0.84} size={Math.min(22, w * 0.2)} color={C.purple} opacity={0.16} />}
          {corners && (
            <Path d={`M6 16 V6 H16 M${w - 16} 6 H${w - 6} V16 M6 ${h - 16} V${h - 6} H16 M${w - 16} ${h - 6} H${w - 6} V${h - 16}`} stroke={C.inkFaint} strokeWidth={1.4} fill="none" />
          )}
        </Svg>
      )}
    </View>
  );
}
