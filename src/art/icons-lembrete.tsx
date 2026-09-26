import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * v1.1 — ícones da área de lembretes/remédios (mesmo traço do Icon.tsx: stroke, sem preenchimento).
 * Não editar src/art/Icon.tsx (regra de convivência): ícones novos ficam aqui.
 */
const PL = {
  pill: <><Rect x={4} y={9} width={16} height={9} rx={4.5} transform="rotate(-35 12 13.5)" /><Path d="M9 13l3 3" /></>,
  walk: <><Circle cx={16} cy={5} r={2} /><Path d="M14 8l-3 3 1 4-3 5M14 8l3 2 2-1M11 11l-4 1-2 3" /></>,
  bath: <><Path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><Path d="M7 12V6a2 2 0 0 1 4 0M4 21h16" /><Path d="M9 3.5c0 1-1 1-1 2" /></>,
  stethoscope: <><Path d="M6 4v6a4 4 0 0 0 8 0V4" /><Circle cx={18} cy={15} r={2.4} /><Path d="M14 10v2a4 4 0 0 1-8 0" /><Path d="M6 4H4M14 4h-2" /></>,
  food: <><Path d="M4 3v6a3 3 0 0 0 3 3v9M4 3v6M6 3v6" /><Path d="M17 3c-1.5 0-3 1.5-3 4s1 5 1 5v9" /></>,
  dots: <><Circle cx={6} cy={12} r={1.6} /><Circle cx={12} cy={12} r={1.6} /><Circle cx={18} cy={12} r={1.6} /></>,
  alarm: <><Circle cx={12} cy={13} r={7.5} /><Path d="M12 9v4l2.6 2.6M5 5L3 7M19 5l2 2M9.5 2.5h5" /></>,
} satisfies Record<string, React.ReactNode>;

export type LembreteIconName = keyof typeof PL;

export function LembreteIcon({ name, size = 22, color = '#2A2622', sw = 2 }: { name: LembreteIconName; size?: number; color?: string; sw?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {PL[name]}
    </Svg>
  );
}
