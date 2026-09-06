import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { to } from '@/shared/nav';
import { space } from '@/shared/theme';
import {
  ActionLink,
  BarChart,
  DatePager,
  InfoCard,
  LineChart,
  LinkCard,
  RadioRow,
  SectionCaption,
  SectionSummary,
  Sheet,
  Stack,
  StatTile,
  Text,
  WidgetCard,
} from '@/shared/ui';

import { BODY_SYSTEM, RING_NOTE, RING_OPTIONS, type BodySection } from '../model/systems';

/**
 * Единый шаблон системы тела. В макете четыре системы отличаются только
 * содержимым, поэтому разметка одна: расхождения между ними были бы багом.
 */
export function BodySystem({ section }: { section: BodySection }) {
  const options = RING_OPTIONS[section];
  const [pickerOpen, setPickerOpen] = useState(false);
  const [ringMetric, setRingMetric] = useState(options[0]?.id ?? '');
  const data = BODY_SYSTEM[section];

  return (
    <Stack gap="md">
      <DatePager label="Today · July 13" />

      <SectionSummary
        title={data.title}
        action={{ label: 'Change', chevron: true, onPress: () => setPickerOpen(true) }}
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

      <Sheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Track in the ring"
        action={<ActionLink label="Done" onPress={() => setPickerOpen(false)} />}>
        <Stack gap="md">
          {options.map((option) => (
            <RadioRow
              key={option.id}
              title={option.title}
              subtitle={option.subtitle}
              selected={option.id === ringMetric}
              onPress={() => setRingMetric(option.id)}
            />
          ))}
          <Text variant="bodySmall" tone="muted">
            {RING_NOTE}
          </Text>
        </Stack>
      </Sheet>
    </Stack>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: space.sm },
});
