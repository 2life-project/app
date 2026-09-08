import { router } from 'expo-router';

import { shortDay } from '@/shared/lib/day';
import { to } from '@/shared/nav';
import { Card, DatePager, InfoCard, LinkCard, ListRow, Stack, Text, WidgetCard } from '@/shared/ui';

import type { HomeData } from '../api/contract';
import { nutritionOf } from '../model/nutrition';

import { FuelSummary } from './fuel-summary';
import { MealStrip } from './meal-strip';

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

      {/* Четыре числа дня одной сеткой. Кольцо секции и плитки макросов
          показывали ровно их же — три вида одних цифр заставляли человека
          сверять их между собой. */}
      <Card>
        <FuelSummary cells={view.grid} />
      </Card>

      <Card>
        <Stack gap="sm">
          {view.rows.map(({ metric, ...row }) => (
            <ListRow
              key={row.id}
              title={row.title}
              subtitle={row.subtitle}
              trailing={row.value}
              onPress={metric ? () => router.push(to.metric(metric)) : undefined}
            />
          ))}
        </Stack>
      </Card>

      {/* Приёмы пищи — главное действие раздела: нажатие ведёт прямо к
          добавлению, а не на промежуточный список. */}
      <WidgetCard title="Meals" caption={view.meals === 0 ? 'nothing logged yet' : undefined}>
        <MealStrip dailyGoal={view.goalCalories} />
      </WidgetCard>

      <InfoCard title={view.insight.title} text={view.insight.text} />

      <LinkCard label="More charts" onPress={() => router.push(to.metric('calories'))} />
    </Stack>
  );
}
