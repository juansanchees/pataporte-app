import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

/**
 * Ícones da área Primeira Classe / Milhas (v1.1). Mesmo traço do Icon.tsx (24x24, stroke 2, round).
 * Desenhados a partir dos mockups Paywall-*, Milhas, Mapa-Viagem, Loja-Avatar e Ranking.
 */
const P = {
  bell: <><Path d="M6 16 V11 A6 6 0 0 1 18 11 V16 L19.5 18 H4.5 Z" /><Path d="M10 21 A2 2 0 0 0 14 21" /></>,
  pillClock: <><Rect x={1.5} y={6} width={13} height={6} rx={3} transform="rotate(-45 8 9)" /><Line x1={5.9} y1={6.9} x2={10.1} y2={11.1} /><Circle cx={16.5} cy={16.5} r={5.5} /><Path d="M16.5 14 V16.5 L18.3 17.7" /></>,
  sparkle: <><Path d="M12 3 C12.8 8 14 9.2 19 10 C14 10.8 12.8 12 12 17 C11.2 12 10 10.8 5 10 C10 9.2 11.2 8 12 3 Z" /><Path d="M18 15.5 C18.3 17.4 18.8 17.9 20.5 18.2 C18.8 18.5 18.3 19 18 20.8 C17.7 19 17.2 18.5 15.5 18.2 C17.2 17.9 17.7 17.4 18 15.5 Z" /></>,
  cardHeart: <><Rect x={2.5} y={4.5} width={19} height={15} rx={3} /><Path d="M12 16.5 C9 14.6 7.5 13 7.5 11.3 A2.2 2.2 0 0 1 12 10.4 A2.2 2.2 0 0 1 16.5 11.3 C16.5 13 15 14.6 12 16.5 Z" /></>,
  chatSpark: <><Path d="M4 5 H16 A2 2 0 0 1 18 7 V13 A2 2 0 0 1 16 15 H9 L5 18 V15 H4 A2 2 0 0 1 2 13 V7 A2 2 0 0 1 4 5 Z" /><Path d="M19 3 L19.6 4.6 L21.2 5.2 L19.6 5.8 L19 7.4 L18.4 5.8 L16.8 5.2 L18.4 4.6 Z" /></>,
  cameraDoc: <><Rect x={2} y={6} width={16} height={12} rx={2.5} /><Path d="M6.5 6 L7.8 4 H12.2 L13.5 6" /><Circle cx={10} cy={12} r={3} /><Circle cx={18.5} cy={17.5} r={4.5} /><Path d="M16.7 16.3 H20.3 M16.7 17.7 H20.3 M16.7 19.1 H19.3" /></>,
  share: <><Circle cx={6} cy={12} r={2.6} /><Circle cx={18} cy={5.5} r={2.6} /><Circle cx={18} cy={18.5} r={2.6} /><Line x1={8.3} y1={10.8} x2={15.7} y2={6.7} /><Line x1={8.3} y1={13.2} x2={15.7} y2={17.3} /></>,
  scaleChart: <><Rect x={3} y={3} width={18} height={18} rx={4} /><Path d="M6.5 16 L10 12 L13 14 L17.5 8.5" /><Path d="M14.5 8.5 H17.5 V11.5" /></>,
  close: <Path d="M6 6 L18 18 M18 6 L6 18" />,
  arrowRight: <Path d="M5 12 H19 M13 6 L19 12 L13 18" />,
  chevronRight: <Path d="M9 6 L15 12 L9 18" />,
  back: <Path d="M15 5 L8 12 L15 19" />,
  check: <Path d="M5 12.5 L9.5 17 L19 7.5" />,
  crown: <><Path d="M4 17 L3 8 L8 11.5 L12 5 L16 11.5 L21 8 L20 17 Z" /><Path d="M4.5 20 H19.5" /></>,
  globePlane: <><Circle cx={11} cy={13} r={8} /><Path d="M3 13 H19 M11 5 C8.5 8 8.5 18 11 21 M11 5 C13.5 8 13.5 18 11 21" /><Path d="M16 4.5 L21.5 2.5 L19.5 8 L18 6 Z" /></>,
  bag: <><Path d="M5 8 H19 L18 20.5 H6 Z" /><Path d="M9 10.5 V6.5 A3 3 0 0 1 15 6.5 V10.5" /></>,
  podium: <><Path d="M8.5 20.5 V11 H15.5 V20.5 M2.5 20.5 V14.5 H8.5 M15.5 16 H21.5 V20.5 M2 20.5 H22" /><Path d="M12 4 L12.9 5.9 L15 6.1 L13.4 7.5 L13.9 9.5 L12 8.4 L10.1 9.5 L10.6 7.5 L9 6.1 L11.1 5.9 Z" /></>,
  ticket: <><Path d="M3 7.5 A1.5 1.5 0 0 1 4.5 6 H19.5 A1.5 1.5 0 0 1 21 7.5 V10 A2 2 0 0 0 21 14 V16.5 A1.5 1.5 0 0 1 19.5 18 H4.5 A1.5 1.5 0 0 1 3 16.5 V14 A2 2 0 0 0 3 10 Z" /><Path d="M15 6.5 V8 M15 11 V13 M15 16 V17.5" /></>,
  syringe: <Path d="M18 2 L22 6 M20 4 L16.5 7.5 M17.5 8.5 L8 18 L5 19 L6 16 L15.5 6.5 Z M13 9 L15 11 M10.5 11.5 L12.5 13.5 M5.5 18.5 L2 22" />,
  pill: <><Rect x={3} y={9} width={18} height={7} rx={3.5} transform="rotate(-45 12 12.5)" /><Line x1={9.5} y1={8.5} x2={14.5} y2={13.5} /></>,
  walk: <><Circle cx={8} cy={4.5} r={2} /><Path d="M8 8 L7 14 L4 20 M7 14 L10 17 L11 21 M8 10 L11 12 L14 11 M14 11 C17 11 19 13 19 16" /><Circle cx={19.5} cy={18} r={1.6} /></>,
  camera: <><Path d="M3 8.5 A1.5 1.5 0 0 1 4.5 7 H7.5 L9 4.5 H15 L16.5 7 H19.5 A1.5 1.5 0 0 1 21 8.5 V18 A1.5 1.5 0 0 1 19.5 19.5 H4.5 A1.5 1.5 0 0 1 3 18 Z" /><Circle cx={12} cy={13} r={3.5} /></>,
  calendarCheck: <><Rect x={3.5} y={5} width={17} height={15.5} rx={3} /><Path d="M3.5 10 H20.5 M8 3 V7 M16 3 V7" /><Path d="M8.5 15 L11 17.5 L15.5 13" /></>,
  friendPlus: <><Circle cx={9} cy={8} r={3.5} /><Path d="M2.5 20 C2.5 15.5 5.5 13.5 9 13.5 C12.5 13.5 15.5 15.5 15.5 20" /><Path d="M19 8 V14 M16 11 H22" /></>,
  planeUp: <><Path d="M2.5 13.5 L6 13 L9 16 L11 15.5 L9.5 11 L15 8.5 C17 7.6 19.5 7 21 7.8 C21.5 9.2 20.2 10.6 18.3 11.5 L7.5 16.5" /><Path d="M3 20.5 H21" /></>,
  tag: <><Path d="M3 12 V4 H11 L20.5 13.5 L13.5 20.5 Z" /><Circle cx={7.5} cy={8.5} r={1.5} /></>,
  lock: <><Rect x={5} y={10.5} width={14} height={10} rx={2.5} /><Path d="M8 10.5 V7.5 A4 4 0 0 1 16 7.5 V10.5" /></>,
  pin: <><Path d="M12 21 C12 21 5 14.5 5 9.5 A7 7 0 0 1 19 9.5 C19 14.5 12 21 12 21 Z" /><Circle cx={12} cy={9.5} r={2.5} /></>,
  stamp: <><Path d="M9.5 3 H14.5 V8.5 C14.5 10 17.5 10.5 17.5 13 H6.5 C6.5 10.5 9.5 10 9.5 8.5 Z" /><Path d="M4.5 13 H19.5 V17 H4.5 Z" /><Path d="M5 21 H19" /></>,
  restore: <><Path d="M4 12 A8 8 0 1 0 6.5 6.2" /><Path d="M4 4 V8.5 H8.5" /></>,
  exchange: <><Path d="M4 8 H18 L14.5 4.5" /><Path d="M20 16 H6 L9.5 19.5" /></>,
} satisfies Record<string, React.ReactNode>;

export type PremiumIconName = keyof typeof P;

export function PIcon({ name, size = 22, color = '#1D4A52', sw = 2, fill = 'none' }: { name: PremiumIconName; size?: number; color?: string; sw?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {P[name]}
    </Svg>
  );
}

/** Avião cheio (pílula de saldo "1.240 milhas"). */
export function PlaneSolid({ size = 16, color = '#6A4C9C' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M21 12 C21 11 20 10.5 19 10.5 L14 10.5 L9 3 L6.5 3 L9.5 10.5 L4.5 10.5 L3 8 L1 8 L2 12 L1 16 L3 16 L4.5 13.5 L9.5 13.5 L6.5 21 L9 21 L14 13.5 L19 13.5 C20 13.5 21 13 21 12 Z" fill={color} />
    </Svg>
  );
}

/** Patinha cheia (avatar do ranking, benefício "até 5 pets"). */
export function PawSolid({ size = 22, color = '#1D4A52' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G fill={color}>
        <Ellipse cx={19} cy={44} rx={9.5} ry={12.5} rotation={-28} origin="19, 44" />
        <Ellipse cx={38} cy={23} rx={10.5} ry={13.5} rotation={-9} origin="38, 23" />
        <Ellipse cx={62} cy={23} rx={10.5} ry={13.5} rotation={9} origin="62, 23" />
        <Ellipse cx={81} cy={44} rx={9.5} ry={12.5} rotation={28} origin="81, 44" />
        <Path d="M50 47 C61 47 69 56 75 64 C83 74 81 89 68 89 C60 89 56 85 50 85 C44 85 40 89 32 89 C19 89 17 74 25 64 C31 56 39 47 50 47 Z" />
      </G>
    </Svg>
  );
}

/** Duas patinhas (medalhão do paywall "2º pet"). */
export function TwoPaws({ size = 34, color = '#7E5F25' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G transform="translate(-6 18) scale(0.55)"><PawPath color={color} /></G>
      <G transform="translate(44 2) scale(0.55)"><PawPath color={color} /></G>
    </Svg>
  );
}
function PawPath({ color }: { color: string }) {
  return (
    <G fill={color}>
      <Ellipse cx={19} cy={44} rx={9.5} ry={12.5} />
      <Ellipse cx={38} cy={23} rx={10.5} ry={13.5} />
      <Ellipse cx={62} cy={23} rx={10.5} ry={13.5} />
      <Ellipse cx={81} cy={44} rx={9.5} ry={12.5} />
      <Path d="M50 47 C61 47 69 56 75 64 C83 74 81 89 68 89 C60 89 56 85 50 85 C44 85 40 89 32 89 C19 89 17 74 25 64 C31 56 39 47 50 47 Z" />
    </G>
  );
}

// ------------------------------------------------------------------ desenhos dos itens da loja (grade da Loja-Avatar)
const INK = '#1D4A52';
const ITEMS: Record<string, React.ReactNode> = {
  chapeu_viagem: <><Ellipse cx={24} cy={32} rx={20} ry={5} fill="#C8A15A" stroke={INK} strokeWidth={2} /><Path d="M13 32 C13 18 17 12 24 12 C31 12 35 18 35 32 Z" fill="#C8A15A" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><Rect x={13.5} y={25} width={21} height={4} fill={INK} /></>,
  bone: <><Path d="M8 31 C8 19 15 13 24 13 C33 13 38 19 38 31 Z" fill="#2E6B41" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><Path d="M36 31 L45 31 C45 34.5 41 35.5 36 34.5 Z" fill="#2E6B41" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><Path d="M8 31 H38" stroke={INK} strokeWidth={2} /><Path d="M23 14 C20 19 20 26 21 31" fill="none" stroke="#DCEBD9" strokeWidth={1.6} strokeLinecap="round" /><Circle cx={24} cy={12.5} r={2.2} fill={INK} /></>,
  gorro: <><Path d="M10 31 C10 19 16 14 24 14 C32 14 38 19 38 31 Z" fill="#6A4C9C" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><Rect x={8.5} y={30} width={31} height={7} rx={2.5} fill="#EFE7F4" stroke={INK} strokeWidth={2} /><Path d="M14 31 V36 M19 31 V36 M24 31 V36 M29 31 V36 M34 31 V36" stroke="#6A4C9C" strokeWidth={1.4} /><Circle cx={24} cy={11} r={4} fill="#EFE7F4" stroke={INK} strokeWidth={2} /></>,
  coroa: <><Path d="M8 34 L9 15 L17 24 L24 11 L31 24 L39 15 L40 34 Z" fill="#C8A15A" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><Rect x={8} y={33} width={32} height={5} rx={1.5} fill="#7E5F25" stroke={INK} strokeWidth={2} /><Circle cx={24} cy={27} r={2.6} fill="#D8573E" /><Circle cx={15.5} cy={29} r={1.8} fill="#6A4C9C" /><Circle cx={32.5} cy={29} r={1.8} fill="#6A4C9C" /></>,
  chapeu_palha: <><Ellipse cx={24} cy={31} rx={22} ry={6} fill="#DDBD7E" stroke={INK} strokeWidth={2} /><Path d="M14 31 C14 21 18 17 24 17 C30 17 34 21 34 31 Z" fill="#DDBD7E" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><Rect x={14.5} y={25} width={19} height={4} fill="#D8573E" /><Path d="M8 32 L11 30 M38 30 L41 32 M17 20 L20 22 M28 22 L31 20" stroke="#7E5F25" strokeWidth={1.2} strokeLinecap="round" /></>,
  boina: <><Path d="M6 28 C6 20 16 15 26 15 C37 15 42 21 42 27 C42 32 34 34 24 34 C14 34 6 33 6 28 Z" fill="#12333A" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><Path d="M25 15 L26 9.5" stroke="#12333A" strokeWidth={3} strokeLinecap="round" /></>,
  bandana_toquio: <><Path d="M6 22 Q24 14 42 22 L42 29 Q24 21 6 29 Z" fill="#FFFFFF" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><Circle cx={24} cy={21.5} r={4} fill="#B83A28" /><Path d="M40 25 L46 33 L41 34 Z M40 26 L44 38 L39 36 Z" fill="#FFFFFF" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" /></>,
  lenco_tango: <><Path d="M8 16 Q24 22 40 16 L24 40 Z" fill="#B03F29" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><Circle cx={19} cy={22} r={1.8} fill="#2A2622" /><Circle cx={28} cy={23} r={1.8} fill="#2A2622" /><Circle cx={24} cy={30} r={1.8} fill="#2A2622" /><Circle cx={24} cy={16.5} r={3.4} fill="#B03F29" stroke={INK} strokeWidth={1.6} /></>,
  cachecol_lisboa: <><Path d="M7 17 Q24 25 41 17 L41 24 Q24 32 7 24 Z" fill="#2E5E9E" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><Rect x={12} y={23} width={8} height={18} rx={1.5} fill="#2E5E9E" stroke={INK} strokeWidth={2} /><Path d="M12 29 H20 M12 34 H20" stroke="#DDBD7E" strokeWidth={2} /><Path d="M15 21 V26 M24 22 V28 M33 21 V26" stroke="#FFFFFF" strokeWidth={1.4} /></>,
  bandana: <><Path d="M8 16 Q24 22 40 16 L24 40 Z" fill="#D8573E" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><Circle cx={19} cy={23} r={1.6} fill="#FFFFFF" /><Circle cx={28} cy={24} r={1.6} fill="#FFFFFF" /><Circle cx={24} cy={31} r={1.6} fill="#FFFFFF" /></>,
  oculos: <><Rect x={5} y={18} width={16} height={11} rx={4.5} fill="#1C1A18" stroke={INK} strokeWidth={1.6} /><Rect x={27} y={18} width={16} height={11} rx={4.5} fill="#1C1A18" stroke={INK} strokeWidth={1.6} /><Path d="M21 21 Q24 18.5 27 21" stroke="#1C1A18" strokeWidth={2.4} fill="none" /><Path d="M8 21 L13 20.5 M30 21 L35 20.5" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" opacity={0.6} /></>,
  gravata: <><Path d="M24 24 L10 16 L10 32 Z" fill="#2E5E9E" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><Path d="M24 24 L38 16 L38 32 Z" fill="#2E5E9E" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><Circle cx={24} cy={24} r={4} fill="#24497C" stroke={INK} strokeWidth={2} /></>,
  quepe: <><Path d="M8 28 Q10 12 24 11 Q38 12 40 28 Z" fill="#1D4A52" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><Rect x={7} y={26} width={34} height={6} rx={3} fill="#12333A" /><Path d="M11 32 Q24 40 37 32" stroke="#0B2328" strokeWidth={3} fill="none" strokeLinecap="round" /><Path d="M20 19 L24 17 L28 19 L24 21 Z" fill="#DDBD7E" /></>,
  coleira: <><Path d="M6 20 Q24 32 42 20" stroke="#C8A15A" strokeWidth={6} fill="none" strokeLinecap="round" /><Path d="M6 20 Q24 32 42 20" stroke="#7E5F25" strokeWidth={1} fill="none" strokeDasharray="2 3" /><Circle cx={24} cy={32} r={5} fill="#DDBD7E" stroke="#7E5F25" strokeWidth={2} /></>,
  kit: <><Path d="M9 22 Q11 8 24 7 Q37 8 39 22 Z" fill="#1D4A52" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><Rect x={8} y={20} width={32} height={5} rx={2.5} fill="#12333A" /><Path d="M24 36 L14 31 L14 41 Z" fill="#2E5E9E" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" /><Path d="M24 36 L34 31 L34 41 Z" fill="#2E5E9E" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" /><Circle cx={24} cy={36} r={2.6} fill="#24497C" /></>,
};

/** Desenho pequeno de um item da loja (grade e chips). Item desconhecido = etiqueta. */
export function ItemArt({ id, size = 44, dim }: { id: string; size?: number; dim?: boolean }) {
  const art = ITEMS[id];
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" opacity={dim ? 0.5 : 1}>
      {art ?? <Path d="M9 24 V11 H22 L39 28 L26 41 Z" fill="#F3E6C6" stroke={INK} strokeWidth={2} strokeLinejoin="round" />}
    </Svg>
  );
}
