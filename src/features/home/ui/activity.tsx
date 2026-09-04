import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { to } from '@/shared/nav';
import { radius, size, space, theme } from '@/shared/theme';
import {
  BarChart,
  DatePager,
  InfoCard,
  LinkCard,
  ListRow,
  SectionCaption,
  SectionSummary,
  Stack,
  Text,
  WidgetCard,
} from '@/shared/ui';

import { ABOUT_STRAIN, ACTIVITY_SUMMARY, STRAIN_30_DAYS, WORKOUTS } from '../model/activity';

export function Activity() {
  return (
    <Stack gap="md">
      <DatePager label="Today · July 13" />

      <SectionSummary
        title="Activity"
        action={{ label: 'Change', chevron: true, onPress: () => router.push(to.body()) }}
        caption={<SectionCaption>STRAIN · above your 14-day average</SectionCaption>}
        ring={{ value: 14.2 / 21, valueLabel: '14.2', note: 'of 21' }}
        rows={ACTIVITY_SUMMARY.map((row) => ({
          ...row,
          onPress: () => router.push(to.workout(row.id)),
        }))}
      />

      <WidgetCard
        title="What drove it"
        action={{ label: '+ Add', onPress: () => router.push(to.workout('new')) }}>
        <Stack gap="sm">
          {WORKOUTS.map((workout) => (
            <ListRow
              key={workout.id}
              leading={
                <View style={styles.icon}>
                  <Feather name={workout.icon} size={size.icon.md} color={theme.color.textMuted} />
                </View>
              }
              title={workout.title}
              subtitle={workout.subtitle}
              trailing={workout.value}
              trailingCaption="STRAIN"
              onPress={() => router.push(to.workout(workout.id))}
            />
          ))}
        </Stack>
      </WidgetCard>

      <WidgetCard title="Strain · 30 days" action={{ label: 'avg 11.8', onPress: () => {} }}>
        <Stack gap="md">
          <BarChart
            values={STRAIN_30_DAYS}
            highlightIndex={STRAIN_30_DAYS.length - 1}
            axis={['June 14', 'today']}
          />
          <View style={styles.footer}>
            <Text variant="body">Calories</Text>
            <Text variant="body" tone="muted">
              2,340 kcal · +9% vs base
            </Text>
          </View>
        </Stack>
      </WidgetCard>

      <InfoCard
        title="About strain"
        text={ABOUT_STRAIN}
        link={{ label: 'Learn more', onPress: () => router.push(to.metric('strain')) }}
      />

      <LinkCard label="More charts" onPress={() => router.push(to.metric('strain'))} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  body: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  summary: { flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: theme.color.neutral.surface,
  },
});
