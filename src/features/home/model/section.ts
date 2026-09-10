import { logger } from '@/core/log/logger';
import type { Tone } from '@/shared/theme';

import type { Section } from '../api/contract';

/**
 * Каждая секция ответа отвечает за себя: у неё свой статус и своя ошибка.
 * Экран обязан это уважать — иначе одна недоступная подсистема превращает всю
 * Главную в экран ошибки, хотя остальные данные пришли.
 */
export function dataOf<T>(section: Section<T> | undefined): T | null {
  if (!section || section.status !== 'available') return null;
  return section.data;
}

/** Статусные цвета: ими красят кольца, точки и полосы, но не текст. */
export type StatusTone = Extract<Tone, 'success' | 'warning' | 'danger'>;

/**
 * Цвет статуса приходит от сервера — клиент его не вычисляет. Из выданных
 * примеров известны только `neutral` и `steady`, оба нейтральные; остальной
 * словарь сервер ещё не показывал. Неизвестное слово красит нейтрально:
 * назначить ему цвет наугад значит выдать догадку за медицинский статус.
 */
const KNOWN_TONES: Record<string, StatusTone | undefined> = {
  neutral: undefined,
  steady: undefined,
};

/**
 * Слово пишется в лог один раз за запуск. Функция зовётся из отрисовки, то есть
 * на каждый рендер каждого кольца: без этого одно незнакомое слово вытесняло бы
 * из следа логов всё остальное, а нового оно после первого раза не сообщает.
 */
const reported = new Set<string>();

export function serverTone(tone: string | null | undefined): StatusTone | undefined {
  if (!tone) return undefined;
  if (tone in KNOWN_TONES) return KNOWN_TONES[tone];

  // Так словарь сервера и обнаруживается: в разработке видно, что пришло.
  if (!reported.has(tone)) {
    reported.add(tone);
    logger.debug('Неизвестный тон от сервера', { tone });
  }
  return undefined;
}
