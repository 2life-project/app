import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { Button, Card, Stack, StatTile, Text } from '@/shared/ui';

import type { BandState } from '../model/use-band';

import { BandMetrics } from './band-metrics';
import { SleepCard } from './sleep-card';

/**
 * Всё, что браслет отдаёт, и всё, чем им можно управлять.
 *
 * Раздел временный: он существует, чтобы увидеть данные целиком и проверить
 * команды на живом устройстве, а не чтобы быть частью продукта.
 */
export function BandDashboard({
  state,
  onMeasure,
  onVibrate,
  onStartRecording,
  onStopRecording,
  onPull,
  onRefresh,
  onDisconnect,
}: {
  state: BandState;
  onMeasure: () => void;
  onVibrate: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPull: () => void;
  onRefresh: () => void;
  onDisconnect: () => void;
}) {
  return (
    <Stack gap="md">
      <View style={styles.header}>
        <Stack gap="xs">
          <Text variant="title">{state.device?.name ?? 'Band'}</Text>
          <Text variant="bodySmall" tone="muted">
            {deviceLine(state)}
          </Text>
        </Stack>
        <Button
          label={state.busy ? 'Reading…' : 'Refresh'}
          variant="plain"
          size="sm"
          onPress={onRefresh}
        />
      </View>

      <BandMetrics state={state} />

      <SleepCard sleep={state.sleep} />

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Controls</Text>
          <View style={styles.controls}>
            <Button label="Measure" onPress={onMeasure} />
            <Button label="Vibrate" variant="tonal" onPress={onVibrate} />
            {state.recording ? (
              <Button label="Stop recording" variant="tonal" onPress={onStopRecording} />
            ) : (
              <Button label="Record voice" variant="tonal" onPress={onStartRecording} />
            )}
          </View>
          <Text variant="bodySmall" tone="muted">
            A single measurement takes about a minute: the optical sensor turns on for it instead of
            running all the time.
          </Text>
        </Stack>
      </Card>

      <RecordingsCard state={state} onPull={onPull} />

      <Button label="Disconnect" variant="tonal" onPress={onDisconnect} />
    </Stack>
  );
}

function deviceLine(state: BandState): string {
  const parts: string[] = [];
  if (state.battery !== undefined) parts.push(`${state.battery}%`);
  if (state.firmware) parts.push(state.firmware);
  if (state.worn !== undefined) parts.push(state.worn ? 'worn' : 'not worn');
  return parts.join(' · ') || 'connected';
}

function RecordingsCard({ state, onPull }: { state: BandState; onPull: () => void }) {
  const onDevice = state.recordings;
  const free = state.storage ? Math.round((state.storage.free / 1024) * 10) / 10 : null;

  return (
    <Card variant="sunken">
      <Stack gap="sm">
        <Text variant="subtitle">Voice recordings</Text>

        <View style={styles.tiles}>
          <StatTile label="On band" value={String(onDevice.length)} />
          <StatTile label="On phone" value={String(state.saved.length)} />
          {free === null ? null : <StatTile label="Free" value={String(free)} unit="MB" />}
        </View>

        {onDevice.slice(0, 3).map((item) => (
          <Text key={item.session} variant="bodySmall" tone="muted">
            {item.startedAt.toLocaleString()} · {Math.round(item.seconds)} s
          </Text>
        ))}

        <Button
          label={state.busy ? 'Downloading…' : 'Download to phone'}
          variant="tonal"
          onPress={onPull}
        />
        <Text variant="bodySmall" tone="muted">
          Downloading frees space on the band: it holds about fifteen hours of audio.
        </Text>
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});
