import { router } from 'expo-router';

import { to } from '@/shared/nav';
import { ListRow, ProgressBar, Stack, Text, WidgetCard } from '@/shared/ui';

import { dosesOf } from '../model/widget-of';

/** Сколько приёмов показывать на Главной: остальные — в разделе добавок. */
const SHOWN = 4;

/**
 * Приёмы дня: что, когда и принято ли. Отметить приём можно в разделе добавок
 * — там же курсы и запасы; Главная отвечает на вопрос «что сегодня и где я».
 */
export function MedsWidget({ data }: { data: unknown }) {
  const view = dosesOf(data);
  const open = () => router.push(to.course('all'));

  return (
    <WidgetCard
      title="Supplements"
      caption={view && view.total > 0 ? `${view.taken} of ${view.total} taken` : undefined}
      action={{ label: 'Courses', chevron: true, onPress: open }}>
      {!view || view.rows.length === 0 ? (
        <Text tone="muted">No doses planned for today.</Text>
      ) : (
        <Stack gap="sm">
          <ProgressBar value={view.total > 0 ? view.taken / view.total : 0} tone="success" />
          <Stack gap="xs">
            {view.rows.slice(0, SHOWN).map((row) => (
              <ListRow
                key={row.id}
                title={row.title}
                subtitle={row.detail}
                trailing={row.when}
                note={row.status === 'skipped' ? 'skipped' : undefined}
                done={row.status === 'taken'}
                onPress={open}
              />
            ))}
          </Stack>
          {view.rows.length > SHOWN ? (
            <Text variant="bodySmall" tone="muted">
              {view.rows.length - SHOWN} more in supplements
            </Text>
          ) : null}
        </Stack>
      )}
    </WidgetCard>
  );
}
