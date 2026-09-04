import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { to } from '@/shared/nav';
import { radius, size, theme } from '@/shared/theme';
import {
  Button,
  CheckCircle,
  ListRow,
  MetricWidget,
  ProgressBar,
  ProgressRing,
  Stack,
  StatTile,
  Text,
  TimelineRow,
  WidgetCard,
} from '@/shared/ui';

import {
  BODY_SYSTEMS,
  LIVE_STREAMS,
  PLAN,
  PROTOCOLS,
  RINGS,
  SUPPLEMENT_STACKS,
} from '../model/overview';

/** Лента виджетов Обзора — порядок и содержимое из макета. */
export function Overview() {
  return (
    <Stack gap="md">
      <WidgetCard
        title="Four rings"
        action={{ label: 'Details', onPress: () => router.push(to.body()) }}>
        <Stack direction="row" justify="space-between">
          {RINGS.map((ring) => (
            <ProgressRing
              key={ring.id}
              value={ring.value}
              valueLabel={ring.valueLabel}
              label={ring.label}
              tone={ring.tone}
            />
          ))}
        </Stack>
      </WidgetCard>

      <WidgetCard
        title="Next up"
        caption="in 1 h 50 min"
        action={{ label: 'Journal', chevron: true, onPress: () => router.push(to.journal()) }}>
        <Stack gap="md">
          <ListRow
            leading={
              <View style={styles.icon}>
                <Feather name="video" size={size.icon.md} color={theme.color.textMuted} />
              </View>
            }
            title="Video visit · Anna Smirnova"
            subtitle="blood pressure follow-up · 30 min"
            trailing="15:30"
            trailingCaption="today"
          />
          <Button label="Join the call" variant="tonal" />
        </Stack>
      </WidgetCard>

      <WidgetCard
        title="Supplements"
        caption="1 of 3 taken today"
        action={{
          label: 'Supplements',
          chevron: true,
          onPress: () => router.push(to.course('all')),
        }}>
        <Stack gap="sm">
          {SUPPLEMENT_STACKS.map((stack) => (
            <ListRow
              key={stack.id}
              leading={<CheckCircle checked={stack.taken} />}
              title={stack.title}
              subtitle={stack.subtitle}
              note={stack.status}
              noteTone={stack.taken ? 'success' : 'muted'}
              done={stack.taken}
              onPress={() => router.push(to.course(stack.id))}
            />
          ))}
        </Stack>
      </WidgetCard>

      <WidgetCard
        title="The plan"
        caption="2 done · 2 left today"
        action={{ label: 'Journal', chevron: true, onPress: () => router.push(to.journal()) }}>
        <Stack>
          {PLAN.map((item) => (
            <TimelineRow
              key={item.id}
              time={item.time}
              title={item.title}
              subtitle={item.subtitle}
              state={item.state}
              badge={'badge' in item ? item.badge : undefined}
            />
          ))}
        </Stack>
      </WidgetCard>

      {BODY_SYSTEMS.map((system) => (
        <MetricWidget
          key={system.id}
          icon={system.icon}
          title={system.title}
          action={{ label: 'Body', onPress: () => router.push(to.body()) }}
          ring={system.ring}
          tiles={[...system.tiles]}
        />
      ))}

      <WidgetCard
        title="Protocols and goals"
        action={{ label: 'All 5', onPress: () => router.push(to.protocols()) }}>
        <Stack gap="md">
          {PROTOCOLS.map((protocol) => (
            <Stack key={protocol.id} gap="xs">
              <Stack direction="row" justify="space-between" align="center">
                <Text variant="body">{protocol.title}</Text>
                <Text variant="bodySmall" tone="muted">
                  {protocol.percent}
                </Text>
              </Stack>
              <Text variant="bodySmall" tone="muted">
                {protocol.subtitle}
              </Text>
              <ProgressBar value={protocol.value} tone={protocol.tone} />
            </Stack>
          ))}
        </Stack>
      </WidgetCard>

      <WidgetCard
        title="Live streams"
        action={{ label: 'now', onPress: () => router.push(to.device()) }}>
        <Stack gap="sm">
          <Stack direction="row" gap="sm">
            {LIVE_STREAMS.slice(0, 2).map((stream) => (
              <StatTile key={stream.label} {...stream} />
            ))}
          </Stack>
          <Stack direction="row" gap="sm">
            {LIVE_STREAMS.slice(2).map((stream) => (
              <StatTile key={stream.label} {...stream} />
            ))}
          </Stack>
        </Stack>
      </WidgetCard>
    </Stack>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: theme.color.neutral.surface,
  },
});
