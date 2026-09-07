import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { shortDay } from '@/shared/lib/day';
import { to } from '@/shared/nav';
import { space } from '@/shared/theme';
import {
  Button,
  Card,
  DatePager,
  InfoCard,
  LinkCard,
  SectionCaption,
  SectionSummary,
  Stack,
  StatTile,
  Text,
  WidgetCard,
} from '@/shared/ui';

import type { HomeData } from '../api/contract';
import { nutritionOf } from '../model/nutrition';

export function Nutrition({ home }: { home: HomeData }) {
  const view = nutritionOf(home);

  if (!view) {
    return (
      <Stack gap="md">
        <DatePager label={`Today · ${shortDay(home.date)}`} />
        <Card variant="sunken">
          <Text tone="muted">Nutrition data did not load for this day.</Text>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <DatePager label={`Today · ${shortDay(home.date)}`} />

      <SectionSummary
        title="Nutrition"
        action={{ label: 'Add', chevron: true, onPress: () => router.push(to.meal('new')) }}
        caption={<SectionCaption>{view.caption}</SectionCaption>}
        ring={view.ring}
        rows={view.rows.map(({ metric, ...row }) => ({
          ...row,
          onPress: metric ? () => router.push(to.metric(metric)) : undefined,
        }))}
      />

      <Card>
        <View style={styles.macros}>
          {view.macros.map((macro) => (
            <StatTile key={macro.label} {...macro} />
          ))}
        </View>
      </Card>

      <WidgetCard title="Meals">
        <Stack gap="sm">
          <Text tone="muted">
            {view.meals === 0
              ? 'Nothing logged today.'
              : 'Today’s meals are recorded — open one to see it.'}
          </Text>
          <Button
            label="+ Add a meal"
            variant="dashed"
            onPress={() => router.push(to.meal('new'))}
          />
        </Stack>
      </WidgetCard>

      <InfoCard title={view.insight.title} text={view.insight.text} />

      <LinkCard label="More charts" onPress={() => router.push(to.metric('calories'))} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  macros: { flexDirection: 'row', gap: space.sm },
});
