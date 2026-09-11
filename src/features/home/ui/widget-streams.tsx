import { router } from 'expo-router';

import { to } from '@/shared/nav';
import { ListRow, Stack, Text, WidgetCard } from '@/shared/ui';

import type { HomeData } from '../api/contract';
import { streamsOf } from '../model/widget-of';

/** Сколько потоков показывать: пульс, шаги, кислород и ещё пара — остальное в «Теле». */
const SHOWN = 6;

/** Живые значения — числами с источником, а не счётом «30 streams». */
export function StreamsWidget({ home }: { home: HomeData }) {
  const rows = streamsOf(home);
  const shown = rows.slice(0, SHOWN);

  return (
    <WidgetCard
      title="Live streams"
      caption={rows.length > 0 ? `${rows.length} signals today` : undefined}
      action={{ label: 'Body', chevron: true, onPress: () => router.push(to.body()) }}>
      {shown.length === 0 ? (
        <Text tone="muted">No device is streaming right now.</Text>
      ) : (
        <Stack gap="xs">
          {shown.map((row) => (
            <ListRow
              key={row.key}
              title={row.title}
              subtitle={`${row.source}${row.when ? ` · ${row.when}` : ''}`}
              trailing={row.value}
              trailingCaption={row.fresh ? undefined : 'stale'}
              onPress={() => router.push(to.metric(row.key))}
            />
          ))}
        </Stack>
      )}
    </WidgetCard>
  );
}
