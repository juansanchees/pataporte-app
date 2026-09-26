import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, Path, Polyline, RadialGradient, Rect, Stop } from 'react-native-svg';
import { C } from '@/theme';

// ------------------------------------------------------------------ deterministic random
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return (s % 100000) / 100000;
  };
}

const r1 = (v: number) => Math.round(v * 10) / 10;

// ------------------------------------------------------------------ guilloché
export function guillochePoints(w: number, y0: number, band: number, n: number, seed: number, step = 6): string[] {
  const rand = rng(seed * 97 + 13);
  const lam1 = 90 + rand() * 40;
  const lam2 = 38 + rand() * 17;
  const out: string[] = [];
  for (let k = 0; k < n; k++) {
    const ph1 = (k * 2 * Math.PI) / n;
    const ph2 = k * 0.9;
    const a1 = band * 0.34;
    const a2 = band * 0.12;
    const pts: string[] = [];
    for (let x = -10; x <= w + 10; x += step) {
      const y = y0 + band / 2 + a1 * Math.sin((2 * Math.PI * x) / lam1 + ph1) + a2 * Math.sin((2 * Math.PI * x) / lam2 + ph2);
      pts.push(`${r1(x)},${r1(y)}`);
    }
    out.push(pts.join(' '));
  }
  return out;
}

export function GuillocheG({ w, y0 = 0, band = 120, n = 14, seed = 1, color = C.aqua, opacity = 0.2, sw = 0.6 }: {
  w: number; y0?: number; band?: number; n?: number; seed?: number; color?: string; opacity?: number; sw?: number;
}) {
  const lines = useMemo(() => guillochePoints(w, y0, band, n, seed), [w, y0, band, n, seed]);
  return (
    <G opacity={opacity}>
      {lines.map((p, i) => <Polyline key={i} points={p} fill="none" stroke={color} strokeWidth={sw} />)}
    </G>
  );
}

// ------------------------------------------------------------------ rosette (hypotrochoid)
function hypo(cx: number, cy: number, R: number, r: number, d: number, scale: number, steps: number): string {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const loops = r / gcd(R, r);
  const total = 2 * Math.PI * loops;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (total * i) / steps;
    const x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
    const y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
    pts.push(`${r1(cx + x * scale)},${r1(cy + y * scale)}`);
  }
  return pts.join(' ');
}

export function RosetteG({ cx, cy, size = 110, color = C.aqua, opacity = 0.15 }: { cx: number; cy: number; size?: number; color?: string; opacity?: number }) {
  const s = size / 8.5;
  const a = useMemo(() => hypo(cx, cy, 7, 3, 4.6, s, 420), [cx, cy, s]);
  const b = useMemo(() => hypo(cx, cy, 5, 2, 2.8, s * 0.9, 320), [cx, cy, s]);
  return (
    <G opacity={opacity}>
      <Polyline points={a} fill="none" stroke={color} strokeWidth={0.6} />
      <Polyline points={b} fill="none" stroke={color} strokeWidth={0.5} />
      <Circle cx={cx} cy={cy} r={size * 0.97} fill="none" stroke={color} strokeWidth={0.6} />
    </G>
  );
}

// ------------------------------------------------------------------ leather
export function Leather({ w, h, color = C.cover, radius = 0, seed = 7 }: { w: number; h: number; color?: string; radius?: number; seed?: number }) {
  const dots = useMemo(() => {
    const rand = rng(seed);
    const n = Math.min(900, Math.round((w * h) / 260));
    return Array.from({ length: n }, () => ({ x: rand() * w, y: rand() * h, r: 0.4 + rand() * 0.9, o: rand() > 0.5 ? 1 : 0 }));
  }, [w, h, seed]);
  const gid = `lg${seed}${w}${h}`;
  return (
    <Svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      <Defs>
        <RadialGradient id={gid} cx="50%" cy="45%" r="75%">
          <Stop offset="0.55" stopColor="#000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.28} />
        </RadialGradient>
      </Defs>
      <Rect width={w} height={h} rx={radius} fill={color} />
      <G>
        {dots.map((d, i) => <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.o ? '#000' : '#fff'} opacity={d.o ? 0.14 : 0.05} />)}
      </G>
      <Rect width={w} height={h} rx={radius} fill={`url(#${gid})`} />
    </Svg>
  );
}

// ------------------------------------------------------------------ emblem (globo + pata + louros)
export function starPath(cx: number, cy: number, ro: number, ri: number, points = 5, rot = -90): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = ((rot + (i * 180) / points) * Math.PI) / 180;
    const rr = i % 2 === 0 ? ro : ri;
    pts.push(`${r1(cx + rr * Math.cos(a))},${r1(cy + rr * Math.sin(a))}`);
  }
  return 'M' + pts.join(' L') + ' Z';
}

export function PawG({ cx, cy, s, fill }: { cx: number; cy: number; s: number; fill: string }) {
  return (
    <G>
      <Ellipse cx={cx - 9 * s} cy={cy - 6 * s} rx={3.4 * s} ry={4.4 * s} fill={fill} transform={`rotate(${-18} ${cx - 9 * s} ${cy - 6 * s})`} />
      <Ellipse cx={cx - 3.2 * s} cy={cy - 11 * s} rx={3.4 * s} ry={4.6 * s} fill={fill} />
      <Ellipse cx={cx + 3.2 * s} cy={cy - 11 * s} rx={3.4 * s} ry={4.6 * s} fill={fill} />
      <Ellipse cx={cx + 9 * s} cy={cy - 6 * s} rx={3.4 * s} ry={4.4 * s} fill={fill} transform={`rotate(${18} ${cx + 9 * s} ${cy - 6 * s})`} />
      <Path
        d={`M${cx} ${cy - 3 * s} C${cx - 8 * s} ${cy - 3 * s} ${cx - 11 * s} ${cy + 5 * s} ${cx - 7 * s} ${cy + 8 * s} C${cx - 4 * s} ${cy + 10 * s} ${cx - 1.5 * s} ${cy + 8 * s} ${cx} ${cy + 8 * s} C${cx + 1.5 * s} ${cy + 8 * s} ${cx + 4 * s} ${cy + 10 * s} ${cx + 7 * s} ${cy + 8 * s} C${cx + 11 * s} ${cy + 5 * s} ${cx + 8 * s} ${cy - 3 * s} ${cx} ${cy - 3 * s} Z`}
        fill={fill}
      />
    </G>
  );
}

export function Emblem({ size = 160, color = C.goldLight, bg = C.cover }: { size?: number; color?: string; bg?: string }) {
  const c = 100;
  const leaves = [] as React.ReactNode[];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const ang = side === -1 ? ((115 + i * 17) * Math.PI) / 180 : ((65 - i * 17) * Math.PI) / 180;
      const x = c + 70 * Math.cos(ang);
      const y = c + 70 * Math.sin(ang);
      const rot = (ang * 180) / Math.PI + (side === -1 ? 90 : -90) + side * 25;
      leaves.push(<Ellipse key={`${side}${i}`} cx={x} cy={y} rx={4.2} ry={9} fill={color} transform={`rotate(${rot} ${x} ${y})`} />);
    }
  }
  const lat = [-26, 0, 26].map((dy) => {
    const half = Math.sqrt(44 * 44 - dy * dy);
    return <Line key={dy} x1={c - half} y1={c + dy} x2={c + half} y2={c + dy} stroke={color} strokeWidth={0.9} opacity={0.6} />;
  });
  const stars = [0, 1, 2, 3, 4].map((i) => {
    const a = ((-90 + (i - 2) * 22) * Math.PI) / 180;
    return <Path key={i} d={starPath(c + 66 * Math.cos(a), c + 66 * Math.sin(a), 4.2, 1.8)} fill={color} />;
  });
  return (
    <View pointerEvents="none">
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {leaves}
      <Circle cx={c} cy={c} r={56} fill="none" stroke={color} strokeWidth={2.4} />
      <Circle cx={c} cy={c} r={51} fill="none" stroke={color} strokeWidth={0.8} />
      <Circle cx={c} cy={c} r={44} fill="none" stroke={color} strokeWidth={1} opacity={0.7} />
      <Ellipse cx={c} cy={c} rx={14} ry={44} fill="none" stroke={color} strokeWidth={0.9} opacity={0.6} />
      <Ellipse cx={c} cy={c} rx={30} ry={44} fill="none" stroke={color} strokeWidth={0.9} opacity={0.6} />
      {lat}
      <Circle cx={c} cy={c + 2} r={25} fill={bg} />
      <PawG cx={c} cy={c + 4} s={1.9} fill={color} />
      {stars}
    </Svg>
    </View>
  );
}

export function EChip({ w = 44, color = C.goldLight }: { w?: number; color?: string }) {
  return (
    <View pointerEvents="none">
    <Svg width={w} height={w * 0.62} viewBox="0 0 44 27">
      <Rect x={1} y={1} width={42} height={25} rx={3} fill="none" stroke={color} strokeWidth={1.8} />
      <Line x1={1} y1={9} x2={43} y2={9} stroke={color} strokeWidth={1.4} />
      <Line x1={1} y1={18} x2={43} y2={18} stroke={color} strokeWidth={1.4} />
      <Circle cx={22} cy={13.5} r={5.5} fill="none" stroke={color} strokeWidth={1.6} />
    </Svg>
    </View>
  );
}

/** Full-page security background: guilloché band, rosette watermark, stitched spine, perforated serial. */
export function PageDecor({ w, h, seed = 1, band = true, watermark = true, tone = C.aqua }: { w: number; h: number; seed?: number; band?: boolean; watermark?: boolean; tone?: string }) {
  return (
    <Svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      {band && <GuillocheG w={w} y0={6} band={120} n={14} seed={seed} color={tone} opacity={0.2} />}
      {watermark && <RosetteG cx={w / 2} cy={h * 0.56} size={120} color={tone} opacity={0.09} />}
      <Rect x={0} y={0} width={16} height={h} fill="#2A2622" opacity={0.035} />
      <Line x1={9} y1={0} x2={9} y2={h} stroke="#9A8E7C" strokeWidth={1} strokeDasharray="5 5" opacity={0.55} />
    </Svg>
  );
}

/**
 * v1.1 — fundo "papel de passaporte": anéis finos concêntricos (guilloché simples dos mockups novos).
 * Sem toque (pointerEvents none).
 */
export function PaperRings({ w, h, cx = w / 2, cy = h * 0.42, gap = 11, color = C.paper2, opacity = 0.55 }: {
  w: number; h: number; cx?: number; cy?: number; gap?: number; color?: string; opacity?: number;
}) {
  const rings = useMemo(() => {
    const R = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
    const out: number[] = [];
    for (let r = gap; r < R; r += gap) out.push(r);
    return out;
  }, [w, h, cx, cy, gap]);
  return (
    <Svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      <G opacity={opacity}>
        {rings.map((r) => <Circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={1} />)}
      </G>
    </Svg>
  );
}
