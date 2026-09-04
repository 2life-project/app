import { router } from 'expo-router';

import { to } from '@/shared/nav';
import {
  Button,
  Card,
  CheckCircle,
  DatePager,
  InfoCard,
  LinkCard,
  ListRow,
  ProgressBar,
  SectionCaption,
  SectionSummary,
  Stack,
  Text,
  WidgetCard,
} from '@/shared/ui';

import { SUPPLEMENT_STACKS } from '../model/overview';
import { ACTIVE_COURSE, COURSE_HINT, SUPPLEMENTS_SUMMARY, WHY_COURSES } from '../model/supplements';

export function Supplements() {
  return (
    <Stack gap="md">
      <DatePager label="Today · July 13" />

      <SectionSummary
        title="Supplements"
        action={{ label: 'All', chevron: true, onPress: () => router.push(to.course('all')) }}
        caption={<SectionCaption>COURSES TODAY · next at 14:00</SectionCaption>}
        ring={{ value: 1 / 3, valueLabel: '1/3', note: 'taken', tone: 'warning' }}
        rows={SUPPLEMENTS_SUMMARY.map((row) => ({
          ...row,
          onPress: () => router.push(to.course(row.id)),
        }))}
      />

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
