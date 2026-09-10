import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@/core/http/use-query';
import { logger } from '@/core/log/logger';
import { eventTitle, type JournalEvent } from '@/shared/domain';
import { longDay, useToday } from '@/shared/lib/day';
import { usePersistentState } from '@/shared/lib/store';
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
  SectionPager,
  Segmented,
  Sheet,
  Stack,
  Text,
  Toggle,
} from '@/shared/ui';

import type { Layer } from '../api/contract';
import { eventsKey, fetchEvents, fetchMonth, markDone, monthKey } from '../api/journal';
import { AGENDA_DAYS, agendaEnd, firstWeekday, groupByDate, quickAddHref } from '../model/calendar';
import {
  ALL_LAYERS,
  EMPTY_DAY,
  eventTime,
  isDone,
  markable,
  JOURNAL_LAYERS,
  layerCount,
  monthDays,
} from '../model/journal';

import { BandDay } from './band-day';

const VIEWS = [
  { value: 'calendar', label: 'Calendar' },
  { value: 'agenda', label: 'Agenda' },
] as const;

type JournalView = (typeof VIEWS)[number]['value'];

export function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { date, timeZone } = useToday();
  const [year, month, today] = date.split('-').map(Number);

  const [view, setView] = useState<JournalView>('calendar');
  const [selected, setSelected] = useState(today ?? 1);
  const [layersOpen, setLayersOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = usePersistentState<Layer[]>('journal:layers', [...ALL_LAYERS]);

  const monthQuery = useQuery(monthKey(year ?? 0, month ?? 0, timeZone, shown.join()), (signal) =>
    fetchMonth(year ?? 0, month ?? 0, timeZone, shown, signal),
  );

  const day = `${date.slice(0, 8)}${String(selected).padStart(2, '0')}`;
  const dayQuery = useQuery(eventsKey(day, day, timeZone, shown.join()), (signal) =>
    fetchEvents(day, day, timeZone, shown, signal),
  );

  const until = agendaEnd(date);
  const agendaQuery = useQuery(eventsKey(date, until, timeZone, shown.join()), (signal) =>
    fetchEvents(date, until, timeZone, shown, signal),
  );

  const refresh = () => {
    monthQuery.refresh();
    dayQuery.refresh();
    agendaQuery.refresh();
  };

  const mark = (event: JournalEvent) => {
    markDone(event, timeZone).then(refresh, (failure: unknown) => {
      logger.error('Отметка события не сохранилась', { id: event.id, failure });
      setFailed(true);
    });
  };

  const events = dayQuery.data?.events ?? [];
  const done = events.filter(isDone).length;

  return (
    <LinearGradient colors={theme.color.backdrop} style={styles.fill}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Stack gap="sm">
          <Stack direction="row" justify="space-between" align="center">
            <Stack gap="xs">
              <Text variant="display">Journal</Text>
              <Text variant="bodySmall" tone="muted">
                {longDay(day)}
              </Text>
            </Stack>
            <Segmented
              items={VIEWS}
              value={view}
              onChange={(value) => setView(value as JournalView)}
            />
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
                  {`Layers · ${shown.length}`}
                </Text>
              </Stack>
            </GlassButton>
          </View>
        </Stack>
      </View>

      <View style={styles.fill}>
        <SectionPager
          index={view === 'calendar' ? 0 : 1}
          onIndexChange={(next) => setView(VIEWS[next]?.value ?? 'calendar')}
          onRefresh={refresh}
          refreshing={monthQuery.refreshing}
          pages={[
            <Stack key="calendar" gap="md">
              <MonthCalendar
                title={longDay(day).replace(/ \d+,/, '')}
                days={monthDays(monthQuery.data, shown)}
                firstWeekday={firstWeekday(date)}
                selected={selected}
                onSelect={setSelected}
              />

              {failed ? (
                <Card variant="sunken">
                  <Text tone="danger">The change did not save. Try again.</Text>
                </Card>
              ) : null}

              {/* Ночь и пульс человек в дневник не заносит — их меряет
                  браслет. Без них день состоит из одних намерений. */}
              <BandDay day={day} />

              {events.length === 0 ? (
                <>
                  <EmptyPanel icon="calendar" title={EMPTY_DAY.title} text={EMPTY_DAY.text} />
                  <Card>
                    <Stack gap="sm">
                      <Text variant="subtitle">Add what you remember</Text>
                      {EMPTY_DAY.quick.map((item) => (
                        <ListRow
                          key={item.id}
                          leading={<IconTile name={item.icon} tone="accent" size={QUICK_ICON} />}
                          title={item.title}
                          subtitle={item.subtitle}
                          onPress={() => router.push(quickAddHref(item.id, day))}
                        />
                      ))}
                    </Stack>
                  </Card>
                </>
              ) : (
                <Card>
                  <Stack gap="md">
                    <Stack direction="row" justify="space-between" align="center">
                      <Text variant="subtitle">{longDay(day)}</Text>
                      <Text variant="bodySmall" tone="muted">
                        {`${done} of ${events.length} done`}
                      </Text>
                    </Stack>
                    <Stack gap="sm">
                      {events.map((event) => (
                        <ListRow
                          key={event.id}
                          leading={
                            <CheckCircle
                              checked={isDone(event)}
                              onPress={markable(event) ? () => mark(event) : undefined}
                            />
                          }
                          title={eventTitle(event)}
                          subtitle={`${eventTime(event)} · ${event.status}`}
                          done={isDone(event)}
                          onPress={() => router.push(to.event(event.id))}
                        />
                      ))}
                    </Stack>
                  </Stack>
                </Card>
              )}
            </Stack>,

            <Stack key="agenda" gap="md">
              {groupByDate(agendaQuery.data?.events ?? []).map((group) => (
                <Card key={group.date}>
                  <Stack gap="md">
                    <Text variant="subtitle">{longDay(group.date)}</Text>
                    <Stack gap="sm">
                      {group.events.map((event) => (
                        <ListRow
                          key={event.id}
                          leading={
                            <CheckCircle
                              checked={isDone(event)}
                              onPress={markable(event) ? () => mark(event) : undefined}
                            />
                          }
                          title={eventTitle(event)}
                          subtitle={`${eventTime(event)} · ${event.layer}`}
                          done={isDone(event)}
                          onPress={() => router.push(to.event(event.id))}
                        />
                      ))}
                    </Stack>
                  </Stack>
                </Card>
              ))}

              {(agendaQuery.data?.events.length ?? 0) === 0 ? (
                <EmptyPanel
                  icon="calendar"
                  title="Nothing ahead"
                  text={`No records in the next ${AGENDA_DAYS} days for the layers you keep on.`}
                />
              ) : null}
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
              leading={
                <View
                  style={[styles.layerDot, { backgroundColor: theme.color[layer.tone].solid }]}
                />
              }
              title={layer.title}
              subtitle={layerCount(monthQuery.data, layer.id)}
              trailingSlot={
                <Toggle
                  value={shown.includes(layer.id)}
                  accessibilityLabel={layer.title}
                  onValueChange={(on) =>
                    setShown(on ? [...shown, layer.id] : shown.filter((id) => id !== layer.id))
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

/** Куда ведёт быстрое добавление: у каждого пункта свой экран создания. */
const LAYER_DOT = 9;
const QUICK_ICON = 32;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: space.screen, gap: space.sm },
  layers: { alignItems: 'flex-end' },
  layersSurface: { paddingHorizontal: space.md },
  layerDot: { width: LAYER_DOT, height: LAYER_DOT, borderRadius: LAYER_DOT / 2 },
});
