import type { SessionUser } from '@/core/auth';

import type { Profile } from '../api/contract';

/**
 * Как назвать человека и что показать рядом. Имя приходит из двух мест —
 * профиль и сессия, — и они расходятся: в профиле оно заполняется позже.
 */
export function displayName(profile: Profile | null, user: SessionUser | null): string {
  const fromProfile = profile?.name?.trim();
  if (fromProfile) return fromProfile;
  return user?.displayName?.trim() || user?.username || '—';
}

/** Инициалы для кружка: две буквы у имени из двух слов, иначе одна. */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '—';
  const letters = words.slice(0, 2).map((word) => word[0] ?? '');
  return letters.join('').toUpperCase();
}

/**
 * С какого месяца человек в приложении. Сервер отдаёт метку времени в
 * миллисекундах; до первого сохранения профиля она бессмысленна — сервер сам
 * помечает такой профиль как значение по умолчанию.
 */
export function memberSince(profile: Profile | null): string | null {
  if (!profile || profile.isDefault || !profile.createdAt) return null;
  const at = new Date(profile.createdAt);
  if (Number.isNaN(at.getTime())) return null;
  return at.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
