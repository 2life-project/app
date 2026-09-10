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
  MetricWidget,
  ProgressRing,
  Stack,
  StatTile,
  Text,
  WidgetCard,
} from '@/shared/ui';

import type { HomeData, WidgetType } from '../api/contract';
import { customWidgetOf } from '../model/custom-widget';
import { nutritionOf } from '../model/nutrition';
import type { RingView, SystemView } from '../model/vitals';
import { WIDGET_TITLES } from '../model/widgets';

import { FuelSummary } from './fuel-summary';

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
 * Питание на Главной — только числа дня: калории и три макроса. Запись еды
 * живёт в разделе, куда ведёт ссылка: виджет ленты отвечает на вопрос «где я
 * сейчас», а не заменяет собой раздел.
 */
export function FuelWidget({ home }: { home: HomeData }) {
  const view = nutritionOf(home);
  if (!view) return null;

  return (
    <WidgetCard title="Fuel" action={{ label: 'Nutrition', onPress: () => router.push(to.body()) }}>
      <FuelSummary view={view} />
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
 *
 * Пока сервер не прислал ни рецепта, ни значений, карточка честно об этом
 * говорит: значения считаются на его стороне при следующей сборке ленты.
 */
export function CustomWidget({ widget }: { widget: CustomWidgetData }) {
  const view = customWidgetOf(widget.data);

  if (!view) {
    return (
      <WidgetCard title={WIDGET_TITLES.custom ?? 'Custom widget'}>
        <Text tone="muted">The server has not sent this widget’s recipe yet.</Text>
      </WidgetCard>
    );
  }

  const { recipe, metrics } = view;
  const first = metrics[0];

  return (
    <WidgetCard title={recipe.title ?? WIDGET_TITLES.custom ?? 'Custom widget'}>
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
