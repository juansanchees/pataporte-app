import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
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
          <Ellipse cx={cx - 74} cy={half ? 70 : 84} rx={32} ry={half ? 40 : 50} fill={coat} rotation={half ? -40 : -20} origin={`${cx - 74}, ${half ? 70 : 84}`} />
          <Ellipse cx={cx + 74} cy={half ? 70 : 84} rx={32} ry={half ? 40 : 50} fill={coat} rotation={half ? 40 : 20} origin={`${cx + 74}, ${half ? 70 : 84}`} />
          <Ellipse cx={cx - 74} cy={88} rx={17} ry={31} fill="#000" opacity={0.08} rotation={-20} origin={`${cx - 74}, 88`} />
          <Ellipse cx={cx + 74} cy={88} rx={17} ry={31} fill="#000" opacity={0.08} rotation={20} origin={`${cx + 74}, 88`} />
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
