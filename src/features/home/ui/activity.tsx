import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { vitalsOf, type BandReadings } from '@/shared/domain';
import { to } from '@/shared/nav';
import { space } from '@/shared/theme';
import {
  Banner,
  Card,
  InfoCard,
  LinkCard,
  ListRow,
  SectionCaption,
  SectionSummary,
  Stack,
  StatTile,
  Text,
} from '@/shared/ui';

import type { HomeData } from '../api/contract';
import { activityOf } from '../model/activity';

import { DayPager, type DayProps } from './day-pager';

/**
 * Активность дня. Истории нагрузки в ответе Главной нет — графики периода
 * живут на экране показателя, туда и ведёт ссылка внизу.
 */
export function Activity({
  home,
  band,
  device,
  today,
  onShift,
}: {
  home: HomeData;
  band: BandReadings | null;
  /** Шаги и занятия браслета подробно: карточки даёт маршрут, фича фиче не видна. */
  device?: ReactNode;
} & DayProps) {
  const view = activityOf(home, band);
  const vitals = vitalsOf(band);

  if (!view) {
    return (
      <Stack gap="md">
        <DayPager date={home.date} today={today} onShift={onShift} />
        <Card variant="sunken">
          <Text tone="muted">Movement data did not load for this day.</Text>
        </Card>
        {device}
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <DayPager date={home.date} today={today} onShift={onShift} />

      {view.available ? null : (
        <Banner
          tone="warning"
          title="No movement data"
          subtitle="The source is not being read right now."
          action={{ label: 'Device', onPress: () => router.push(to.device()) }}
        />
      )}

      {view.bandNote ? (
        <Text variant="bodySmall" tone="muted">
          {view.bandNote}
        </Text>
      ) : null}

      <SectionSummary
        title="Activity"
        action={{ label: 'Body', chevron: true, onPress: () => router.push(to.body()) }}
        caption={<SectionCaption>MOVEMENT SCORE</SectionCaption>}
        ring={view.ring}
        rows={view.rows.map(({ metric, ...row }) => ({
          ...row,
          onPress: metric ? () => router.push(to.metric(metric)) : undefined,
        }))}
      />

      <Card>
        <Stack gap="sm">
          <View style={styles.tiles}>
            {view.tiles.slice(0, 2).map((tile) => (
              <StatTile key={tile.label} {...tile} />
            ))}
          </View>
          <View style={styles.tiles}>
            {view.tiles.slice(2).map((tile) => (
              <StatTile key={tile.label} {...tile} />
            ))}
          </View>
        </Stack>
      </Card>

      {/* То, чего сервер не считает: пульс покоя, ночь, вариабельность. Эти
          числа не спорят с оценкой движения — они про другое. */}
      {vitals.length > 0 ? (
        <Stack gap="sm">
          <SectionCaption>MEASURED ON YOUR WRIST</SectionCaption>
          <Card>
            <Stack gap="xs">
              {vitals.map((vital) => (
                <ListRow
                  key={vital.id}
                  title={vital.title}
                  subtitle={vital.note}
                  trailing={vital.value}
                />
              ))}
            </Stack>
          </Card>
        </Stack>
      ) : null}

      {device}
      <InfoCard
        title="How the score is built"
        text={`Steps, active minutes, exercise intensity, energy and stand hours are weighted into one number by ${view.algorithm.name}. Today it rests on ${view.algorithm.coverage} of the day’s data, with ${view.algorithm.confidence} confidence.`}
      />

      <LinkCard label="More charts" onPress={() => router.push(to.metric('steps'))} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: space.sm },
});
