import { shortDay } from '@/shared/lib/day';
import { ListRow, Stack, WidgetCard } from '@/shared/ui';

import type { SleepSession } from '../api';
import { clock, duration } from '../model/format';
import { dayKey } from '../model/history-store';

/**
 * Все ночи, которые телефон видел, — последней сверху. Одна ночь уже стоит
 * карточкой выше, список нужен со второй.
 */
export function SleepHistory({
  nights,
  onOpen,
}: {
  nights: readonly SleepSession[];
  onOpen: (night: SleepSession) => void;
}) {
  if (nights.length < 2) return null;
  const rows = [...nights].reverse();

  return (
    <WidgetCard
      variant="sunken"
      title="Sleep history"
      caption={`${rows.length} nights on this phone`}>
      <Stack gap="xs">
        {rows.map((night) => (
          <ListRow
            key={night.from.getTime()}
            title={shortDay(dayKey(night.to))}
            subtitle={`${clock(night.from)} — ${clock(night.to)} · ${night.efficiency}% efficiency`}
            trailing={duration(night.asleep)}
            onPress={() => onOpen(night)}
          />
        ))}
      </Stack>
    </WidgetCard>
  );
}
