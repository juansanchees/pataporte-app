import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const P = {
  clock: <><Circle cx={12} cy={12} r={9} /><Path d="M12 7v5l3 2" /></>,
  sun: <><Circle cx={12} cy={12} r={4} /><Path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <Path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  back: <Path d="M15 5l-7 7 7 7" />,
  passport: <><Rect x={5} y={3} width={14} height={18} rx={2} /><Circle cx={12} cy={10} r={3.2} /><Path d="M9 16h6" /></>,
  ticket: <><Path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" /><Path d="M14 7v10" strokeDasharray="2 2" /></>,
  chat: <><Path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" /><Path d="M8 10h8M8 13h5" /></>,
  camera: <><Path d="M4 8h3l2-3h6l2 3h3v11H4z" /><Circle cx={12} cy={13.5} r={3.4} /></>,
  stamp: <><Path d="M9 3h6v4l-1.5 4h-3L9 7z" /><Path d="M5 14h14v3H5z" /><Path d="M6 20h12" /></>,
  globe: <><Circle cx={12} cy={12} r={9} /><Path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></>,
  bell: <><Path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5 1.5 5h-15S6 14 6 10z" /><Path d="M10 19a2 2 0 0 0 4 0" /></>,
  plus: <Path d="M12 5v14M5 12h14" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  lock: <><Rect x={5} y={11} width={14} height={10} rx={2.5} /><Path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  plane: <Path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />,
  map: <><Path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><Path d="M9 3v15M15 6v15" /></>,
  bag: <><Path d="M5 8h14l-1 12H6z" /><Path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  heart: <Path d="M12 20s-7-4.4-9-8.6C1.6 8.3 3.6 5 6.8 5c2 0 3.4 1.1 4.2 2.4h2C13.8 6.1 15.2 5 17.2 5c3.2 0 5.2 3.3 3.8 6.4C19 15.6 12 20 12 20z" />,
  scale: <><Rect x={4} y={4} width={16} height={16} rx={4} /><Path d="M8.5 10a4 4 0 0 1 7 0" /><Path d="M12 10l1.5-2" /></>,
  doc: <><Path d="M7 3h7l4 4v14H7z" /><Path d="M14 3v4h4M10 12h5M10 16h5" /></>,
  gear: <><Circle cx={12} cy={12} r={3} /><Path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  send: <Path d="M4 12L20 4l-6 16-2.5-6.5z" />,
  search: <><Circle cx={11} cy={11} r={6.5} /><Path d="M20 20l-4-4" /></>,
  chevron: <Path d="M9 6l6 6-6 6" />,
  info: <><Circle cx={12} cy={12} r={9} /><Path d="M12 11v5M12 8v.01" /></>,
  pin: <><Path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><Circle cx={12} cy={9.5} r={2.5} /></>,
  phone: <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />,
  crown: <><Path d="M4 17l-1-10 5 4 4-6 4 6 5-4-1 10z" /><Path d="M4 20h16" /></>,
  pdf: <><Path d="M7 3h7l4 4v14H7z" /><Path d="M14 3v4h4" /><Path d="M9.5 14h5M9.5 17h3" /></>,
  share: <><Circle cx={6} cy={12} r={2.5} /><Circle cx={18} cy={6} r={2.5} /><Circle cx={18} cy={18} r={2.5} /><Path d="M8.2 11l7.6-4M8.2 13l7.6 4" /></>,
  user: <><Circle cx={12} cy={8.5} r={3.5} /><Path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" /></>,
  shield: <Path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z" />,
  help: <><Circle cx={12} cy={12} r={9} /><Path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.6-2.5 1.8-2.5 3.8M12 17v.01" /></>,
  trash: <><Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  edit: <Path d="M4 20l1-4L16 5l3 3-11 11z" />,
  logout: <><Path d="M15 4h4v16h-4" /><Path d="M10 8l-4 4 4 4M6 12h10" /></>,
  star: <Path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  drop: <Path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z" />,
  bowl: <><Path d="M3 11h18a9 9 0 0 1-18 0z" /><Path d="M8 8c0-1.5 1-2 2-2M13 7c0-1.5 1-2.5 2.5-2.5" /></>,
  trophy: <><Path d="M8 4h8v5a4 4 0 0 1-8 0z" /><Path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9.5 17h5" /></>,
  calendar: <><Rect x={4} y={5} width={16} height={15} rx={2} /><Path d="M4 10h16M8 3v4M16 3v4" /></>,
  suitcase: <><Rect x={4} y={7} width={16} height={12} rx={2} /><Path d="M9 7V5h6v2M9 11v4M15 11v4" /></>,
  sparkle: <><Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><Path d="M18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z" /></>,
  image: <><Rect x={4} y={5} width={16} height={14} rx={2} /><Circle cx={9} cy={10} r={1.6} /><Path d="M5 17l5-4 3 2.5 2.5-2 3.5 3" /></>,
  mic: <><Rect x={9} y={3} width={6} height={11} rx={3} /><Path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" /></>,
  speaker: <><Path d="M4 9h4l5-4v14l-5-4H4z" /><Path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></>,
  stop: <Rect x={6} y={6} width={12} height={12} rx={2} />,
  paw: <><Circle cx={7} cy={9} r={2} /><Circle cx={12} cy={6.5} r={2} /><Circle cx={17} cy={9} r={2} /><Path d="M12 12c-3.2 0-5.6 2.1-5.6 4.6a2.8 2.8 0 0 0 2.8 2.8c.9 0 1.6-.4 2.8-.4s1.9.4 2.8.4a2.8 2.8 0 0 0 2.8-2.8c0-2.5-2.4-4.6-5.6-4.6z" /></>,
} satisfies Record<string, React.ReactNode>;

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, color = '#2A2622', sw = 2 }: { name: IconName; size?: number; color?: string; sw?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {P[name]}
    </Svg>
  );
}
