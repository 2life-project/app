import { router } from 'expo-router';
import { useState } from 'react';

import { reportFailure } from '@/core/http/client';
import { to } from '@/shared/nav';
import {
  Button,
  CheckCircle,
  InfoCard,
  LinkCard,
  ListRow,
  SectionCaption,
  SectionSummary,
  Stack,
  Text,
  WidgetCard,
} from '@/shared/ui';

import type { HomeData } from '../api/contract';
import { markPlanItem } from '../api/home';
import { intakeRowsOf, planCounts } from '../model/plan';
import { COURSE_HINT, WHY_COURSES } from '../model/supplements';

import { DayPager, type DayProps } from './day-pager';

/**
 * Приёмы дня приходят пунктами объединённого плана; у каждого — готовое
 * действие для отметки. Раздел показывает их строками и отмечает через это
 * действие, а не собирает адрес отметки сам.
 *
 * Отметка меняет строку на месте: перечитывать ради галочки всю Главную —
 * два запроса и мигание ленты — незачем, ответ сервера говорит достаточно.
 */
export function Supplements({ home, today, onShift }: { home: HomeData } & DayProps) {
  /** Отметки, поставленные с этого экрана: сервер их принял, лента ещё старая. */
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const rows = intakeRowsOf(home.plan.items, marked);
  const { done, total } = planCounts(home.plan, marked);

  const mark = (id: string, taken: boolean) => {
    const item = home.plan.items.find((candidate) => candidate.id === id);
    if (!item) return;

    setBusy(id);
    setFailed(false);
    markPlanItem(item, taken ? 'taken' : 'pending')
      .then(() => setMarked({ ...marked, [id]: taken }))
      .catch((failure: unknown) => {
        // Отказ обязан быть виден: молча отскочившая галочка выглядит как
        // «кнопка не работает», и причины на экране нет.
        reportFailure('Приём не отметился', failure);
        setFailed(true);
      })
      .finally(() => setBusy(null));
  };

  return (
    <Stack gap="md">
      <DayPager date={home.date} today={today} onShift={onShift} />

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

          {rows.map((row) => (
            <ListRow
              key={row.id}
              leading={
                <CheckCircle
                  checked={row.done}
                  // Пока отметка идёт, вторая не уходит: две подряд
                  // записали бы приём дважды.
                  onPress={busy === null ? () => mark(row.id, !row.done) : undefined}
                />
              }
              title={row.title}
              subtitle={row.time}
              done={row.done}
            />
          ))}

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
