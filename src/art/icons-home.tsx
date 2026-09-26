import React from 'react';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';

/**
 * Ícones da v1.1 (Home, barra de abas, Agenda, Emergência). Mesmo traço do Icon.tsx:
 * viewBox 24, sem preenchimento, pontas redondas. Desenhos tirados dos mockups aprovados.
 */
const P = {
  home: <Path d="M4 11 L12 4 L20 11 V20 H14.5 V14.5 H9.5 V20 H4 Z" />,
  agenda: <><Rect x={3.5} y={5} width={17} height={15.5} rx={3} /><Path d="M3.5 10 H20.5 M8 3 V7 M16 3 V7" /></>,
  diary: <><Path d="M5 4.5 H16 A3 3 0 0 1 19 7.5 V20 H8 A3 3 0 0 1 5 17 Z" /><Path d="M5 17 A3 3 0 0 1 8 14 H19 M9 8.5 H15" /></>,
  guide: <><Path d="M12 3 C12.8 8 14 9.2 19 10 C14 10.8 12.8 12 12 17 C11.2 12 10 10.8 5 10 C10 9.2 11.2 8 12 3 Z" /><Path d="M18 15.5 C18.3 17.4 18.8 17.9 20.5 18.2 C18.8 18.5 18.3 19 18 20.8 C17.7 19 17.2 18.5 15.5 18.2 C17.2 17.9 17.7 17.4 18 15.5 Z" /></>,
  bell: <><Path d="M6 16 V11 A6 6 0 0 1 18 11 V16 L19.5 18 H4.5 Z" /><Path d="M10 21 A2 2 0 0 0 14 21" /></>,
  syringe: <Path d="M18 2 L22 6 M20 4 L16.5 7.5 M17.5 8.5 L8 18 L5 19 L6 16 L15.5 6.5 Z M13 9 L15 11 M10.5 11.5 L12.5 13.5 M5.5 18.5 L2 22" />,
  pill: <><Rect x={3} y={9} width={18} height={7} rx={3.5} transform="rotate(-45 12 12.5)" /><Line x1={9.5} y1={8.5} x2={14.5} y2={13.5} /></>,
  walk: <><Circle cx={8} cy={4.5} r={2} /><Path d="M8 8 L7 14 L4 20 M7 14 L10 17 L11 21 M8 10 L11 12 L14 11 M14 11 C17 11 19 13 19 16" /><Circle cx={19.5} cy={18} r={1.6} /></>,
  scale: <><Rect x={3} y={4} width={18} height={16} rx={4} /><Path d="M7.5 10 A5 5 0 0 1 16.5 10" /><Line x1={12} y1={10.5} x2={13.8} y2={7.8} /></>,
  bowl: <><Path d="M3 12 H21 C21 16.5 17 19.5 12 19.5 C7 19.5 3 16.5 3 12 Z" /><Path d="M8 9 C8 7.5 9 7 9 5.5 M12 9 C12 7.5 13 7 13 5.5 M16 9 C16 7.5 17 7 17 5.5" /></>,
  bath: <><Path d="M4 12 H20 V14 A5 5 0 0 1 15 19 H9 A5 5 0 0 1 4 14 Z" /><Path d="M6 12 V6 A2 2 0 0 1 10 6" /><Path d="M8 19 L7 21 M16 19 L17 21" /></>,
  vet: <><Path d="M6 3 V8 A4 4 0 0 0 14 8 V3" /><Path d="M10 12 V15 A4 4 0 0 0 18 15 V13" /><Circle cx={18} cy={11} r={2} /></>,
  shield: <Path d="M12 3 L19 6 V12 C19 17 16 20 12 21 C8 20 5 17 5 12 V6 Z" />,
  streak: <><Rect x={3.5} y={5} width={17} height={15.5} rx={3} /><Path d="M3.5 10 H20.5 M8 3 V7 M16 3 V7" /><Path d="M8.5 15 L11 17.5 L15.5 13" /></>,
  plane: <><Path d="M2.5 13.5 L6 13 L9 16 L11 15.5 L9.5 11 L15 8.5 C17 7.6 19.5 7 21 7.8 C21.5 9.2 20.2 10.6 18.3 11.5 L7.5 16.5" /><Path d="M3 20.5 H21" /></>,
  flag: <Path d="M5 21 V4 M5 4 H17 L15 8 L17 12 H5" />,
  heartPulse: <><Path d="M12 20 C5 15 2.5 11.5 2.5 8 A4.8 4.8 0 0 1 12 6 A4.8 4.8 0 0 1 21.5 8 C21.5 11.5 19 15 12 20 Z" /><Path d="M5 12 H9 L10.5 9 L13 15 L14.5 12 H19" /></>,
  heart: <Path d="M12 20 C5 15 2.5 11.5 2.5 8 A4.8 4.8 0 0 1 12 6 A4.8 4.8 0 0 1 21.5 8 C21.5 11.5 19 15 12 20 Z" />,
  phone: <Path d="M5 3 H9 L11 8 L8.5 9.5 A11 11 0 0 0 14.5 15.5 L16 13 L21 15 V19 A2 2 0 0 1 19 21 A16 16 0 0 1 3 5 A2 2 0 0 1 5 3 Z" />,
  pin: <><Path d="M12 21 C12 21 5 14.5 5 9.5 A7 7 0 0 1 19 9.5 C19 14.5 12 21 12 21 Z" /><Circle cx={12} cy={9.5} r={2.5} /></>,
  warning: <><Path d="M12 3 L22 20 H2 Z" /><Path d="M12 10 V14" /><Circle cx={12} cy={17} r={0.8} /></>,
  wind: <><Path d="M3 8 H13 A3 3 0 1 0 10 5" /><Path d="M3 12 H18 A3 3 0 1 1 15 15" /><Path d="M3 16 H9" /></>,
  bolt: <Path d="M13 2 L4 14 H11 L10 22 L20 9 H13 Z" />,
  drop: <Path d="M12 3 C12 3 5 11 5 15 A7 7 0 0 0 19 15 C19 11 12 3 12 3 Z" />,
  sick: <><Circle cx={12} cy={12} r={9} /><Path d="M8 15.5 C10 13.5 14 13.5 16 15.5" /><Path d="M8.5 9 H10 M14 9 H15.5" /></>,
  info: <><Circle cx={12} cy={12} r={9} /><Path d="M12 11 V16" /><Circle cx={12} cy={7.8} r={0.9} /></>,
  back: <Path d="M15 6 L9 12 L15 18" />,
  chevron: <Path d="M9 6 L15 12 L9 18" />,
  down: <Path d="M6 9 L12 15 L18 9" />,
  up: <Path d="M6 15 L12 9 L18 15" />,
  plus: <Path d="M12 5 V19 M5 12 H19" />,
  close: <Path d="M6 6 L18 18 M18 6 L6 18" />,
  check: <Path d="M5 12.5 L9.5 17 L19 7.5" />,
  cat: <><Path d="M5 4 L9 8.5 H15 L19 4 V13 A7 7 0 0 1 5 13 Z" /><Path d="M11 15.5 L12 16.3 L13 15.5" /></>,
  edit: <Path d="M4 20 L5 16 L16 5 L19 8 L8 19 Z" />,
  more: <><Circle cx={5} cy={12} r={1.2} /><Circle cx={12} cy={12} r={1.2} /><Circle cx={19} cy={12} r={1.2} /></>,
  gear: <><Circle cx={12} cy={12} r={3} /><Path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  suitcase: <><Rect x={4} y={7} width={16} height={12} rx={2} /><Path d="M9 7V5h6v2M9 11v4M15 11v4" /></>,
  doc: <><Path d="M7 3h7l4 4v14H7z" /><Path d="M14 3v4h4M10 12h5M10 16h5" /></>,
  stamp: <><Path d="M9 3h6v4l-1.5 4h-3L9 7z" /><Path d="M5 14h14v3H5z" /><Path d="M6 20h12" /></>,
  bag: <><Path d="M5 8h14l-1 12H6z" /><Path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  passport: <><Rect x={5} y={3} width={14} height={18} rx={2} /><Circle cx={12} cy={10} r={3.2} /><Path d="M9 16h6" /></>,
} satisfies Record<string, React.ReactNode>;

export type HomeIconName = keyof typeof P;

export function HomeIcon({ name, size = 22, color = '#1D4A52', sw = 2 }: { name: HomeIconName; size?: number; color?: string; sw?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {P[name]}
    </Svg>
  );
}

/** Patinha cheia (símbolo "paw" dos mockups, viewBox 100). */
export function PawFill({ size = 28, color = '#1D4A52', opacity = 1 }: { size?: number; color?: string; opacity?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
      <Ellipse cx={19} cy={44} rx={9.5} ry={12.5} fill={color} transform="rotate(-28 19 44)" />
      <Ellipse cx={38} cy={23} rx={10.5} ry={13.5} fill={color} transform="rotate(-9 38 23)" />
      <Ellipse cx={62} cy={23} rx={10.5} ry={13.5} fill={color} transform="rotate(9 62 23)" />
      <Ellipse cx={81} cy={44} rx={9.5} ry={12.5} fill={color} transform="rotate(28 81 44)" />
      <Path d="M50 47 C61 47 69 56 75 64 C83 74 81 89 68 89 C60 89 56 85 50 85 C44 85 40 89 32 89 C19 89 17 74 25 64 C31 56 39 47 50 47 Z" fill={color} />
    </Svg>
  );
}

/** Brilho de 4 pontas (faíscas douradas do carimbo). */
export function Spark({ size = 12, color = '#C8A15A' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0 Z" fill={color} />
    </Svg>
  );
}
