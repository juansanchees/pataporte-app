import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { PetAvatar } from '@/components/passport';
import type { DestinationId } from '@/domain/gamification';
import type { Pet } from '@/domain/types';
import { C, F } from '@/theme';
import { fmtMiles } from './common';

/** Mapa-múndi estilizado (mockup Mapa-Viagem), coordenadas no espaço 350 x 340. */
export const MAP_W = 350;
export const MAP_H = 340;

const CONTINENTS = [
  'M18 40 C40 22 90 18 128 30 C146 36 150 58 136 72 C122 86 116 104 100 118 C92 126 96 142 88 150 C76 144 62 128 52 112 C40 94 22 84 14 66 C10 56 10 46 18 40 Z',
  'M92 170 C112 166 132 178 136 196 C140 214 128 234 118 256 C110 276 100 300 88 322 C82 332 70 330 68 318 C66 296 70 272 62 250 C54 228 60 196 72 182 C78 174 84 172 92 170 Z',
  'M150 118 C146 100 158 84 176 78 C194 72 214 70 232 72 C250 74 258 88 250 100 C244 110 232 114 224 124 C214 136 198 140 184 146 C170 152 154 138 150 118 Z',
  'M160 166 C178 158 206 160 224 168 C240 176 250 192 244 208 C238 226 228 246 216 264 C206 280 192 286 186 272 C180 258 182 240 172 226 C162 212 150 200 150 186 C150 176 152 170 160 166 Z',
  'M246 62 C270 48 300 46 318 56 C334 64 336 86 328 104 C320 122 304 134 298 152 C292 168 278 176 268 168 C258 160 258 146 250 134 C242 120 240 104 240 90 C240 78 240 68 246 62 Z',
  'M318 136 C326 132 334 140 332 150 C330 162 324 174 316 176 C310 174 310 164 313 154 C314 148 314 140 318 136 Z',
  'M280 246 C296 238 322 240 334 252 C342 262 334 278 318 280 C302 282 284 276 278 264 C274 256 274 250 280 246 Z',
];

/** Posição de cada destino + onde vai o nome. */
export const PINS: Record<DestinationId, { x: number; y: number; label: 'right' | 'below' | 'left' }> = {
  rio: { x: 105, y: 262, label: 'right' },
  buenos_aires: { x: 72, y: 315, label: 'right' },
  lisboa: { x: 160, y: 142, label: 'below' },
  paris: { x: 228, y: 90, label: 'right' },
  toquio: { x: 320, y: 158, label: 'below' },
};

/** Trechos da rota (Rio → Buenos Aires → Lisboa → Paris → Tóquio). */
const LEGS: { from: DestinationId; to: DestinationId; d: string }[] = [
  { from: 'rio', to: 'buenos_aires', d: 'M105 262 C95 285 84 300 72 315' },
  { from: 'buenos_aires', to: 'lisboa', d: 'M72 315 C40 262 96 170 160 142' },
  { from: 'lisboa', to: 'paris', d: 'M160 142 C185 118 205 104 228 94' },
  { from: 'paris', to: 'toquio', d: 'M228 94 C270 82 316 110 320 158' },
];

const chipW = (name: string) => Math.max(64, name.length * 8.4 + 20);
function chipX(pin: { x: number; label: string }, name: string) {
  if (pin.label === 'right') return Math.min(pin.x + 30, MAP_W - chipW(name) - 2);
  return Math.max(2, Math.min(pin.x - chipW(name) / 2, MAP_W - chipW(name) - 2));
}

/** Nome da cidade com contorno claro (react-native-svg não tem paint-order: desenha 2 vezes). */
function Label({ x, y, anchor, color, text }: { x: number; y: number; anchor: 'middle' | 'start'; color: string; text: string }) {
  return (
    <>
      <SvgText x={x} y={y} textAnchor={anchor} fontFamily={F.bodyXBold} fontSize={14} fill={C.sheet} stroke={C.sheet} strokeWidth={4} strokeLinejoin="round">{text}</SvgText>
      <SvgText x={x} y={y} textAnchor={anchor} fontFamily={F.bodyXBold} fontSize={14} fill={color}>{text}</SvgText>
    </>
  );
}

export interface MapPoint { id: DestinationId; name: string; min: number; unlocked: boolean; visited: boolean }

export function WorldMap({ width, points, at, next, pet, onPick }: {
  width: number; points: MapPoint[]; at: DestinationId; next: DestinationId | null; pet: Pet; onPick: (id: DestinationId) => void;
}) {
  const s = width / MAP_W;
  const height = MAP_H * s;
  const byId = Object.fromEntries(points.map((p) => [p.id, p])) as Record<DestinationId, MapPoint>;
  const cur = PINS[at];
  const avatar = 46 * s;
  return (
    <View style={{ width, height, borderRadius: 24, backgroundColor: C.aquaPale, overflow: 'hidden' }}>
      <Svg width={width} height={height} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
        <Path d="M0 70 H350 M0 150 H350 M0 230 H350 M0 310 H350" stroke="#FFFFFF" strokeWidth={1} strokeDasharray="3 6" opacity={0.7} />
        <G fill={C.paper2} stroke={C.line} strokeWidth={1.5} strokeLinejoin="round">
          {CONTINENTS.map((d, i) => <Path key={i} d={d} />)}
        </G>
        {LEGS.map((l) => {
          const done = byId[l.to]?.unlocked;
          return <Path key={l.to} d={l.d} fill="none" stroke={C.gold} strokeWidth={3} strokeLinecap="round" strokeDasharray={done ? '1 7' : '7 6'} opacity={done ? 1 : 0.8} />;
        })}
        {points.map((p) => {
          const pin = PINS[p.id];
          if (p.id === at) {
            return (
              <G key={p.id}>
                <Circle cx={pin.x} cy={pin.y} r={30} fill={C.gold} opacity={0.25} />
                <Circle cx={pin.x} cy={pin.y} r={25} fill={C.goldPale} stroke={C.gold} strokeWidth={3} />
                <Rect x={chipX(pin, p.name)} y={pin.label === 'right' ? pin.y - 11 : pin.y + 34} width={chipW(p.name)} height={22} rx={11} fill={C.cover} />
                <SvgText x={chipX(pin, p.name) + chipW(p.name) / 2} y={pin.label === 'right' ? pin.y + 5 : pin.y + 50} textAnchor="middle" fontFamily={F.bodyXBold} fontSize={14} fill="#FFFFFF">{p.name}</SvgText>
              </G>
            );
          }
          const lx = pin.label === 'right' ? pin.x + 19 : pin.x;
          const ly = pin.label === 'below' ? pin.y + 35 : pin.y + 5;
          const anchor = pin.label === 'below' ? 'middle' : 'start';
          const labelColor = p.unlocked || p.id === next ? C.cover : C.inkSoft;
          return (
            <G key={p.id}>
              {p.unlocked ? (
                <>
                  <Circle cx={pin.x} cy={pin.y} r={13} fill={p.visited ? C.gold : C.goldPale} stroke={C.goldDark} strokeWidth={2} />
                  <Circle cx={pin.x} cy={pin.y} r={9} fill="none" stroke={p.visited ? C.goldPale : C.gold} strokeWidth={1.4} strokeDasharray="2 2" />
                  {p.visited
                    ? <Path d={`M${pin.x - 5.5} ${pin.y + 0.5} L${pin.x - 1.5} ${pin.y + 4.5} L${pin.x + 5.5} ${pin.y - 3.5}`} fill="none" stroke={C.cover} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                    : <Circle cx={pin.x} cy={pin.y} r={3.5} fill={C.cover} />}
                </>
              ) : p.id === next ? (
                <>
                  <Path d={`M${pin.x} ${pin.y + 12} C${pin.x - 7} ${pin.y + 4} ${pin.x - 12} ${pin.y - 2} ${pin.x - 12} ${pin.y - 8} C${pin.x - 12} ${pin.y - 15} ${pin.x - 6.5} ${pin.y - 20} ${pin.x} ${pin.y - 20} C${pin.x + 6.5} ${pin.y - 20} ${pin.x + 12} ${pin.y - 15} ${pin.x + 12} ${pin.y - 8} C${pin.x + 12} ${pin.y - 2} ${pin.x + 7} ${pin.y + 4} ${pin.x} ${pin.y + 12} Z`} fill={C.sheet} stroke={C.cover} strokeWidth={2.5} strokeLinejoin="round" />
                  <Circle cx={pin.x} cy={pin.y - 8} r={4} fill={C.cover} />
                  <Rect x={pin.x + 10} y={pin.y + 8} width={72} height={20} rx={10} fill={C.cover} />
                  <SvgText x={pin.x + 46} y={pin.y + 22.5} textAnchor="middle" fontFamily={F.monoBold} fontSize={12} fill={C.goldLight}>{`${fmtMiles(p.min)} MI`}</SvgText>
                </>
              ) : (
                <>
                  <Circle cx={pin.x} cy={pin.y} r={13} fill={C.sheet} stroke={C.inkSoft} strokeWidth={1.8} strokeDasharray="3 3" opacity={0.75} />
                  <Rect x={pin.x - 5} y={pin.y - 1} width={10} height={8} rx={1.5} fill={C.inkSoft} />
                  <Path d={`M${pin.x - 3} ${pin.y - 1} V${pin.y - 3.5} A3 3 0 0 1 ${pin.x + 3} ${pin.y - 3.5} V${pin.y - 1}`} fill="none" stroke={C.inkSoft} strokeWidth={1.8} />
                </>
              )}
              <Label x={lx} y={p.id === next && pin.label !== 'below' ? pin.y - 4 : p.id === next ? pin.y + 44 : ly} anchor={anchor} color={labelColor} text={p.name} />
            </G>
          );
        })}
      </Svg>
      {/* avatar na cidade atual */}
      <View pointerEvents="none" style={{ position: 'absolute', left: cur.x * s - avatar / 2, top: cur.y * s - avatar / 2 - 2 * s, width: avatar, height: avatar, borderRadius: avatar / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <PetAvatar pet={pet} size={avatar} />
      </View>
      {/* alvos de toque (48px) em cada destino */}
      {points.map((p) => {
        const pin = PINS[p.id];
        return (
          <Pressable key={p.id} accessibilityRole="button"
            accessibilityLabel={p.id === at ? `${p.name}: você está aqui` : p.unlocked ? `Viajar para ${p.name}` : `${p.name}: libera com ${fmtMiles(p.min)} milhas acumuladas`}
            onPress={() => onPick(p.id)} hitSlop={4}
            style={{ position: 'absolute', left: pin.x * s - 24, top: pin.y * s - 24, width: 48, height: 48, borderRadius: 24 }} />
        );
      })}
    </View>
  );
}
