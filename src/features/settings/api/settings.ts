import { request } from '@/core/http/client';

import type { Profile } from './contract';

/** Ручки настроек: профиль человека и его цели. */

export function fetchProfile(signal?: AbortSignal): Promise<{ profile: Profile }> {
  return request<{ profile: Profile }>('/api/profile', { signal });
}
