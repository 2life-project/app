import { router } from 'expo-router';

import { to } from '@/shared/nav';
import {
  ActionLink,
  Button,
  CheckCircle,
  IconTile,
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

import { useDoses } from '../model/doses';
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
  const doses = useDoses();

  return (
    <Stack gap="md">
      <WidgetCard
        title="Four rings"
        action={{ label: 'Details', onPress: () => router.push(to.body()) }}>
        <Stack direction="row" justify="space-between">
          {RINGS.map((ring) => {
            // Кольцо приёмов считается по отметкам, а не стоит числом: оно и
            // есть обратная связь на единственное ежедневное действие.
            const taken = ring.id === 'doses';

            return (
              <ProgressRing
                key={ring.id}
                value={taken ? doses.done / doses.total : ring.value}
                valueLabel={taken ? `${doses.done}/${doses.total}` : ring.valueLabel}
                label={ring.label}
                tone={ring.tone}
              />
            );
          })}
        </Stack>
      </WidgetCard>

      <WidgetCard
        title="Next up"
        caption="in 1 h 50 min"
        action={{ label: 'Journal', chevron: true, onPress: () => router.push(to.journal()) }}>
        <Stack gap="md">
          <ListRow
            leading={<IconTile name="video" shape="circle" />}
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
        caption={`${doses.done} of ${doses.total} taken today`}
        action={{
          label: 'Supplements',
          chevron: true,
          onPress: () => router.push(to.course('all')),
        }}>
        <Stack gap="sm">
          {SUPPLEMENT_STACKS.map((stack) => (
            <ListRow
              key={stack.id}
              leading={<CheckCircle checked={doses.taken[stack.id] ?? false} />}
              title={stack.title}
              subtitle={stack.subtitle}
              note={doses.taken[stack.id] ? stack.status : stack.time}
              noteTone={doses.taken[stack.id] ? 'success' : 'muted'}
              done={doses.taken[stack.id] ?? false}
              onPress={() => doses.toggle(stack.id)}
              trailingSlot={
                <ActionLink label="Course" onPress={() => router.push(to.course(stack.id))} />
              }
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
