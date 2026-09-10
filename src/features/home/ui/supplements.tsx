import { router } from 'expo-router';
import { useState } from 'react';

import { logger } from '@/core/log/logger';
import { shortDay } from '@/shared/lib/day';
import { to } from '@/shared/nav';
import {
  Button,
  CheckCircle,
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

import type { HomeData, PlanItem } from '../api/contract';
import { markPlanItem } from '../api/home';
import { intakesOf, planRowsOf } from '../model/plan';
import { COURSE_HINT, WHY_COURSES } from '../model/supplements';

/**
 * Приёмы дня приходят пунктами объединённого плана; у каждого — готовое
 * действие для отметки. Раздел показывает их строками и отмечает через это
 * действие, а не собирает адрес отметки сам.
 */
export function Supplements({ home, onChanged }: { home: HomeData; onChanged: () => void }) {
  const { done, total } = home.plan;
  const intakes = intakesOf(home.plan.items);
  const rows = planRowsOf(intakes);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const mark = (item: PlanItem, taken: boolean) => {
    setBusy(item.id);
    setFailed(false);
    markPlanItem(item, taken ? 'taken' : 'pending')
      .then(onChanged)
      .catch((failure: unknown) => {
        // Отказ обязан быть виден: молча отскочившая галочка выглядит как
        // «кнопка не работает», и причины на экране нет.
        logger.error('Приём не отметился', { id: item.id, failure });
        setFailed(true);
      })
      .finally(() => setBusy(null));
  };

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
        title="Doses today"
        caption={rows.length > 0 ? String(rows.length) : undefined}
        action={{
          label: 'All courses',
          chevron: true,
          onPress: () => router.push(to.course('all')),
        }}>
        <Stack gap="sm">
          {failed ? <Text tone="danger">The mark did not save. Try again.</Text> : null}

          {rows.map((row, index) => {
            const item = intakes[index];
            return (
              <ListRow
                key={row.id}
                leading={
                  <CheckCircle
                    checked={row.done}
                    // Пока отметка идёт, вторая не уходит: две подряд
                    // записали бы приём дважды.
                    onPress={item && busy === null ? () => mark(item, !row.done) : undefined}
                  />
                }
                title={row.title}
                subtitle={row.time}
                done={row.done}
              />
            );
          })}

          {rows.length === 0 ? <Text tone="muted">No doses are planned for today.</Text> : null}

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
