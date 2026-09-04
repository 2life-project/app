import { Easing } from 'react-native';

/** Длительности анимаций. Больше 320 мс интерфейс начинает «тормозить». */
export const duration = {
  instant: 120,
  fast: 180,
  base: 240,
  slow: 320,
} as const;

export const easing = {
  /** Основная кривая продукта — вода: быстрый вход, мягкая остановка. */
  liquid: Easing.bezier(0.22, 1, 0.36, 1),
  /** Пружина для появления карточек и шитов. */
  gel: Easing.bezier(0.34, 1.56, 0.64, 1),
} as const;
