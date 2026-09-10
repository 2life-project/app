import { ageOf, LIMITS, type BodyProfile, type Hand, type Sex } from '@/shared/domain';

/**
 * Черновик формы профиля.
 *
 * Поля ввода отдают строки, и держать их числами до нажатия «сохранить»
 * нельзя: пока человек стирает «182», чтобы набрать «183», значение проходит
 * через пустую строку и одну цифру. Числом это было бы ростом 1 см.
 */
export type ProfileDraft = {
  height: string;
  weight: string;
  birth: string;
  sex: Sex | null;
  hand: Hand | null;
  /** Длина шага: пусто — считаем от роста. */
  walk: string;
  run: string;
};

export function draftOf(profile: BodyProfile): ProfileDraft {
  return {
    height: text(profile.heightCm),
    weight: text(profile.weightKg),
    birth: profile.birthDate ?? '',
    sex: profile.sex,
    hand: profile.wearHand,
    walk: text(profile.walkStepCm),
    run: text(profile.runStepCm),
  };
}

function text(value: number | null): string {
  return value === null ? '' : String(value);
}

/** Число из введённого текста. Запятая — тот же разделитель, что и точка. */
export function numberOf(input: string): number | null {
  const trimmed = input.trim().replace(',', '.');
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/**
 * Дата в том же виде, в каком её отдаёт сервер. Разбираем строго: `2026-9-9`
 * и `09.04.1992` человек напечатать может, а сервер потом такое не примет.
 */
export function isBirthDate(input: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const [year, month, day] = input.split('-').map(Number);
  if (!year || !month || !day || month > 12 || day > 31) return false;

  // Календарь проверяем самим конструктором: 31 февраля пройдёт любую проверку
  // по диапазонам, а датой не является.
  const at = new Date(Date.UTC(year, month - 1, day));
  if (at.getUTCMonth() + 1 !== month || at.getUTCDate() !== day) return false;

  return ageOf(input, now) !== null;
}

export type ProfileErrors = Partial<Record<'height' | 'weight' | 'birth' | 'sex' | 'hand', string>>;

/**
 * Что мешает сохранить. Пустое поле — тоже ошибка: неполный профиль на
 * устройство не уедет вовсе, и человек, заполнивший половину, решил бы, что
 * браслет откалиброван.
 */
export function profileErrors(draft: ProfileDraft): ProfileErrors {
  const errors: ProfileErrors = {};
  const height = numberOf(draft.height);
  const weight = numberOf(draft.weight);

  if (height === null) errors.height = 'Enter your height in cm.';
  else if (height < LIMITS.heightCm.min || height > LIMITS.heightCm.max) {
    errors.height = `Between ${LIMITS.heightCm.min} and ${LIMITS.heightCm.max} cm.`;
  }

  if (weight === null) errors.weight = 'Enter your weight in kg.';
  else if (weight < LIMITS.weightKg.min || weight > LIMITS.weightKg.max) {
    errors.weight = `Between ${LIMITS.weightKg.min} and ${LIMITS.weightKg.max} kg.`;
  }

  if (!isBirthDate(draft.birth)) errors.birth = 'Use YYYY-MM-DD, for example 1992-04-17.';
  if (draft.sex === null) errors.sex = 'The band needs it to estimate energy.';
  if (draft.hand === null) errors.hand = 'The band tells a wrist raise from a hand movement by it.';

  return errors;
}

/**
 * Черновик в профиль. Вызывать только когда ошибок нет: пустые поля здесь
 * становятся `null`, и половина профиля молча заменит целый.
 */
export function toProfile(draft: ProfileDraft): Partial<BodyProfile> {
  return {
    heightCm: numberOf(draft.height),
    weightKg: numberOf(draft.weight),
    birthDate: draft.birth.trim() === '' ? null : draft.birth.trim(),
    sex: draft.sex,
    walkStepCm: numberOf(draft.walk),
    runStepCm: numberOf(draft.run),
    wearHand: draft.hand,
  };
}
