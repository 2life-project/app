import { palette } from './palette';

/**
 * Семантические цветовые токены. Компоненты обращаются только сюда:
 * имя говорит о роли («граница карточки»), а не о пигменте («светло-голубой»).
 *
 * Тёмной темы нет by design — продукт живёт на светлом небе. Если она когда-то
 * появится, здесь возникнет вторая карта с теми же ключами, и это будет
 * единственная правка (см. docs/design-tokens.md).
 */
export const color = {
  /** Фон приложения: градиент небо → трава, снизу вверх. */
  backdrop: ['#bfe2f2', '#d6edf6', '#e6f4ee', '#dceeca', '#cbe6a8'] as const,

  surface: palette.white[1000],
  surfaceGlass: palette.white[680],
  surfaceSunken: palette.sky[100],
  surfaceEdge: palette.white[820],

  border: palette.ink[100],
  borderStrong: palette.ink[300],

  text: palette.ink[900],
  textSoft: palette.ink[700],
  textFaint: palette.ink[500],
  textGhost: palette.ink[300],
  textOnAccent: palette.white[1000],

  accent: palette.sky[500],
  accentPressed: palette.sky[600],
  accentSoft: palette.sky[200],
  accentDeep: palette.sky[900],

  /** Статус показателя. Только эти три — без «жёлтенького посветлее». */
  status: {
    ok: { fill: palette.leaf[400], soft: palette.leaf[100], deep: palette.leaf[700] },
    watch: { fill: palette.sun[400], soft: palette.sun[300], deep: '#a26b00' },
    alert: { fill: palette.coral[400], soft: palette.coral[300], deep: '#a53415' },
  },
} as const;

export type StatusTone = keyof typeof color.status;
