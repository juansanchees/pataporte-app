import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Ícones do cadastro em 5 capítulos (mesmo traço do Icon.tsx: 24×24, linha arredondada). */
const P = {
  syringe: <><Path d="M17 3l4 4M19 5l-9.5 9.5M14 6l4 4M8 12l4 4M5.5 14.5l4 4L7 21H3v-4z" /><Path d="M11.5 8.5l1.5 1.5M9.5 10.5l1.5 1.5" /></>,
  pill: <><Rect x={3.5} y={8.5} width={17} height={7} rx={3.5} transform="rotate(-35 12 12)" /><Path d="M9.8 7.9l4.4 8.2" /></>,
  bug: <><Circle cx={12} cy={13} r={5} /><Path d="M12 8V6M9.5 6.5L8 4.5M14.5 6.5L16 4.5M7 11H4M7 15H4.5M17 11h3M17 15h2.5M12 8v10" /></>,
  tooth: <Path d="M7 3.5c-2.4 0-3.8 2-3.3 4.6.4 2 1.3 3.2 1.7 5.3.5 2.8.9 7.1 2.6 7.1 1.4 0 1.5-3.7 2.2-5.5.4-1 1.2-1.4 1.8-1.4s1.4.4 1.8 1.4c.7 1.8.8 5.5 2.2 5.5 1.7 0 2.1-4.3 2.6-7.1.4-2.1 1.3-3.3 1.7-5.3.5-2.6-.9-4.6-3.3-4.6-2 0-3 1-5 1s-3-1-5-1z" />,
  checkup: <><Path d="M6 3v6a4 4 0 0 0 8 0V3" /><Path d="M10 13v2a5 5 0 0 0 10 0v-2" /><Circle cx={20} cy={11} r={2} /></>,
  party: <><Path d="M4 20l5-14 9 9z" /><Path d="M14 4v2M19 9h2M17 5l1.5-1.5M7.5 13l3.5 3.5" /></>,
  shy: <><Circle cx={12} cy={12} r={9} /><Path d="M8 10h2M14 10h2M9.5 15.5c1.5 1 3.5 1 5 0" /></>,
  bark: <><Path d="M4 10c0-3 2.5-5 6-5s6 2 6 5-2.5 5-6 5l-3 3v-3.5C5.3 13.8 4 12.2 4 10z" /><Path d="M18.5 8.5l2-1.5M19 12h2.5M18.5 15.5l2 1.5" /></>,
  zap: <Path d="M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12z" />,
  sofa: <><Path d="M4 12V9a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3" /><Path d="M2.5 12.5a1.5 1.5 0 0 1 3 0V15h13v-2.5a1.5 1.5 0 0 1 3 0V18h-19z" /><Path d="M5 18v2M19 18v2" /></>,
  ball: <><Circle cx={12} cy={12} r={9} /><Path d="M4.5 7.5c4 1.5 7.5 5 9 11.8M19.5 7.5c-4 1.5-7.5 5-9 11.8" /></>,
  home: <><Path d="M4 11l8-7 8 7" /><Path d="M6 9.5V20h12V9.5" /><Path d="M10 20v-5h4v5" /></>,
  broken: <><Path d="M5 4h14v16H5z" /><Path d="M12 4l-2 5 3 3-2 4 1 4" /></>,
  bulb: <><Path d="M9 18h6M10 21h4" /><Path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></>,
  warn: <><Path d="M12 3l9.5 17h-19z" /><Path d="M12 10v4.5M12 17.5v.01" /></>,
  virus: <><Circle cx={12} cy={12} r={5} /><Path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.9 2.9M15.5 15.5l2.9 2.9M5.6 18.4l2.9-2.9M15.5 8.5l2.9-2.9" /></>,
  repeat: <><Path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.5" /><Path d="M20 4v4.5h-4.5" /><Path d="M20 12a8 8 0 0 1-13.7 5.7L4 15.5" /><Path d="M4 20v-4.5h4.5" /></>,
  card: <><Rect x={4} y={3} width={16} height={18} rx={2} /><Rect x={7} y={6} width={4} height={4} rx={1} /><Rect x={13} y={6} width={4} height={4} rx={1} /><Path d="M7 14h10M7 17h7" /></>,
  bone: <Path d="M7.5 9.5L14.5 16.5M6 11a2.5 2.5 0 1 1-2-4 2.5 2.5 0 1 1 4-2 2.5 2.5 0 0 1 1.5 4.5l5.5 5.5a2.5 2.5 0 0 1 4.5 1.5 2.5 2.5 0 1 1-2 4 2.5 2.5 0 1 1-4 2A2.5 2.5 0 0 1 13 17.5L7.5 12A2.5 2.5 0 0 1 6 11z" />,
  moon2: <Path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  question: <><Circle cx={12} cy={12} r={9} /><Path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.6-2.5 1.8-2.5 3.8M12 17v.01" /></>,
} satisfies Record<string, React.ReactNode>;

export type CadIconName = keyof typeof P;

export function CadIcon({ name, size = 22, color = '#2A2622', sw = 2 }: { name: CadIconName; size?: number; color?: string; sw?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {P[name]}
    </Svg>
  );
}
