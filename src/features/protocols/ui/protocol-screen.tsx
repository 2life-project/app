import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import {
  ActionLink,
  BarChart,
  Card,
  CheckCircle,
  InfoCard,
  LineChart,
  ListRow,
  ProgressBar,
  RingPanel,
  Screen,
  ScreenHeader,
  Stack,
  Text,
  WidgetCard,
} from '@/shared/ui';

import { PROTOCOL } from '../model/protocol';

export const ProtocolScreenOptions = { headerShown: false };

/** Протокол: приверженность, куда двигаются показатели, день, динамика. */
export function ProtocolScreen({ id: _id }: { id: string }) {
  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title={PROTOCOL.title} subtitle={PROTOCOL.subtitle} />

        <RingPanel
          title={PROTOCOL.title}
          caption={PROTOCOL.adherence.caption}
          action={<ActionLink label="Edit" onPress={() => {}} />}
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

        <WidgetCard title="Today" caption={PROTOCOL.today.caption}>
          <Stack gap="sm">
            {PROTOCOL.today.tasks.map((task) => (
              <ListRow
                key={task.id}
                leading={<CheckCircle checked={task.done} />}
                title={task.title}
                subtitle={task.subtitle}
                done={task.done}
                onPress={() => {}}
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
          link={{ label: 'Learn more', onPress: () => {} }}
        />

        <Card variant="flat">
          <View style={styles.edit}>
            <ActionLink label="Edit protocol" chevron onPress={() => {}} />
          </View>
        </Card>
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  edit: { alignItems: 'center', paddingVertical: space.xs },
});
