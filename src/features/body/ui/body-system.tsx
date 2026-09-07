import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useQuery } from '@/core/http/use-query';
import { shortDay } from '@/shared/lib/day';
import { to } from '@/shared/nav';
import { space } from '@/shared/theme';
import {
  ActionLink,
  BarChart,
  Card,
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

import { fetchSubsystem, saveRingMetric, subsystemKey } from '../api/body';
import type { Subsystem } from '../api/contract';
import { RING_NOTE, subsystemView } from '../model/subsystem';

/**
 * Единый шаблон системы тела. В макете четыре системы отличаются только
 * содержимым, поэтому разметка одна: расхождения между ними были бы багом.
 * Содержимое теперь целиком с сервера — включая то, какой показатель стоит
 * в кольце и какие ещё можно туда поставить.
 */
export function BodySystem({
  section,
  date,
  timeZone,
  fallback,
}: {
  section: Subsystem;
  date: string;
  timeZone: string;
  /** Что показать, пока данных нет: загрузка или ошибка раздела. */
  fallback: React.ReactNode;
}) {
  const query = useQuery(subsystemKey(section, date, timeZone), (signal) =>
    fetchSubsystem(section, date, timeZone, signal),
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const data = query.data;
  if (!data) return <Stack gap="md">{fallback}</Stack>;

  const view = subsystemView(data);

  return (
    <Stack gap="md">
      <DatePager label={`Today · ${shortDay(data.date)}`} />

      <SectionSummary
        title={view.title}
        action={
          data.ring.configurable
            ? { label: 'Change', chevron: true, onPress: () => setPickerOpen(true) }
            : { label: 'Body', chevron: true, onPress: () => router.push(to.body()) }
        }
        caption={<SectionCaption>{view.caption}</SectionCaption>}
        ring={view.ring}
        rows={view.rows.map((row) => ({
          ...row,
          onPress: () => router.push(to.metric(row.id)),
        }))}
      />

      {view.tiles.length > 0 ? (
        <Card>
          <View style={styles.tiles}>
            {view.tiles.map((tile) => (
              <StatTile key={tile.label} {...tile} />
            ))}
          </View>
        </Card>
      ) : null}

      {view.charts.map((chart, index) => (
        <WidgetCard key={chart.id} title={chart.title} caption={chart.caption}>
          {index === 0 ? (
            <BarChart values={chart.values} highlightIndex={chart.values.length - 1} />
          ) : (
            <LineChart values={chart.values} />
          )}
        </WidgetCard>
      ))}

      {/* Биохимия ведётся отдельным процессом — подсистема только показывает,
          где её искать, и не делает вид, что ведёт её сама. */}
      {data.medicalData.suggestedKeys.length > 0 ? (
        <InfoCard
          title="Lab markers for this system"
          text={`${data.medicalData.suggestedKeys.join(', ')} — they come from documents, not from the band, and live in the medical card.`}
          link={{ label: 'Medical card', onPress: () => router.push(to.records()) }}
        />
      ) : null}

      <LinkCard label="More charts" onPress={() => router.push(to.metric(data.ring.metric))} />

      <Sheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Track in the ring"
        action={<ActionLink label="Done" onPress={() => setPickerOpen(false)} />}>
        <Stack gap="md">
          {view.options.map((option) => (
            <RadioRow
              key={option.id}
              title={option.title}
              subtitle={option.subtitle}
              selected={option.id === data.preferences.ringMetric}
              onPress={() => {
                void saveRingMetric(data.preferences, option.id).then(() => query.refresh());
                setPickerOpen(false);
              }}
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
