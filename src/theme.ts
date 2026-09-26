export const C = {
  cover: '#1D4A52',
  coverDark: '#12333A',
  coverDeep: '#0B2328',
  gold: '#C8A15A',
  goldLight: '#DDBD7E',
  goldDark: '#7E5F25',
  goldPale: '#F3E6C6',
  paper: '#F6EEDC',
  paper2: '#EFE3C8',
  paper3: '#E6D6B4',
  sheet: '#FBF6EA',
  line: '#D9C7A2',
  ink: '#2A2622',
  inkSoft: '#655B4F',
  inkFaint: '#9A8E7C',
  coral: '#D8573E',
  coralInk: '#B03F29',
  coralPale: '#F7DCCF',
  aqua: '#4BA89C',
  aquaInk: '#2A7268',
  aquaPale: '#D8EDE7',
  blue: '#2E5E9E',
  purple: '#6A4C9C',
  purpleInk: '#4E3578',
  purplePale: '#EFE7F4',
  green: '#357E4C',
  greenPale: '#DCEBD9',
  amber: '#9E6C06',
  amberPale: '#F6E6BF',
  red: '#B83A28',
  redPale: '#F5D6CD',
  photo: '#DDE8E6',
  yellowCard: '#FBF3D2',
  yellowLine: '#D8C27A',
  white: '#FFFFFF',
};

export const F = {
  serif: 'DMSerifDisplay_400Regular',
  body: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyXBold: 'Nunito_800ExtraBold',
  bodyBlack: 'Nunito_900Black',
  bodyItalic: 'Nunito_700Bold_Italic',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
};

export const COVER_COLORS = ['#1D4A52', '#6E2436', '#2B3A67', '#3F5A2E', '#4A3426'];

export const STATUS_UI = {
  em_dia: { label: 'EM DIA', color: C.green, bg: C.greenPale },
  atencao: { label: 'ATENÇÃO', color: C.amber, bg: C.amberPale },
  atrasado: { label: 'ATRASADO', color: C.red, bg: C.redPale },
  carimbado: { label: 'CARIMBADO', color: C.blue, bg: C.aquaPale },
} as const;

export const LEVEL_UI = { color: C.purple, ink: C.purpleInk, bg: C.purplePale };
