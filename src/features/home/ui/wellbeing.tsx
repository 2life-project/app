import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { to } from '@/shared/nav';
import { space } from '@/shared/theme';
import {
  Banner,
  DatePager,
  InfoCard,
  LineChart,
  LinkCard,
  ProgressRing,
  Stack,
  StatTile,
  SummaryRow,
  Text,
  WidgetCard,
} from '@/shared/ui';

import {
  DAY_SCORE_7_DAYS,
  WELLBEING_PARTS,
  WELLBEING_SUMMARY,
  WHAT_IT_MEANS,
} from '../model/wellbeing';

export function Wellbeing() {
  return (
    <Stack gap="md">
      <DatePager label="Today · July 13" />

      <WidgetCard
        title="Wellbeing"
        action={{ label: 'Change', chevron: true, onPress: () => router.push(to.checkIn()) }}>
        <Stack gap="md">
          <Stack direction="row" gap="xs">
            <Text variant="caption" tone="muted">
              DAY SCORE ·
            </Text>
            <Text variant="caption" tone="success">
              +0.6 vs weekly average
            </Text>
          </Stack>
          <View style={styles.body}>
            <ProgressRing
              size={132}
              thickness={12}
              value={0.78}
              valueLabel="7.8"
              note="a good day"
              valueVariant="headline"
            />
            <View style={styles.summary}>
              {WELLBEING_SUMMARY.map((row, index) => (
                <SummaryRow
                  key={row.id}
                  title={row.title}
                  subtitle={row.subtitle}
                  value={row.value}
                  divider={index > 0}
                  onPress={() => router.push(to.checkIn())}
                />
              ))}
            </View>
          </View>
        </Stack>
      </WidgetCard>

      <WidgetCard title="What it is made of">
        <Stack gap="sm">
          <View style={styles.parts}>
            {WELLBEING_PARTS.slice(0, 2).map((part) => (
              <StatTile key={part.label} {...part} />
            ))}
          </View>
          <View style={styles.parts}>
            {WELLBEING_PARTS.slice(2).map((part) => (
              <StatTile key={part.label} {...part} />
            ))}
          </View>
        </Stack>
      </WidgetCard>

      <Banner
        title="Today’s check-in is done"
        subtitle="at 13:20 · short, 3 questions"
        action={{ label: 'Edit', onPress: () => router.push(to.checkIn()) }}
      />

      <WidgetCard title="Day score · 7 days" action={{ label: 'base 7.2', onPress: () => {} }}>
        <LineChart values={DAY_SCORE_7_DAYS} />
      </WidgetCard>

      <InfoCard title="What this means" text={WHAT_IT_MEANS} />

      <LinkCard label="More charts" onPress={() => router.push(to.metric('wellbeing'))} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  body: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  summary: { flex: 1 },
  parts: { flexDirection: 'row', gap: space.sm },
});
