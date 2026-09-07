import { useQuery } from '@/core/http/use-query';
import { longDay } from '@/shared/lib/day';
import { ActionLink, ListRow, Sheet, Stack, Tag, Text } from '@/shared/ui';

import type { CalendarEvent } from '../api/contract';
import { eventKey, fetchEvent } from '../api/journal';
import { detailTags, detailText, eventTime } from '../model/journal';

/**
 * Подробности события. Строка списка знает только заголовок и время — текст
 * заметки, метки и источник живут в отдельной ручке, и без неё нажатие на
 * строку никуда не ведёт.
 *
 * Пока подробности едут, показываем то, что уже есть в списке: экран не должен
 * пустеть на время запроса.
 */
export function EventSheet({
  event,
  timeZone,
  onClose,
}: {
  event: CalendarEvent | null;
  timeZone: string;
  onClose: () => void;
}) {
  const query = useQuery(event ? eventKey(event.id, timeZone) : null, (signal) =>
    fetchEvent(event?.id ?? '', timeZone, signal),
  );
  const full = query.data ?? event;

  return (
    <Sheet
      visible={event !== null}
      onClose={onClose}
      title={event?.title ?? ''}
      action={<ActionLink label="Close" onPress={onClose} />}>
      {full ? (
        <Stack gap="md">
          <Stack direction="row" gap="sm" wrap>
            <Tag label={full.layer} />
            <Tag label={full.status} />
            {detailTags(full).map((tag) => (
              <Tag key={tag} label={tag} tone="accent" />
            ))}
          </Stack>

          {detailText(full) ? <Text>{detailText(full)}</Text> : null}

          <Stack gap="sm">
            <ListRow title="When" trailing={`${longDay(full.date)} · ${eventTime(full)}`} />
            <ListRow title="Kind" trailing={full.kind} />
            {/* Источник объясняет, почему запись здесь: внесена руками или
                пришла из домена. Без него «recorded» ничего не говорит. */}
            <ListRow title="Source" subtitle={full.source.name} trailing={full.source.kind} />
          </Stack>

          {query.loading ? (
            <Text variant="bodySmall" tone="muted">
              Loading the details…
            </Text>
          ) : null}
        </Stack>
      ) : null}
    </Sheet>
  );
}
