import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { request } from '@/core/http/client';
import { logger } from '@/core/log/logger';

/**
 * Профиль тела: рост, вес, пол, дата рождения и то, как человек носит браслет.
 *
 * Живёт здесь, а не в фиче, потому что читают его двое: «Настройки» показывают
 * человеку его данные, а браслет по ним считает дистанцию и калории. Без
 * профиля устройство считает по заводским значениям, а приложение читает
 * результат как измеренный факт — систематическая ошибка уходит во все
 * производные числа разом.
 *
 * Рост, вес, пол и дату рождения знает сервер. Длину шага и руку ношения он не
 * хранит: это нужно только устройству, поэтому они лежат на телефоне.
 */

export type Sex = 'female' | 'male';
export type Hand = 'left' | 'right';

export type BodyProfile = {
  heightCm: number | null;
  weightKg: number | null;
  /** `YYYY-MM-DD`, как отдаёт сервер. */
  birthDate: string | null;
  sex: Sex | null;
  /** Длина шага в сантиметрах. `null` — считаем от роста. */
  walkStepCm: number | null;
  runStepCm: number | null;
  /**
   * На какой руке носят. Без ответа — `null`, а не «левая»: прошивка по этому
   * полю отличает подъём руки от взмаха, и молчаливый левый дефолт смещает
   * дистанцию у каждого правши, который до формы не дошёл.
   */
  wearHand: Hand | null;
};

export const EMPTY_PROFILE: BodyProfile = {
  heightCm: null,
  weightKg: null,
  birthDate: null,
  sex: null,
  walkStepCm: null,
  runStepCm: null,
  wearHand: null,
};

/**
 * Пределы взяты из протокола: рост, вес и длина шага уезжают на устройство по
 * одному байту. Значение вне диапазона там молча свернулось бы по модулю 256 —
 * рост 260 стал бы четырьмя сантиметрами, и человек об этом не узнал бы.
 */
export const LIMITS = {
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 30, max: 250 },
  stepCm: { min: 30, max: 150 },
} as const;

/** Доля роста, дающая длину шага. Оценка производителей трекеров, не измерение. */
const WALK_RATIO = 0.415;
const RUN_RATIO = 0.55;

export function walkStepOf(heightCm: number): number {
  return Math.round(heightCm * WALK_RATIO);
}

export function runStepOf(heightCm: number): number {
  return Math.round(heightCm * RUN_RATIO);
}

/** Полных лет на указанный момент. Без даты рождения возраста нет. */
export function ageOf(birthDate: string | null, now = new Date()): number | null {
  if (!birthDate) return null;

  const [year, month, day] = birthDate.split('-').map(Number);
  if (!year || !month || !day) return null;

  let age = now.getFullYear() - year;
  const beforeBirthday =
    now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day);
  if (beforeBirthday) age -= 1;

  return age >= 0 && age < 130 ? age : null;
}

/**
 * Хватает ли профиля, чтобы отправить его на устройство.
 *
 * Пол и дата рождения обязательны наравне с ростом и весом: расход энергии
 * прошивка считает по всем четырём, и без любого из них она подставит своё.
 * Рука ношения — по той же причине: по ней прошивка отличает подъём руки от
 * взмаха, и её дефолт смещает дистанцию у половины людей.
 */
export function isComplete(profile: BodyProfile): boolean {
  return (
    profile.heightCm !== null &&
    profile.weightKg !== null &&
    profile.sex !== null &&
    profile.wearHand !== null &&
    ageOf(profile.birthDate) !== null
  );
}

/** Число в допустимых пределах или `null`: наружу уходит только то, что примет устройство. */
export function within(value: number | null, limit: { min: number; max: number }): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return rounded >= limit.min && rounded <= limit.max ? rounded : null;
}

/**
 * Пол из ответа сервера. Словарь значений в спеке не перечислен, поэтому
 * читаем по первой букве и незнакомое слово оставляем пустым: подставить
 * «мужской» по умолчанию значит сдвинуть расчёт энергии у половины людей.
 */
export function sexOf(value: string | null | undefined): Sex | null {
  const word = value?.trim().toLowerCase();
  if (!word) return null;
  if (word.startsWith('f') || word.startsWith('ж')) return 'female';
  if (word.startsWith('m') || word.startsWith('м')) return 'male';
  return null;
}

// ------------------------------------------------------------------ хранение

const KEY = '2life:body-profile';

let profile: BodyProfile = EMPTY_PROFILE;
const listeners = new Set<() => void>();

function publish() {
  for (const listener of listeners) listener();
}

/**
 * Первое чтение с диска догоняет уже сделанную запись: если человек успел
 * заполнить форму до ответа диска, старое значение затирать нельзя.
 */
let touched = false;

void AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (touched || raw === null) return;
    profile = { ...EMPTY_PROFILE, ...(JSON.parse(raw) as Partial<BodyProfile>) };
    publish();
  })
  .catch((failure: unknown) => logger.warn('Профиль тела не прочитался', { failure }));

export function setBodyProfile(patch: Partial<BodyProfile>): BodyProfile {
  touched = true;
  profile = { ...profile, ...patch };
  publish();

  void AsyncStorage.setItem(KEY, JSON.stringify(profile)).catch((failure: unknown) =>
    logger.warn('Профиль тела не сохранился', { failure }),
  );

  return profile;
}

/**
 * Забыть тело человека.
 *
 * Рост, вес, пол и дата рождения принадлежат человеку, а не телефону: при
 * выходе из аккаунта они обязаны исчезнуть, иначе следующий вошедший увидит
 * чужие цифры — и его браслет будет считать по чужому телу.
 */
export function clearBodyProfile(): void {
  touched = true;
  profile = EMPTY_PROFILE;
  publish();
  void AsyncStorage.removeItem(KEY).catch(() => undefined);
}

export function useBodyProfile(): BodyProfile {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => profile,
  );
}

/** Форма ответа `/api/profile` в той части, которая описывает тело. */
type ServerProfile = {
  profile?: {
    sex: string | null;
    dateOfBirth: string | null;
    heightCm: number | null;
    weightKg: number | null;
  };
};

/**
 * Подтянуть с сервера то, что он знает о теле.
 *
 * Серверное значение не затирает введённое человеком: форму профиля он
 * заполняет на экране браслета ради калибровки, и молча вернуть туда пустой
 * серверный рост значило бы сбросить настройку устройства без его ведома.
 * Пустые поля, наоборот, заполняются — ради этого запрос и делается.
 */
export async function syncBodyProfile(signal?: AbortSignal): Promise<BodyProfile> {
  try {
    const answer = await request<ServerProfile>('/api/profile', { signal });
    const server = answer.profile;
    if (!server) return profile;

    return setBodyProfile({
      heightCm: profile.heightCm ?? within(server.heightCm, LIMITS.heightCm),
      weightKg: profile.weightKg ?? within(server.weightKg, LIMITS.weightKg),
      birthDate: profile.birthDate ?? server.dateOfBirth,
      sex: profile.sex ?? sexOf(server.sex),
    });
  } catch (failure) {
    // Профиль на телефоне уже есть, и жить без сервера он умеет: это
    // дозаполнение, а не загрузка экрана. Ронять из-за него нечего.
    logger.warn('Профиль тела не подтянулся с сервера', { failure });
    return profile;
  }
}
