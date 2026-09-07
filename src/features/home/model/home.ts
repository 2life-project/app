import { useQuery, type Query } from '@/core/http/use-query';

import type { Decision, HomeData, HomeLayout } from '../api/contract';
import { fetchDecisions, fetchHomeData, fetchHomeLayout, homeKey } from '../api/home';

/** Раскладка и данные приходят вместе: без раскладки ленту нечем выстроить. */
export type HomeState = { layout: HomeLayout; home: HomeData };

export function useHome(date: string, timeZone: string): Query<HomeState> {
  return useQuery(homeKey(date, timeZone), async (signal) => {
    const [layout, home] = await Promise.all([
      fetchHomeLayout(signal),
      fetchHomeData(date, timeZone, signal),
    ]);
    return { layout, home };
  });
}

/**
 * Решения запрашиваются отдельно от ленты намеренно: они меняются в ответ на
 * действие пользователя, и обновлять из-за одной кнопки всю Главную незачем.
 */
export function useDecisions(): Query<readonly Decision[]> {
  return useQuery('decisions', (signal) => fetchDecisions(signal).then(({ items }) => items));
}

/** Решений, которые ждут ответа. Отложенные не считаются: они уже отвечены. */
export function pendingCount(decisions: readonly Decision[] | null): number {
  return (decisions ?? []).filter((decision) => decision.status === 'pending').length;
}
