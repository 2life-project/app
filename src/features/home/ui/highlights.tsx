import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { to } from '@/shared/nav';
import { size, space, theme } from '@/shared/theme';
import { ActionLink, Card, Pressable, SectionCaption, Stack, Text } from '@/shared/ui';

import type { Highlight } from '../model/highlights';

/** Карточки сводки — по две в ряд: столько помещается числом крупным шрифтом. */
const PER_ROW = 2;

/** Сводка дня: показатели карточками, как в «Здоровье». Нажатие открывает графики. */
export function Highlights({ highlights }: { highlights: readonly Highlight[] }) {
  if (highlights.length === 0) return null;

  const rows: Highlight[][] = [];
  for (let index = 0; index < highlights.length; index += PER_ROW) {
    rows.push(highlights.slice(index, index + PER_ROW));
  }

  return (
    <Stack gap="sm">
      <Stack direction="row" justify="space-between" align="center">
        <SectionCaption>TODAY</SectionCaption>
        <ActionLink label="Body" chevron onPress={() => router.push(to.body())} />
      </Stack>
      {rows.map((row) => (
        <View key={row[0]?.id} style={styles.row}>
          {row.map((item) => (
            <HighlightCard key={item.id} item={item} />
          ))}
          {row.length < PER_ROW ? <View style={styles.cell} /> : null}
        </View>
      ))}
    </Stack>
  );
}

function HighlightCard({ item }: { item: Highlight }) {
  const metric = item.metric;
  const open = metric ? () => router.push(to.metric(metric)) : undefined;

  return (
    <Pressable style={styles.cell} onPress={open} disabled={!open}>
      <Card style={styles.card}>
        <View style={styles.head}>
          <Feather name={item.icon} size={size.icon.sm} color={theme.color[item.tone].solid} />
          <Text variant="caption" tone="muted">
            {item.title.toUpperCase()}
          </Text>
        </View>
        <View style={styles.value}>
          <Text variant="metric">{item.value}</Text>
          {item.unit ? (
            <Text variant="bodySmall" tone="muted">
              {item.unit}
            </Text>
          ) : null}
        </View>
        {item.caption ? (
          <Text variant="caption" tone="muted">
            {item.caption}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  cell: { flex: 1 },
  card: { gap: space.xs },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  value: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
});
