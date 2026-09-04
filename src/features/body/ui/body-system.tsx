import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { to } from '@/shared/nav';
import { space } from '@/shared/theme';
import {
  BarChart,
  DatePager,
  InfoCard,
  LineChart,
  LinkCard,
  SectionCaption,
  SectionSummary,
  Stack,
  StatTile,
  Text,
  WidgetCard,
} from '@/shared/ui';

import { BODY_SYSTEM, type BodySection } from '../model/systems';

/**
 * Единый шаблон системы тела. В макете четыре системы отличаются только
 * содержимым, поэтому разметка одна: расхождения между ними были бы багом.
 */
export function BodySystem({ section }: { section: BodySection }) {
  const data = BODY_SYSTEM[section];

  return (
    <Stack gap="md">
      <DatePager label="Today · July 13" />

      <SectionSummary
        title={data.title}
        action={{ label: 'Change', chevron: true, onPress: () => router.push(to.metric(section)) }}
        caption={
          <SectionCaption>
            <Text variant="caption" tone="muted">
              {data.caption.label}
            </Text>
            <Text variant="caption" tone="success">
              {data.caption.accent}
            </Text>
          </SectionCaption>
        }
        ring={data.ring}
        rows={data.rows.map((row) => ({
          ...row,
          onPress: () => router.push(to.metric(row.id)),
        }))}
      />

      <WidgetCard title={data.today.title} action={{ label: data.today.note, onPress: () => {} }}>
        <View style={styles.tiles}>
          {data.today.tiles.map((tile) => (
            <StatTile key={tile.label} {...tile} />
          ))}
        </View>
      </WidgetCard>

      <WidgetCard title={data.bars.title} action={{ label: data.bars.note, onPress: () => {} }}>
        <BarChart values={data.bars.values} highlightIndex={data.bars.values.length - 1} />
      </WidgetCard>

      <WidgetCard title={data.line.title} action={{ label: data.line.note, onPress: () => {} }}>
        <LineChart values={data.line.values} tone={data.line.tone} />
      </WidgetCard>

      <InfoCard
        title="What this means"
        text={data.about}
        link={{ label: 'Learn more', onPress: () => router.push(to.metric(section)) }}
      />

      <LinkCard label="More charts" onPress={() => router.push(to.metric(section))} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: space.sm },
});
