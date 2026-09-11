import { EMPTY_PROFILE, type BodyProfile } from './body-profile';
import { mergeServerProfile, type ServerBody } from './body-profile-sync';

const LOCAL: BodyProfile = {
  ...EMPTY_PROFILE,
  heightCm: 180,
  weightKg: 80,
  birthDate: '1990-05-01',
  sex: 'male',
  wearHand: 'left',
};

const SERVER: ServerBody = {
  id: 'p1',
  sex: 'female',
  dateOfBirth: '1992-01-02',
  heightCm: 165,
  weightKg: 60,
  isDefault: false,
};

describe('mergeServerProfile', () => {
  it('сервер главный, когда знает', () => {
    const { merged, push } = mergeServerProfile(LOCAL, SERVER);

    expect(merged).toEqual({ heightCm: 165, weightKg: 60, birthDate: '1992-01-02', sex: 'female' });
    expect(push).toBe(false);
  });

  it('пустое у сервера дозаполняется с телефона и уезжает', () => {
    const { merged, push } = mergeServerProfile(LOCAL, { ...SERVER, weightKg: null, sex: null });

    expect(merged).toMatchObject({ heightCm: 165, weightKg: 80, sex: 'male' });
    expect(push).toBe(true);
  });

  it('профиль по умолчанию — не знание: телефон главный целиком', () => {
    const { merged, push } = mergeServerProfile(LOCAL, { ...SERVER, isDefault: true });

    expect(merged).toMatchObject({ heightCm: 180, weightKg: 80, sex: 'male' });
    expect(push).toBe(true);
  });

  it('пусто и там и там — отправлять нечего', () => {
    expect(mergeServerProfile(EMPTY_PROFILE, { ...SERVER, isDefault: true }).push).toBe(false);
    expect(mergeServerProfile(EMPTY_PROFILE, undefined).push).toBe(false);
  });
});
