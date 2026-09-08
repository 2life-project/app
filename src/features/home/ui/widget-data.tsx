import type Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';

import {
  formatMetric,
  metricBasis,
  metricUnitText,
  metricValueText,
  type MetricValue,
} from '@/shared/domain';
import { to } from '@/shared/nav';
import {
  BarChart,
  LineChart,
  ListRow,
  MacroGrid,
  MetricWidget,
  ProgressRing,
  Stack,
  StatTile,
  Text,
  WidgetCard,
} from '@/shared/ui';

import type { HomeData, WidgetType } from '../api/contract';
import { nutritionOf } from '../model/nutrition';
import type { RingView, SystemView } from '../model/vitals';

import { MealStrip } from './meal-strip';

type IconName = keyof typeof Feather.glyphMap;

/** Четыре кольца дня. Кольцо без шкалы показывает число и пустую дорожку. */
export function VitalsWidget({ rings }: { rings: readonly RingView[] }) {
  return (
    <WidgetCard
      title="Four rings"
      action={{ label: 'Details', onPress: () => router.push(to.body()) }}>
      <Stack direction="row" justify="space-between">
        {rings.map((ring) => (
          <ProgressRing
            key={ring.id}
            value={ring.fill}
            valueLabel={ring.valueLabel}
            label={ring.label}
            tone={ring.tone}
          />
        ))}
      </Stack>
    </WidgetCard>
  );
}

const SYSTEM_ICON: Partial<Record<WidgetType, IconName>> = {
  recover: 'moon',
  fuel: 'coffee',
  move: 'activity',
};

export function SystemWidget({ widget, view }: { widget: WidgetType; view: SystemView }) {
  return (
    <MetricWidget
      icon={SYSTEM_ICON[widget] ?? 'circle'}
      title={view.title}
      action={{ label: 'Body', onPress: () => router.push(to.body()) }}
      ring={view.ring}
      tiles={view.tiles}
    />
  );
}

/**
 * Питание отличается от прочих систем тем, что его можно пополнить прямо
 * отсюда: под числами стоит полоса приёмов, и нажатие ведёт к записи еды.
 */
export function FuelWidget({ home }: { home: HomeData }) {
  const view = nutritionOf(home);
  if (!view) return null;

  return (
    <WidgetCard title="Fuel" action={{ label: 'Nutrition', onPress: () => router.push(to.body()) }}>
      <Stack gap="lg">
        <MacroGrid cells={view.grid} />
        <MealStrip dailyGoal={view.goalCalories} />
      </Stack>
    </WidgetCard>
  );
}

/** Точки ряда без пропусков: график рисует то, что измерено, а не нули вместо. */
function seriesOf(metric: MetricValue | undefined): number[] {
  return (metric?.points ?? [])
    .map((point) => point.value)
    .filter((value): value is number => value !== null);
}

type CustomWidgetData = HomeData['widgets'][number];

/**
 * Виджет, собранный пользователем: рецепт называет вид и набор показателей,
 * сервер приносит их значения тем же конвертом, что и все остальные.
 */
export function CustomWidget({ widget }: { widget: CustomWidgetData }) {
  const { recipe, metrics } = widget.data;
  const first = metrics[0];

  return (
    <WidgetCard title={recipe.title}>
      {recipe.kind === 'line' ? <LineChart values={seriesOf(first)} /> : null}
      {recipe.kind === 'bar' ? <BarChart values={seriesOf(first)} /> : null}

      {recipe.kind === 'metric' ? (
        <Stack direction="row" gap="sm">
          {metrics.map((metric) => (
            <StatTile
              key={metric.key}
              label={metric.name.toUpperCase()}
              value={metricValueText(metric)}
              unit={metricUnitText(metric)}
              note={metricBasis(metric)}
            />
          ))}
        </Stack>
      ) : null}

      {recipe.kind === 'list' ? (
        <Stack gap="sm">
          {metrics.map((metric) => (
            <ListRow
              key={metric.key}
              title={metric.name}
              subtitle={metricBasis(metric)}
              trailing={formatMetric(metric)}
            />
          ))}
        </Stack>
      ) : null}

      {metrics.length === 0 ? <Text tone="muted">This widget has no metrics yet.</Text> : null}
    </WidgetCard>
  );
}
