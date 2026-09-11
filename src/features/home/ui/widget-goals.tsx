import { router } from 'expo-router';

import { to } from '@/shared/nav';
import { ListRow, Stack, Text, WidgetCard } from '@/shared/ui';

import type { HomeData } from '../api/contract';
import { goalsOf } from '../model/widget-of';

/** Цели протоколов — с целевым значением и сроком, а не счётом «2 goals». */
export function GoalsWidget({ home }: { home: HomeData }) {
  const rows = goalsOf(home);
  const open = () => router.push(to.protocols());

  return (
    <WidgetCard
      title="Protocols and goals"
      caption={
        rows.length > 0 ? `${rows.length} ${rows.length === 1 ? 'goal' : 'goals'}` : undefined
      }
      action={{ label: 'Protocols', chevron: true, onPress: open }}>
      {rows.length === 0 ? (
        <Text tone="muted">No goals set yet.</Text>
      ) : (
        <Stack gap="xs">
          {rows.map((row) => (
            <ListRow
              key={row.id}
              title={row.title}
              subtitle={row.by}
              trailing={row.target}
              onPress={open}
            />
          ))}
        </Stack>
      )}
    </WidgetCard>
  );
}
