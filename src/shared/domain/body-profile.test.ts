import {
  ageOf,
  EMPTY_PROFILE,
  isComplete,
  LIMITS,
  runStepOf,
  sexOf,
  walkStepOf,
  within,
} from './body-profile';

describe('ageOf', () => {
  it('день рождения ещё не наступил — год не засчитан', () => {
    expect(ageOf('1992-12-31', new Date('2026-09-09'))).toBe(33);
  });

  it('день рождения уже прошёл', () => {
    expect(ageOf('1992-01-31', new Date('2026-09-09'))).toBe(34);
  });

  it('день рождения сегодня — год засчитан', () => {
    expect(ageOf('1992-09-09', new Date('2026-09-09'))).toBe(34);
  });

  it('без даты возраста нет', () => {
    expect(ageOf(null)).toBeNull();
    expect(ageOf('')).toBeNull();
  });

  it('битая дата не превращается в число', () => {
    expect(ageOf('позавчера')).toBeNull();
    expect(ageOf('1992-13')).toBeNull();
  });

  it('дата из будущего — не возраст', () => {
    expect(ageOf('2030-01-01', new Date('2026-09-09'))).toBeNull();
  });
});

describe('длина шага', () => {
  it('считается от роста', () => {
    expect(walkStepOf(182)).toBe(76);
    expect(runStepOf(182)).toBe(100);
  });

  it('шаг бега длиннее шага ходьбы', () => {
    expect(runStepOf(160)).toBeGreaterThan(walkStepOf(160));
  });

  it('оценка по росту укладывается в пределы устройства', () => {
    for (const height of [LIMITS.heightCm.min, 175, LIMITS.heightCm.max]) {
      expect(within(walkStepOf(height), LIMITS.stepCm)).not.toBeNull();
      expect(within(runStepOf(height), LIMITS.stepCm)).not.toBeNull();
    }
  });
});

describe('within', () => {
  it('значение вне предела отбрасывается, а не сворачивается', () => {
    expect(within(260, LIMITS.heightCm)).toBeNull();
    expect(within(99, LIMITS.heightCm)).toBeNull();
  });

  it('границы включительны', () => {
    expect(within(100, LIMITS.heightCm)).toBe(100);
    expect(within(250, LIMITS.heightCm)).toBe(250);
  });

  it('дробное округляется', () => {
    expect(within(78.6, LIMITS.weightKg)).toBe(79);
  });

  it('пустое и нечисло остаются пустыми', () => {
    expect(within(null, LIMITS.weightKg)).toBeNull();
    expect(within(Number.NaN, LIMITS.weightKg)).toBeNull();
  });
});

describe('sexOf', () => {
  it('читается по первой букве на обоих языках', () => {
    expect(sexOf('female')).toBe('female');
    expect(sexOf('MALE')).toBe('male');
    expect(sexOf('женский')).toBe('female');
    expect(sexOf('Мужской')).toBe('male');
  });

  it('незнакомое слово не превращается в пол по умолчанию', () => {
    expect(sexOf('other')).toBeNull();
    expect(sexOf('')).toBeNull();
    expect(sexOf(null)).toBeNull();
  });
});

describe('isComplete', () => {
  const filled = {
    ...EMPTY_PROFILE,
    heightCm: 182,
    weightKg: 78,
    birthDate: '1992-04-17',
    sex: 'male' as const,
    wearHand: 'left' as const,
  };

  it('заполненного профиля достаточно', () => {
    expect(isComplete(filled)).toBe(true);
  });

  it('без любого обязательного поля профиль не полон', () => {
    expect(isComplete({ ...filled, heightCm: null })).toBe(false);
    expect(isComplete({ ...filled, weightKg: null })).toBe(false);
    expect(isComplete({ ...filled, sex: null })).toBe(false);
    expect(isComplete({ ...filled, birthDate: null })).toBe(false);
    // Рука ношения — тоже: её дефолт смещает дистанцию у каждого правши.
    expect(isComplete({ ...filled, wearHand: null })).toBe(false);
  });

  it('длина шага не обязательна: её считают от роста', () => {
    expect(isComplete({ ...filled, walkStepCm: null, runStepCm: null })).toBe(true);
  });
});
