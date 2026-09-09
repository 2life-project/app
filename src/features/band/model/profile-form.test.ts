import { EMPTY_PROFILE } from '@/shared/domain';

import { draftOf, isBirthDate, numberOf, profileErrors, toProfile } from './profile-form';

const valid = {
  height: '182',
  weight: '78',
  birth: '1992-04-17',
  sex: 'male' as const,
  hand: 'left' as const,
  walk: '',
  run: '',
};

describe('numberOf', () => {
  it('запятая читается как разделитель', () => {
    expect(numberOf('78,5')).toBe(78.5);
  });

  it('пустое поле — не ноль', () => {
    expect(numberOf('')).toBeNull();
    expect(numberOf('   ')).toBeNull();
  });

  it('не число остаётся пустым', () => {
    expect(numberOf('сто')).toBeNull();
  });
});

describe('isBirthDate', () => {
  const now = new Date('2026-09-09');

  it('принимает формат сервера', () => {
    expect(isBirthDate('1992-04-17', now)).toBe(true);
  });

  it('другие записи даты не принимаются: сервер их потом не примет', () => {
    expect(isBirthDate('1992-4-17', now)).toBe(false);
    expect(isBirthDate('17.04.1992', now)).toBe(false);
    expect(isBirthDate('1992/04/17', now)).toBe(false);
  });

  it('несуществующий день не проходит', () => {
    expect(isBirthDate('1992-02-31', now)).toBe(false);
    expect(isBirthDate('1992-13-01', now)).toBe(false);
  });

  it('високосный день существует', () => {
    expect(isBirthDate('1992-02-29', now)).toBe(true);
  });

  it('дата из будущего — не дата рождения', () => {
    expect(isBirthDate('2030-01-01', now)).toBe(false);
  });
});

describe('profileErrors', () => {
  it('полный правильный черновик не даёт ошибок', () => {
    expect(profileErrors(valid)).toEqual({});
  });

  it('пустое поле — ошибка, а не молчаливый пропуск', () => {
    const errors = profileErrors({ ...valid, height: '', weight: '', birth: '', sex: null });
    expect(Object.keys(errors).sort()).toEqual(['birth', 'height', 'sex', 'weight']);
  });

  it('значения вне пределов устройства не проходят', () => {
    expect(profileErrors({ ...valid, height: '300' }).height).toBeDefined();
    expect(profileErrors({ ...valid, weight: '10' }).weight).toBeDefined();
  });

  it('длина шага не обязательна', () => {
    expect(profileErrors({ ...valid, walk: '', run: '' })).toEqual({});
  });
});

describe('draftOf и toProfile', () => {
  it('пустой профиль даёт пустой черновик', () => {
    expect(draftOf(EMPTY_PROFILE)).toEqual({
      height: '',
      weight: '',
      birth: '',
      sex: null,
      hand: 'left',
      walk: '',
      run: '',
    });
  });

  it('оборот черновик → профиль → черновик ничего не теряет', () => {
    const profile = { ...EMPTY_PROFILE, ...toProfile(valid) };
    expect(draftOf(profile)).toEqual(valid);
  });

  it('незаполненная длина шага остаётся пустой, а не нулевой', () => {
    expect(toProfile(valid).walkStepCm).toBeNull();
  });
});
