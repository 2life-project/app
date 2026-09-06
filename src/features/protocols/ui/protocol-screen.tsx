import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { usePersistentState } from '@/shared/lib/store';
import { to } from '@/shared/nav';
import { space } from '@/shared/theme';
import {
  ActionLink,
  BarChart,
  Card,
  CheckCircle,
  Field,
  InfoCard,
  LineChart,
  ListRow,
  ProgressBar,
  RingPanel,
  Screen,
  ScreenHeader,
  Sheet,
  Stack,
  Text,
  WidgetCard,
} from '@/shared/ui';

import { PROTOCOL } from '../model/protocol';

export const ProtocolScreenOptions = { headerShown: false };

const INITIAL_TASKS: Record<string, boolean> = Object.fromEntries(
  PROTOCOL.today.tasks.map((task) => [task.id, task.done]),
);

/** Протокол: приверженность, куда двигаются показатели, день, динамика. */
export function ProtocolScreen({ id: _id }: { id: string }) {
  const [done, setDone] = usePersistentState<Record<string, boolean>>(
    'protocol:today',
    INITIAL_TASKS,
  );
  const [editing, setEditing] = useState(false);
  const left = PROTOCOL.today.tasks.filter((task) => done[task.id]).length;

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title={PROTOCOL.title} subtitle={PROTOCOL.subtitle} />

        <RingPanel
          title={PROTOCOL.title}
          caption={PROTOCOL.adherence.caption}
          action={<ActionLink label="Edit" onPress={() => setEditing(true)} />}
          ring={{
            value: PROTOCOL.adherence.percent,
            valueLabel: PROTOCOL.adherence.label,
            note: PROTOCOL.adherence.day,
          }}
          rows={PROTOCOL.rows.map((row) => ({ ...row, onPress: () => {} }))}
        />

        <WidgetCard title="What it moves">
          <Stack gap="md">
            {PROTOCOL.targets.map((target) => (
              <Stack key={target.id} gap="xs">
                <Stack direction="row" justify="space-between" align="center">
                  <Text variant="body">{target.title}</Text>
                  <Text variant="bodySmall" tone="muted">
                    {target.value}
                  </Text>
                </Stack>
                <ProgressBar value={target.progress} />
                <Stack direction="row" justify="space-between">
                  <Text variant="footnote" tone="muted">
                    {target.start}
                  </Text>
                  <Text variant="footnote" tone="muted">
                    {target.goal}
                  </Text>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </WidgetCard>

        <WidgetCard title="Today" caption={`${left} of ${PROTOCOL.today.tasks.length} done`}>
          <Stack gap="sm">
            {PROTOCOL.today.tasks.map((task) => (
              <ListRow
                key={task.id}
                leading={<CheckCircle checked={done[task.id] ?? false} />}
                title={task.title}
                subtitle={task.subtitle}
                done={done[task.id] ?? false}
                onPress={() => setDone({ ...done, [task.id]: !done[task.id] })}
              />
            ))}
          </Stack>
        </WidgetCard>

        <WidgetCard title={PROTOCOL.since.title} caption={PROTOCOL.since.caption}>
          <LineChart values={PROTOCOL.since.values} />
        </WidgetCard>

        <WidgetCard title={PROTOCOL.adherence30.title} caption={PROTOCOL.adherence30.caption}>
          <BarChart values={PROTOCOL.adherence30.days} axis={['start', 'today']} />
        </WidgetCard>

        <InfoCard
          title={PROTOCOL.about.title}
          text={PROTOCOL.about.text}
          link={{ label: 'Learn more', onPress: () => router.push(to.assistant()) }}
        />

        <Card variant="flat">
          <View style={styles.edit}>
            <ActionLink label="Edit protocol" chevron onPress={() => setEditing(true)} />
          </View>
        </Card>
      </Stack>

      <Sheet
        visible={editing}
        onClose={() => setEditing(false)}
        title="Edit protocol"
        action={<ActionLink label="Done" onPress={() => setEditing(false)} />}>
        <Stack gap="md">
          <Field label="Name" hint={PROTOCOL.title} />
          <Field label="Until" hint="Sep 28" />
          <Field label="What it moves" hint="ApoB, LDL" />
        </Stack>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  edit: { alignItems: 'center', paddingVertical: space.xs },
});
