import { usePersistentState } from '@/shared/lib/store';
import { Card, InfoCard, ListRow, Screen, ScreenHeader, Stack, Toggle } from '@/shared/ui';

import { WIDGET_CHOICES, WIDGETS_NOTE } from '../model/widgets';

export const WidgetsScreenOptions = { headerShown: false };

const INITIAL: Record<string, boolean> = Object.fromEntries(
  WIDGET_CHOICES.map((widget) => [widget.id, widget.on]),
);

/** Настройка ленты Главной: какие виджеты показывать и в каком порядке. */
export function WidgetsScreen() {
  const [on, setOn] = usePersistentState<Record<string, boolean>>('widgets', INITIAL);

  const shown = WIDGET_CHOICES.filter((widget) => on[widget.id]).length;

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title="Widgets" subtitle={`${shown} of ${WIDGET_CHOICES.length} on Home`} />

        <Card>
          <Stack gap="xs">
            {WIDGET_CHOICES.map((widget) => (
              <ListRow
                key={widget.id}
                title={widget.title}
                subtitle={widget.subtitle}
                trailingSlot={
                  <Toggle
                    value={on[widget.id] ?? false}
                    accessibilityLabel={widget.title}
                    onValueChange={(value) => setOn({ ...on, [widget.id]: value })}
                  />
                }
              />
            ))}
          </Stack>
        </Card>

        <InfoCard title="How this works" text={WIDGETS_NOTE} />
      </Stack>
    </Screen>
  );
}
