import { EMPTY_PROFILE, type BodyProfile } from '@/shared/domain';

import { toDeviceProfile } from './profile-sync';

const filled: BodyProfile = {
  ...EMPTY_PROFILE,
  heightCm: 182,
  weightKg: 78,
  birthDate: '1992-04-17',
  sex: 'male',
  wearHand: 'left',
};

describe('toDeviceProfile', () => {
  it('дата рождения разбирается на три поля', () => {
    expect(toDeviceProfile(filled)?.birth).toEqual({ year: 1992, month: 4, day: 17 });
  });

  it('пол переводится в шкалу прошивки: женский 0, мужской 1', () => {
    expect(toDeviceProfile({ ...filled, sex: 'male' })?.gender).toBe(1);
    expect(toDeviceProfile({ ...filled, sex: 'female' })?.gender).toBe(0);
  });

  it('рука ношения переводится в номер', () => {
    expect(toDeviceProfile({ ...filled, wearHand: 'left' })?.wearHand).toBe(0);
    expect(toDeviceProfile({ ...filled, wearHand: 'right' })?.wearHand).toBe(1);
  });

  it('заданная человеком длина шага важнее расчёта от роста', () => {
    const device = toDeviceProfile({ ...filled, walkStepCm: 70, runStepCm: 110 });
    expect(device?.walkStepLength).toBe(70);
    expect(device?.runStepLength).toBe(110);
  });

  it('незаданная длина шага считается от роста', () => {
    expect(toDeviceProfile(filled)?.walkStepLength).toBe(76);
    expect(toDeviceProfile(filled)?.runStepLength).toBe(100);
  });

  it('невозможная длина шага заменяется расчётом, а не уезжает на устройство', () => {
    expect(toDeviceProfile({ ...filled, walkStepCm: 900 })?.walkStepLength).toBe(76);
  });

  it('неполный профиль не отправляется по частям', () => {
    expect(toDeviceProfile(EMPTY_PROFILE)).toBeNull();
    expect(toDeviceProfile({ ...filled, weightKg: null })).toBeNull();
    expect(toDeviceProfile({ ...filled, sex: null })).toBeNull();
    expect(toDeviceProfile({ ...filled, wearHand: null })).toBeNull();
  });

  it('рост и вес вне пределов протокола не отправляются', () => {
    expect(toDeviceProfile({ ...filled, heightCm: 300 })).toBeNull();
    expect(toDeviceProfile({ ...filled, weightKg: 1 })).toBeNull();
  });

  it('возраст считается, а не берётся из поля', () => {
    // Проверяем, что число вообще есть и правдоподобно: точный год зависит от
    // сегодняшней даты, и прибивать его к календарю запуска тестов нельзя.
    const age = toDeviceProfile(filled)?.age ?? 0;
    expect(age).toBeGreaterThan(30);
    expect(age).toBeLessThan(60);
  });
});
