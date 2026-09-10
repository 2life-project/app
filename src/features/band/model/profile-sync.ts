import { logger } from '@/core/log/logger';
import {
  ageOf,
  isComplete,
  LIMITS,
  runStepOf,
  walkStepOf,
  within,
  type BodyProfile,
} from '@/shared/domain';

import type { Band } from '../api';
// Из самого файла профиля, а не через вход драйвера: вход тянет за собой
// транспорт и радио, а этому переводу нужны только числа протокола.
import { WearHand, type UserProfile } from '../api/profile';

/**
 * Профиль тела на устройство.
 *
 * Приложение и прошивка говорят о человеке разными словами: у нас пол — слово,
 * а дата рождения строка, у неё пол — число, а дата тремя полями. Перевод живёт
 * здесь, потому что это знание о протоколе, а не о человеке.
 */

/**
 * Собрать то, что примет устройство. `null` — профиля не хватает: отправлять
 * половину нельзя, прошивка недостающее заменит заводским значением, и
 * получится смесь настоящего роста с чужим весом.
 */
export function toDeviceProfile(profile: BodyProfile): UserProfile | null {
  if (!isComplete(profile)) return null;

  const age = ageOf(profile.birthDate);
  const height = within(profile.heightCm, LIMITS.heightCm);
  const weight = within(profile.weightKg, LIMITS.weightKg);
  const [year, month, day] = (profile.birthDate ?? '').split('-').map(Number);

  if (age === null || height === null || weight === null || !year || !month || !day) return null;

  // Длину шага человек может задать сам — он знает её точнее любой формулы. Не
  // задал или задал невозможную — считаем от роста: это оценка, но устройство
  // без неё считает дистанцию по своей, снятой с чужого тела.
  const walk = within(profile.walkStepCm, LIMITS.stepCm) ?? walkStepOf(height);
  const run = within(profile.runStepCm, LIMITS.stepCm) ?? runStepOf(height);

  return {
    age,
    birth: { year, month, day },
    gender: profile.sex === 'male' ? 1 : 0,
    height,
    weight,
    walkStepLength: walk,
    runStepLength: run,
    wearHand: profile.wearHand === 'right' ? WearHand.right : WearHand.left,
  };
}

/**
 * Отправить профиль на браслет.
 *
 * Возвращает, ушёл ли он: экран показывает состояние калибровки, и «отправили»
 * при неполном профиле было бы неправдой. Отказ радио — не повод ронять
 * подключение: связь уже есть, а профиль уедет при следующей попытке.
 */
export async function sendProfile(band: Band, profile: BodyProfile): Promise<boolean> {
  const device = toDeviceProfile(profile);
  if (!device) return false;

  try {
    await band.settings.setProfile(device);
    return true;
  } catch (failure) {
    logger.warn('band: профиль не записался на устройство', { reason: String(failure) });
    return false;
  }
}
