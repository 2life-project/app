import { StyleSheet, View } from 'react-native';

import { type SleepSegment, sleepTotals } from '@/core/band';
import { space } from '@/shared/theme';
import { BarChart, Button, Card, Stack, StatTile, Text } from '@/shared/ui';

import type { BandState } from '../model/use-band';

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
  const live = state.live;
  const summary = state.summary;
  const heartRate = state.measurement?.heartRate ?? live?.heartRate ?? live?.averageHeartRate;

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

      <Card variant="sunken">
        <View style={styles.tiles}>
          <StatTile label="Heart rate" value={heartRate ? String(heartRate) : '—'} unit="bpm" />
          <StatTile label="SpO₂" value={oxygen(state)} unit="%" />
          <StatTile label="Steps" value={String(summary?.steps ?? live?.steps ?? 0)} />
          <StatTile label="Distance" value={String(summary?.distance ?? 0)} unit="m" />
          <StatTile label="Calories" value={String(summary?.calories ?? 0)} unit="kcal" />
          <StatTile
            label="Stress"
            value={state.measurement?.stress ? String(state.measurement.stress) : '—'}
          />
        </View>
      </Card>

      <SleepCard sleep={state.sleep} />

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="title">Controls</Text>
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

function oxygen(state: BandState): string {
  const value = state.measurement?.bloodOxygen ?? state.live?.bloodOxygen;
  return value ? String(value) : '—';
}

/** Ночь по стадиям. Столбцы — минуты, подписи — что это за стадия. */
function SleepCard({ sleep }: { sleep: readonly SleepSegment[] }) {
  if (sleep.length === 0) {
    return (
      <Card variant="sunken">
        <Stack gap="xs">
          <Text variant="title">Sleep</Text>
          <Text variant="bodySmall" tone="muted">
            No sleep recorded yet.
          </Text>
        </Stack>
      </Card>
    );
  }

  const totals = sleepTotals(sleep);
  const stages = [
    { label: 'Deep', minutes: totals.deep },
    { label: 'Light', minutes: totals.light },
    { label: 'REM', minutes: totals.rem },
    { label: 'Awake', minutes: totals.awake },
  ];
  const total = stages.reduce((sum, stage) => sum + stage.minutes, 0);

  return (
    <Card variant="sunken">
      <Stack gap="sm">
        <Text variant="title">Sleep · {formatDuration(total)}</Text>
        <BarChart values={stages.map((stage) => stage.minutes)} axis={['Deep', 'Awake']} />
        <View style={styles.tiles}>
          {stages.map((stage) => (
            <StatTile key={stage.label} label={stage.label} value={formatDuration(stage.minutes)} />
          ))}
        </View>
      </Stack>
    </Card>
  );
}

function RecordingsCard({ state, onPull }: { state: BandState; onPull: () => void }) {
  const onDevice = state.recordings;
  const free = state.storage ? Math.round((state.storage.free / 1024) * 10) / 10 : null;

  return (
    <Card variant="sunken">
      <Stack gap="sm">
        <Text variant="title">Voice recordings</Text>

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

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
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
