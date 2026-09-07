import { router } from 'expo-router';

import { Stack, Text, WidgetCard } from '@/shared/ui';

import type { SummaryView } from '../model/summary';

/**
 * Карточка виджета, состав которого сервер пока не показывает: количество —
 * настоящее, из ответа, а строки лежат там, куда ведёт ссылка.
 */
export function SummaryWidget({ view }: { view: SummaryView }) {
  return (
    <WidgetCard
      title={view.title}
      caption={view.caption}
      action={{
        label: view.action.label,
        chevron: true,
        onPress: () => router.push(view.action.href),
      }}>
      <Stack gap="sm">
        <Text tone="muted">{view.description}</Text>
      </Stack>
    </WidgetCard>
  );
}
