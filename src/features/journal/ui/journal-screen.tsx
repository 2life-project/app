import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { to } from '@/shared/nav';
import { size, space, theme } from '@/shared/theme';
import {
  Card,
  CheckCircle,
  GlassButton,
  ListRow,
  MonthCalendar,
  ProgressBar,
  SectionPager,
  Segmented,
  Stack,
  Text,
} from '@/shared/ui';

import { AGENDA, DAY_ENTRIES, DAY_PROTOCOL, JULY, JULY_FIRST_WEEKDAY } from '../model/journal';

const VIEWS = [
  { value: 'calendar', label: 'Calendar' },
  { value: 'agenda', label: 'Agenda' },
] as const;

type JournalView = (typeof VIEWS)[number]['value'];

export function JournalScreen() {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<JournalView>('calendar');
  const [selected, setSelected] = useState(13);
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
            onPress={() => router.push(to.journal())}
            surfaceStyle={styles.layersSurface}>
            <Stack direction="row" gap="xs" align="center">
              <Feather name="layers" size={size.icon.sm} color={theme.color.accent.text} />
              <Text variant="link" tone="accent">
                Layers · 4
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

              <Card>
                <Stack gap="md">
                  <Stack direction="row" justify="space-between" align="center">
                    <Text variant="subtitle">Monday, July {selected}</Text>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: space.screen, gap: space.sm },
  layers: { alignItems: 'flex-end' },
  layersSurface: { paddingHorizontal: space.md },
});
