import { useState } from 'react';

import { useQuery } from '@/core/http/use-query';
import { Card, InfoCard, ListRow, Screen, ScreenHeader, Stack, Text, Toggle } from '@/shared/ui';

import type { LayoutCell, WidgetType } from '../api/contract';
import { fetchHomeLayout, fetchWidgetCatalog, saveHomeLayout } from '../api/home';
import { cellsOf } from '../model/feed';
import { WIDGET_TITLES, WIDGETS_NOTE } from '../model/widgets';

export const WidgetsScreenOptions = { headerShown: false };

/**
 * Настройка ленты Главной. Порядок и состав хранит сервер — экран правит его
 * раскладку, а не свой список: иначе он показывал бы одно, а Главная другое.
 */
export function WidgetsScreen() {
  const [saving, setSaving] = useState(false);

  const layout = useQuery('home:layout', (signal) => fetchHomeLayout(signal));
  const catalog = useQuery('widgets:catalog', (signal) => fetchWidgetCatalog(signal));

  const cells = cellsOf(layout.data);
  const shown = new Set(cells.map((cell) => cell.widget));
  const available = (catalog.data?.widgets ?? []).filter((widget) =>
    widget.surfaces.includes('mobile'),
  );

  const toggle = (type: WidgetType, on: boolean) => {
    const current = layout.data;
    if (!current || saving) return;

    const next: LayoutCell[] = on
      ? [...cells, { id: type, widget: type, size: 1 }]
      : cells.filter((cell) => cell.widget !== type);

    setSaving(true);
    void saveHomeLayout(current, next)
      .then(() => layout.refresh())
      .finally(() => setSaving(false));
  };

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader
          title="Widgets"
          subtitle={
            layout.data ? `${cells.length} of ${available.length} on Home` : 'loading the layout…'
          }
        />

        {available.length === 0 ? (
          <Card variant="sunken">
            <Text tone="muted">
              {catalog.loading ? 'Loading the catalogue…' : 'The catalogue did not load.'}
            </Text>
          </Card>
        ) : (
          <Card>
            <Stack gap="xs">
              {available.map((widget) => (
                <ListRow
                  key={widget.type}
                  title={WIDGET_TITLES[widget.type] ?? widget.type}
                  subtitle={widget.type}
                  trailingSlot={
                    <Toggle
                      value={shown.has(widget.type)}
                      accessibilityLabel={widget.type}
                      onValueChange={(on) => toggle(widget.type, on)}
                    />
                  }
                />
              ))}
            </Stack>
          </Card>
        )}

        <InfoCard title="How this works" text={WIDGETS_NOTE} />
      </Stack>
    </Screen>
  );
}
