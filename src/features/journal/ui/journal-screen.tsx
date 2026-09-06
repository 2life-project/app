import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { to } from '@/shared/nav';
import { size, space, theme } from '@/shared/theme';
import {
  ActionLink,
  Card,
  CheckCircle,
  EmptyPanel,
  GlassButton,
  IconTile,
  ListRow,
  MonthCalendar,
  ProgressBar,
  SectionPager,
  Segmented,
  Sheet,
  Stack,
  Text,
  Toggle,
} from '@/shared/ui';

import {
  AGENDA,
  DAY_ENTRIES,
  DAY_PROTOCOL,
  EMPTY_DAY,
  hasMarks,
  JOURNAL_LAYERS,
  JULY,
  JULY_FIRST_WEEKDAY,
} from '../model/journal';

const VIEWS = [
  { value: 'calendar', label: 'Calendar' },
  { value: 'agenda', label: 'Agenda' },
] as const;

type JournalView = (typeof VIEWS)[number]['value'];

export function JournalScreen() {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<JournalView>('calendar');
  const [selected, setSelected] = useState(13);
  const [layersOpen, setLayersOpen] = useState(false);
  const [layers, setLayers] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(JOURNAL_LAYERS.map((layer) => [layer.id, layer.on])),
  );
  const shownLayers = JOURNAL_LAYERS.filter((layer) => layers[layer.id]).length;
  const index = VIEWS.findIndex((item) => item.value === view);

  return (
    <LinearGradient colors={theme.color.backdrop} style={styles.fill}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Stack direction="row" justify="space-between" align="center">
          <Stack gap="xs">
            <Text variant="display">Journal</Text>
            <Text variant="bodySmall" tone="muted">
              July 13, 2026
            </Text>
          </Stack>
          <Stack direction="row" gap="sm" align="center">
            <Segmented items={VIEWS} value={view} onChange={setView} />
            <GlassButton
              size="sm"
              accessibilityLabel="Добавить запись"
              onPress={() => router.push(to.checkIn())}>
              <Feather name="plus" size={18} color={theme.color.text} />
            </GlassButton>
          </Stack>
        </Stack>

        <View style={styles.layers}>
          <GlassButton
            shape="pill"
            size="sm"
            accessibilityLabel="Слои журнала"
            onPress={() => setLayersOpen(true)}
            surfaceStyle={styles.layersSurface}>
            <Stack direction="row" gap="xs" align="center">
              <Feather name="layers" size={size.icon.sm} color={theme.color.accent.text} />
              <Text variant="link" tone="accent">
                {`Layers · ${shownLayers}`}
              </Text>
            </Stack>
          </GlassButton>
        </View>
      </View>

      <View style={styles.fill}>
        <SectionPager
          index={index}
          onIndexChange={(next) => setView(VIEWS[next]?.value ?? 'calendar')}
          pages={[
            <Stack key="calendar" gap="md">
              <MonthCalendar
                title="July 2026"
                days={JULY}
                firstWeekday={JULY_FIRST_WEEKDAY}
                selected={selected}
                onSelect={setSelected}
              />

              {hasMarks(selected) ? null : (
                <EmptyPanel icon="calendar" title={EMPTY_DAY.title} text={EMPTY_DAY.text} />
              )}

              {hasMarks(selected) ? (
                <Card>
                  <Stack gap="md">
                    <Stack direction="row" justify="space-between" align="center">
                      <Text variant="subtitle">July {selected}</Text>
                      <Text variant="bodySmall" tone="muted">
                        3 of 5 done
                      </Text>
                    </Stack>
                    <Stack gap="sm">
                      {DAY_ENTRIES.map((entry) => (
                        <ListRow
                          key={entry.id}
                          leading={<CheckCircle checked={entry.done} />}
                          title={entry.title}
                          subtitle={entry.subtitle}
                          done={entry.done}
                        />
                      ))}
                    </Stack>
                  </Stack>
                </Card>
              ) : (
                <Card>
                  <Stack gap="sm">
                    <Text variant="subtitle">Add what you remember</Text>
                    {EMPTY_DAY.quick.map((item) => (
                      <ListRow
                        key={item.id}
                        leading={<IconTile name={item.icon} tone="accent" size={QUICK_ICON} />}
                        title={item.title}
                        subtitle={item.subtitle}
                        onPress={() => router.push(quickAddHref(item.id))}
                      />
                    ))}
                  </Stack>
                </Card>
              )}

              {hasMarks(selected) ? (
                <Card>
                  <Stack gap="sm">
                    <Stack direction="row" justify="space-between" align="center">
                      <Text variant="subtitle">{DAY_PROTOCOL.title}</Text>
                      <Text variant="bodySmall" tone="muted">
                        {DAY_PROTOCOL.progressLabel}
                      </Text>
                    </Stack>
                    <ProgressBar value={DAY_PROTOCOL.value} />
                    <Text variant="bodySmall" tone="muted">
                      {DAY_PROTOCOL.streak}
                    </Text>
                  </Stack>
                </Card>
              ) : null}
            </Stack>,

            <Stack key="agenda" gap="md">
              {AGENDA.map((group) => (
                <Card key={group.id}>
                  <Stack gap="md">
                    <Text variant="subtitle">{group.title}</Text>
                    <Stack gap="sm">
                      {group.entries.map((entry) => (
                        <ListRow
                          key={entry.id}
                          leading={<CheckCircle checked={entry.done} />}
                          title={entry.title}
                          subtitle={entry.subtitle}
                          done={entry.done}
                        />
                      ))}
                    </Stack>
                  </Stack>
                </Card>
              ))}
            </Stack>,
          ]}
        />
      </View>

      <Sheet
        visible={layersOpen}
        onClose={() => setLayersOpen(false)}
        title="Layers"
        action={<ActionLink label="Done" onPress={() => setLayersOpen(false)} />}>
        <Stack gap="sm">
          {JOURNAL_LAYERS.map((layer) => (
            <ListRow
              key={layer.id}
              leading={<View style={[styles.layerDot, dotStyle(layer.tone)]} />}
              title={layer.title}
              subtitle={layer.subtitle}
              trailingSlot={
                <Toggle
                  value={layers[layer.id] ?? false}
                  accessibilityLabel={layer.title}
                  onValueChange={(value) =>
                    setLayers((previous) => ({ ...previous, [layer.id]: value }))
                  }
                />
              }
            />
          ))}
        </Stack>
      </Sheet>
    </LinearGradient>
  );
}

/** Цвет точки слоя — из его семейства: он кодирует слой, а не состояние. */
function dotStyle(tone: (typeof JOURNAL_LAYERS)[number]['tone']) {
  return { backgroundColor: theme.color[tone].solid };
}

const LAYER_DOT = 9;
const QUICK_ICON = 32;

/** Куда ведёт быстрое добавление: у каждого пункта свой экран создания. */
function quickAddHref(id: string) {
  if (id === 'workout') return to.workout('new');
  if (id === 'meal') return to.meal('new');
  if (id === 'stack') return to.course('all');
  return to.checkIn();
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: space.screen, gap: space.sm },
  layers: { alignItems: 'flex-end' },
  layersSurface: { paddingHorizontal: space.md },
  layerDot: { width: LAYER_DOT, height: LAYER_DOT, borderRadius: LAYER_DOT / 2 },
});
