import { router } from 'expo-router';

import { to } from '@/shared/nav';
import { Text, TimelineRow, WidgetCard } from '@/shared/ui';

import type { HomeData } from '../api/contract';
import { nextOf, planHref, timeOf, titleOf } from '../model/plan';
import { nextItemsOf } from '../model/widget-of';

/**
 * Следующий пункт дня — сам пункт, а не обещание, что он где-то ждёт.
 * Сервер называет его в виджете; не назвал — берём первый несделанный из плана.
 */
export function NowWidget({ home, data }: { home: HomeData; data: unknown }) {
  const item = nextItemsOf(data)[0] ?? nextOf(home.plan.items);

  return (
    <WidgetCard
      title="Next up"
      action={{ label: 'Journal', chevron: true, onPress: () => router.push(to.journal()) }}>
      {item ? (
        <TimelineRow
          time={timeOf(item)}
          title={titleOf(item)}
          subtitle={item.domain}
          state="next"
          onPress={() => router.push(planHref(item))}
        />
      ) : (
        <Text tone="muted">Nothing scheduled for the rest of the day.</Text>
      )}
    </WidgetCard>
  );
}
