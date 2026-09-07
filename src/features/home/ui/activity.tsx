import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { shortDay } from '@/shared/lib/day';
import { to } from '@/shared/nav';
import { space } from '@/shared/theme';
import {
  Banner,
  Card,
  DatePager,
  InfoCard,
  LinkCard,
  SectionCaption,
  SectionSummary,
  Stack,
  StatTile,
  Text,
} from '@/shared/ui';

import type { HomeData } from '../api/contract';
import { activityOf } from '../model/activity';

/**
 * Активность дня. Истории нагрузки в ответе Главной нет — графики периода
 * живут на экране показателя, туда и ведёт ссылка внизу.
 */
export function Activity({ home }: { home: HomeData }) {
  const view = activityOf(home);

  if (!view) {
    return (
      <Stack gap="md">
        <DatePager label={`Today · ${shortDay(home.date)}`} />
        <Card variant="sunken">
          <Text tone="muted">Movement data did not load for this day.</Text>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <DatePager label={`Today · ${shortDay(home.date)}`} />

      {view.available ? null : (
        <Banner
          tone="warning"
          title="No movement data"
          subtitle="The source is not being read right now."
          action={{ label: 'Device', onPress: () => router.push(to.device()) }}
        />
      )}

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
