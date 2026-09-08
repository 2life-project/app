import { useState } from 'react';

import { useQuery } from '@/core/http/use-query';
import { logger } from '@/core/log/logger';
import { Card, InfoCard, ListRow, Screen, ScreenHeader, Stack, Text, Toggle } from '@/shared/ui';

import type { HomeLayout, LayoutCell, WidgetType } from '../api/contract';
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
  const [failed, setFailed] = useState(false);
  /**
   * Раскладка после последней записи. Сервер принимает правку только против
   * той ревизии, которую видел клиент, а перечитывание идёт своим темпом:
   * второе нажатие подряд ушло бы со старой ревизией и получило отказ.
   */
  const [saved, setSaved] = useState<HomeLayout | null>(null);

  const layout = useQuery('home:layout', (signal) => fetchHomeLayout(signal));
  const catalog = useQuery('widgets:catalog', (signal) => fetchWidgetCatalog(signal));

  // Своя запись свежее прочитанной, пока перечитывание не догонит её ревизию.
  const current = saved && saved.revision >= (layout.data?.revision ?? 0) ? saved : layout.data;
  const cells = cellsOf(current);
  const shown = new Set(cells.map((cell) => cell.widget));
  const available = (catalog.data?.widgets ?? []).filter((widget) =>
    widget.surfaces.includes('mobile'),
  );

  const toggle = (type: WidgetType, on: boolean) => {
    if (!current || saving) return;

    const next: LayoutCell[] = on
      ? [...cells, { id: type, widget: type, size: 1 }]
      : cells.filter((cell) => cell.widget !== type);

    setSaving(true);
    setFailed(false);
    // Отказ обязан быть виден. Молчаливый провал выглядит как «переключатель
    // не работает»: он отскакивает назад, и причины на экране нет.
    void saveHomeLayout(current, next)
      .then((result) => {
        setSaved(result);
        // Сервер отвечает 2xx и на запись, которую не принял целиком: он
        // возвращает свою раскладку, а не нашу. Молча показывать отскочивший
        // переключатель нельзя — сравниваем и говорим, что не вышло.
        const kept = cellsOf(result).some((cell) => cell.widget === type);
        if (kept !== on) {
          logger.warn('Сервер вернул другую раскладку', {
            type,
            on,
            sent: next.length,
            got: cellsOf(result).length,
          });
          setFailed(true);
        }
      })
      .catch((failure: unknown) => {
        logger.warn('Раскладка не сохранилась', { type, on, failure });
        setFailed(true);
      })
      .finally(() => setSaving(false));
  };

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader
          title="Widgets"
          subtitle={
            current ? `${cells.length} of ${available.length} on Home` : 'loading the layout…'
          }
        />

        {failed ? (
          <Card variant="sunken">
            <Text tone="danger">The layout did not save. Try again.</Text>
          </Card>
        ) : null}

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
