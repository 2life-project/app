import type { Query } from '@/core/http/use-query';
import { Stack, Text, WidgetCard } from '@/shared/ui';

import type { Decision, HomeData, LayoutCell } from '../api/contract';
import { cellsOf } from '../model/feed';
import type { HomeState } from '../model/home';
import { summaryFor } from '../model/summary';
import { moveOf, recoverOf, ringsOf, type RingView } from '../model/vitals';

import { CustomWidget, FuelWidget, SystemWidget, VitalsWidget } from './widget-data';
import { DecisionsWidget } from './widget-decisions';
import { SummaryWidget } from './widget-summary';

/**
 * Лента Обзора выстраивается по раскладке с сервера: он говорит, какие виджеты
 * показывать и в каком порядке, а экран их только рисует. Порядок, зашитый в
 * код, разошёлся бы с экраном настройки виджетов в первый же день.
 */
export function Overview({
  state,
  decisions,
}: {
  state: HomeState;
  decisions: Query<readonly Decision[]>;
}) {
  const cells = cellsOf(state.layout);
  const rings = ringsOf(state.home);

  if (cells.length === 0) {
    return (
      <WidgetCard title="Empty home">
        <Text tone="muted">No widgets are set up yet.</Text>
      </WidgetCard>
    );
  }

  return (
    <Stack gap="md">
      {cells.map((cell) => (
        <Cell key={cell.id} cell={cell} home={state.home} rings={rings} decisions={decisions} />
      ))}
    </Stack>
  );
}

function Cell({
  cell,
  home,
  rings,
  decisions,
}: {
  cell: LayoutCell;
  home: HomeData;
  rings: readonly RingView[];
  decisions: Query<readonly Decision[]>;
}) {
  switch (cell.widget) {
    case 'vitals':
      return <VitalsWidget rings={rings} />;
    case 'recover':
      return <SystemWidget widget="recover" view={recoverOf(home)} />;
    case 'fuel':
      // У питания, в отличие от других систем, есть прямое действие: записать
      // съеденное. Полоса приёмов ведёт к нему в одно нажатие с Главной.
      return <FuelWidget home={home} />;
    case 'move':
      return <SystemWidget widget="move" view={moveOf(home)} />;
    case 'decisions':
      return <DecisionsWidget query={decisions} />;
    case 'custom': {
      // Данные пользовательского виджета сервер кладёт отдельно и связывает по
      // идентификатору ячейки: рецепт в раскладке, значения — в ответе данных.
      const widget = home.widgets.find((candidate) => candidate.id === cell.id);
      return widget ? <CustomWidget widget={widget} /> : null;
    }
    default: {
      const view = summaryFor(cell.widget, home);
      return view ? <SummaryWidget view={view} /> : null;
    }
  }
}
