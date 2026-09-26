import React, { useId, useMemo } from 'react';
import Svg, { Circle, Defs, G, Mask, Path, Rect, Text as SvgText, TextPath } from 'react-native-svg';
import { rng, starPath } from './patterns';
import { F, STATUS_UI } from '@/theme';
import type { CareStatus } from '@/domain/types';

/** Random "missing ink" specks + slightly irregular rings, so every stamp looks hand-pressed. */
function useInkMask(seed: number, w: number, h: number) {
  return useMemo(() => {
    const rand = rng(seed * 31 + 5);
    return Array.from({ length: 70 }, () => ({ x: rand() * w, y: rand() * h, r: 0.5 + rand() * 1.8 }));
  }, [seed, w, h]);
}

function wobblyCircle(cx: number, cy: number, r: number, seed: number, amp = 0.9): string {
  const rand = rng(seed);
  const pts: string[] = [];
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r + (rand() - 0.5) * amp * 2;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return 'M' + pts.join(' L') + ' Z';
}

export interface StampProps {
  top: string;
  bottom: string;
  main: string;
  sub?: string;
  color: string;
  size?: number;
  rotation?: number;
  seed?: number;
  opacity?: number;
  mainSize?: number;
}

export function CircleStamp({ top, bottom, main, sub = '', color, size = 120, rotation = -10, seed = 3, opacity = 0.9, mainSize }: StampProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const holes = useInkMask(seed, 120, 120);
  const ms = mainSize ?? (main.length <= 4 ? 21 : main.length <= 7 ? 15 : 11);
  const c = 60;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" style={{ transform: [{ rotate: `${rotation}deg` }], opacity }} accessibilityLabel={`Carimbo ${main} ${sub}`}>
      <Defs>
        <Path id={`t${uid}`} d={`M ${c - 45} ${c} A 45 45 0 0 1 ${c + 45} ${c}`} />
        <Path id={`b${uid}`} d={`M ${c - 52} ${c} A 52 52 0 0 0 ${c + 52} ${c}`} />
        <Mask id={`m${uid}`}>
          <Rect width={120} height={120} fill="#fff" />
          {holes.map((h, i) => <Circle key={i} cx={h.x} cy={h.y} r={h.r} fill="#000" />)}
        </Mask>
      </Defs>
      <G mask={`url(#m${uid})`}>
        <Path d={wobblyCircle(c, c, 56, seed)} fill="none" stroke={color} strokeWidth={3.2} />
        <Path d={wobblyCircle(c, c, 42, seed + 1, 0.6)} fill="none" stroke={color} strokeWidth={1.6} />
        <SvgText fill={color} fontSize={9.5} fontFamily={F.monoBold} letterSpacing={1.4} textAnchor="middle">
          <TextPath href={`#t${uid}`} startOffset="50%">{top}</TextPath>
        </SvgText>
        <SvgText fill={color} fontSize={9} fontFamily={F.monoBold} letterSpacing={1.2} textAnchor="middle">
          <TextPath href={`#b${uid}`} startOffset="50%">{bottom}</TextPath>
        </SvgText>
        <Path d={starPath(c - 49, c, 3.2, 1.3)} fill={color} />
        <Path d={starPath(c + 49, c, 3.2, 1.3)} fill={color} />
        <SvgText x={c} y={sub ? c + 3 : c + 7} fill={color} fontSize={ms} fontFamily={F.monoBold} textAnchor="middle">{main}</SvgText>
        {sub ? <SvgText x={c} y={c + 16} fill={color} fontSize={7.5} fontFamily={F.monoBold} letterSpacing={0.5} textAnchor="middle">{sub}</SvgText> : null}
      </G>
    </Svg>
  );
}

export function RectStamp({ lines, color, width = 120, height = 62, rotation = 6, seed = 4, opacity = 0.9, bigIndex = 0 }: {
  lines: string[]; color: string; width?: number; height?: number; rotation?: number; seed?: number; opacity?: number; bigIndex?: number;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const holes = useInkMask(seed, width, height);
  const total = lines.reduce((acc, _, i) => acc + (i === bigIndex ? 15 : 11), 0);
  let y = (height - total) / 2 + 9;
  return (
    <Svg width={width} height={height} style={{ transform: [{ rotate: `${rotation}deg` }], opacity }} accessibilityLabel={`Carimbo ${lines.join(' ')}`}>
      <Defs>
        <Mask id={`m${uid}`}>
          <Rect width={width} height={height} fill="#fff" />
          {holes.map((h, i) => <Circle key={i} cx={h.x} cy={h.y} r={h.r * 0.8} fill="#000" />)}
        </Mask>
      </Defs>
      <G mask={`url(#m${uid})`}>
        <Rect x={2} y={2} width={width - 4} height={height - 4} rx={8} fill="none" stroke={color} strokeWidth={3} />
        <Rect x={7} y={7} width={width - 14} height={height - 14} rx={5} fill="none" stroke={color} strokeWidth={1.1} />
        {lines.map((ln, i) => {
          const big = i === bigIndex;
          const fs = lines.length === 1 ? 11 : big ? 13 : 8;
          const el = (
            <SvgText key={i} x={width / 2} y={y + (big ? 2 : 0)} fill={color} fontSize={fs} fontFamily={F.monoBold} letterSpacing={big ? 0.6 : 1.1} textAnchor="middle">{ln}</SvgText>
          );
          y += big ? 15 : 11;
          return el;
        })}
      </G>
    </Svg>
  );
}

export function StatusStamp({ status, width = 84, rotation = -6, seed = 11 }: { status: CareStatus; width?: number; rotation?: number; seed?: number }) {
  const s = STATUS_UI[status];
  return <RectStamp lines={[s.label]} color={s.color} width={width} height={30} rotation={rotation} seed={seed} bigIndex={-1} />;
}

export function EmptyStamp({ size = 86, label = '', rotation = 0 }: { size?: number; label?: string; rotation?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" style={{ transform: [{ rotate: `${rotation}deg` }] }}>
      <Circle cx={60} cy={60} r={54} fill="none" stroke="#9A8E7C" strokeWidth={2} strokeDasharray="6 6" />
      {label ? <SvgText x={60} y={label === '?' ? 72 : 65} textAnchor="middle" fontFamily={F.monoBold} fontSize={label === '?' ? 34 : 12} fill="#8A7E6C">{label}</SvgText> : null}
    </Svg>
  );
}
