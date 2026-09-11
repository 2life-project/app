import { router } from 'expo-router';

import { to } from '@/shared/nav';
import { Stack, Text, TimelineRow, WidgetCard } from '@/shared/ui';

import type { HomeData, PlanItem } from '../api/contract';
import { byTime, nextOf, planHref, timeOf, titleOf } from '../model/plan';

/** Сколько пунктов помещается на Главной: остальное — в журнале. */
const SHOWN = 5;

/**
 * План дня прямо на Главной: пункты по времени, сделанные — отмечены,
 * следующий — выделен. Карточка «открой журнал» при шести пунктах внутри
 * ответа сервера была бы отпиской.
 */
export function PlanWidget({ home }: { home: HomeData }) {
  const items = byTime(home.plan.items);
  const next = nextOf(items);
  const { done, total } = home.plan;

  return (
    <WidgetCard
      title="The plan"
      caption={total > 0 ? `${done} done · ${total - done} left today` : undefined}
      action={{ label: 'Journal', chevron: true, onPress: () => router.push(to.journal()) }}>
      {items.length === 0 ? (
        <Text tone="muted">Nothing planned for today.</Text>
      ) : (
        <Stack gap="xs">
          {items.slice(0, SHOWN).map((item) => (
            <TimelineRow
              key={item.id}
              time={timeOf(item)}
              title={titleOf(item)}
              subtitle={item.domain}
              state={stateOf(item, next)}
              onPress={() => router.push(planHref(item))}
            />
          ))}
          {items.length > SHOWN ? (
            <Text variant="bodySmall" tone="muted">
              {items.length - SHOWN} more in the journal
            </Text>
          ) : null}
        </Stack>
      )}
    </WidgetCard>
  );
}

function stateOf(item: PlanItem, next: PlanItem | null): 'done' | 'next' | 'upcoming' {
  if (item.status === 'done') return 'done';
  return next?.id === item.id ? 'next' : 'upcoming';
}
