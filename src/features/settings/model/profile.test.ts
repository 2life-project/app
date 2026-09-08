import type { SessionUser } from '@/core/auth';

import type { Profile } from '../api/contract';

import { displayName, initials, memberSince } from './profile';

const user = { username: 'yan', displayName: 'Yan' } as SessionUser;

describe('displayName', () => {
  it('имя из профиля важнее имени из сессии — его человек правил сам', () => {
    expect(displayName({ name: 'Антон Мамонов' } as Profile, user)).toBe('Антон Мамонов');
  });

  it('пустое имя в профиле не побеждает: падаем на сессию', () => {
    expect(displayName({ name: '  ' } as Profile, user)).toBe('Yan');
    expect(displayName(null, user)).toBe('Yan');
  });

  it('без имени вовсе остаётся логин', () => {
    expect(displayName(null, { username: 'yan' } as SessionUser)).toBe('yan');
    expect(displayName(null, null)).toBe('—');
  });
});

describe('initials', () => {
  it('две буквы у имени из двух слов, одна — у одного', () => {
    expect(initials('Антон Мамонов')).toBe('АМ');
    expect(initials('yan')).toBe('Y');
  });

  it('третье слово в инициалы не идёт', () => {
    expect(initials('Иван Иванович Иванов')).toBe('ИИ');
  });
});

describe('memberSince', () => {
  it('незаполненный профиль даты не даёт — она там ничего не значит', () => {
    expect(memberSince({ isDefault: true, createdAt: 1 } as Profile)).toBeNull();
    expect(memberSince(null)).toBeNull();
  });

  it('заполненный отдаёт месяц и год', () => {
    const at = Date.UTC(2026, 2, 14);
    expect(memberSince({ isDefault: false, createdAt: at } as Profile)).toBe('March 2026');
  });
});
