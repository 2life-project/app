import { router } from 'expo-router';

import { shortDay } from '@/shared/lib/day';
import { to } from '@/shared/nav';
import {
  Button,
  DatePager,
  InfoCard,
  LinkCard,
  SectionCaption,
  SectionSummary,
  Stack,
  Text,
  WidgetCard,
} from '@/shared/ui';

import type { HomeData } from '../api/contract';
import { COURSE_HINT, WHY_COURSES } from '../model/supplements';

/**
 * Приёмы дня едут пунктами плана, и их состав контракт пока не раскрывает.
 * Поэтому раздел показывает то, что в ответе действительно есть — счёт по
 * плану, — и ведёт в курсы, а не рисует строки, которых не получал.
 */
export function Supplements({ home }: { home: HomeData }) {
  const { done, total } = home.plan;

  return (
    <Stack gap="md">
      <DatePager label={`Today · ${shortDay(home.date)}`} />

      <SectionSummary
        title="Supplements"
        action={{ label: 'All', chevron: true, onPress: () => router.push(to.course('all')) }}
        caption={<SectionCaption>PLANNED TODAY</SectionCaption>}
        ring={{
          value: total > 0 ? done / total : null,
          valueLabel: total > 0 ? `${done}/${total}` : '—',
          note: 'done',
        }}
        rows={[
          { id: 'planned', title: 'Planned', subtitle: 'items today', value: String(total) },
          { id: 'done', title: 'Done', subtitle: 'marked so far', value: String(done) },
          { id: 'left', title: 'Left', subtitle: 'still waiting', value: String(total - done) },
        ].map((row) => ({ ...row, onPress: () => router.push(to.course('all')) }))}
      />

      <WidgetCard
        title="Courses today"
        action={{
          label: 'All courses',
          chevron: true,
          onPress: () => router.push(to.course('all')),
        }}>
        <Stack gap="sm">
          <Text tone="muted">
            {total > 0
              ? 'Today’s doses are part of the plan — open the courses to mark them.'
              : 'No doses are planned for today.'}
          </Text>
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

      <InfoCard title="Why courses, not pills" text={WHY_COURSES} />

      <LinkCard label="All courses and history" onPress={() => router.push(to.course('all'))} />
    </Stack>
  );
}
