import { router } from 'expo-router';

import { useQuery } from '@/core/http/use-query';
import { eventTitle } from '@/shared/domain';
import { longDay, useToday } from '@/shared/lib/day';
import { ActionLink, ListRow, SheetBody, Stack, Tag, Text } from '@/shared/ui';

import { eventKey, fetchEvent } from '../api/journal';
import { detailTags, detailText, eventTime } from '../model/journal';

/**
 * Подробности события. Строка списка знает только заголовок и время — текст
 * заметки, метки и источник живут в отдельной ручке.
 */
export function EventScreen({ id }: { id: string }) {
  const { timeZone } = useToday();
  const query = useQuery(eventKey(id, timeZone), (signal) => fetchEvent(id, timeZone, signal));
  const event = query.data;

  return (
    <SheetBody
      title={event ? eventTitle(event) : 'Event'}
      action={<ActionLink label="Close" onPress={() => router.back()} />}>
      {event ? (
        <>
          <Stack direction="row" gap="sm" wrap>
            <Tag label={event.layer} />
            <Tag label={event.status} />
            {detailTags(event).map((tag) => (
              <Tag key={tag} label={tag} tone="accent" />
            ))}
          </Stack>

          {detailText(event) ? <Text>{detailText(event)}</Text> : null}

          <Stack gap="sm">
            <ListRow title="When" trailing={`${longDay(event.date)} · ${eventTime(event)}`} />
            <ListRow title="Kind" trailing={event.kind} />
            {/* Источник объясняет, почему запись здесь: внесена руками или
                пришла из домена. Без него «recorded» ничего не говорит. */}
            <ListRow title="Source" subtitle={event.source.name} trailing={event.source.kind} />
          </Stack>
        </>
      ) : (
        <Text tone="muted">{query.loading ? 'Loading the details…' : 'It did not load.'}</Text>
      )}
    </SheetBody>
  );
}
