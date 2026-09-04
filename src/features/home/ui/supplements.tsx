import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { to } from '@/shared/nav';
import { space } from '@/shared/theme';
import {
  Button,
  Card,
  CheckCircle,
  DatePager,
  InfoCard,
  LinkCard,
  ListRow,
  ProgressBar,
  ProgressRing,
  Stack,
  SummaryRow,
  Text,
  WidgetCard,
} from '@/shared/ui';

import { SUPPLEMENT_STACKS } from '../model/overview';
import { ACTIVE_COURSE, COURSE_HINT, SUPPLEMENTS_SUMMARY, WHY_COURSES } from '../model/supplements';

export function Supplements() {
  return (
    <Stack gap="md">
      <DatePager label="Today · July 13" />

      <WidgetCard
        title="Supplements"
        action={{ label: 'All', chevron: true, onPress: () => router.push(to.course('all')) }}>
        <Stack gap="md">
          <Text variant="caption" tone="muted">
            COURSES TODAY · next at 14:00
          </Text>
          <View style={styles.body}>
            <ProgressRing
              size={132}
              thickness={12}
              value={1 / 3}
              valueLabel="1/3"
              note="taken"
              tone="warning"
              valueVariant="headline"
            />
            <View style={styles.summary}>
              {SUPPLEMENTS_SUMMARY.map((row, index) => (
                <SummaryRow
                  key={row.id}
                  title={row.title}
                  subtitle={row.subtitle}
                  value={row.value}
                  divider={index > 0}
                  onPress={() => router.push(to.course(row.id))}
                />
              ))}
            </View>
          </View>
        </Stack>
      </WidgetCard>

      <WidgetCard
        title="Courses today"
        action={{
          label: 'All courses',
          chevron: true,
          onPress: () => router.push(to.course('all')),
        }}>
        <Stack gap="sm">
          {SUPPLEMENT_STACKS.map((stack) => (
            <ListRow
              key={stack.id}
              leading={<CheckCircle checked={stack.taken} />}
              title={stack.title}
              subtitle={stack.subtitle}
              trailing={stack.taken ? 'taken' : stack.status}
              done={stack.taken}
              onPress={() => router.push(to.course(stack.id))}
            />
          ))}
          <Button
            label="+ Add a course"
            variant="dashed"
            onPress={() => router.push(to.course('new'))}
          />
          <Text variant="bodySmall" tone="muted">
            {COURSE_HINT}
          </Text>
        </Stack>
      </WidgetCard>

      <Card>
        <Stack gap="sm">
          <Stack direction="row" justify="space-between" align="center">
            <Text variant="subtitle">{ACTIVE_COURSE.title}</Text>
            <Text variant="bodySmall" tone="muted">
              {ACTIVE_COURSE.percent}
            </Text>
          </Stack>
          <Text variant="bodySmall" tone="muted">
            {ACTIVE_COURSE.subtitle}
          </Text>
          <ProgressBar value={ACTIVE_COURSE.value} />
          <Text variant="bodySmall" tone="muted">
            {ACTIVE_COURSE.note}
          </Text>
        </Stack>
      </Card>

      <InfoCard title="Why courses, not pills" text={WHY_COURSES} />

      <LinkCard label="All courses and history" onPress={() => router.push(to.course('all'))} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  body: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  summary: { flex: 1 },
});
