import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { Button, Card, SectionCaption, SectionSummary, Stack, StatTile, Text } from '@/shared/ui';

import { summaryOfBand } from '../model/band-summary';
import type { BandState } from '../model/use-band';

import { BandDetails, type DetailKind } from './band-details';
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
  onScan,
  onMeasure,
  onVibrate,
  onStartRecording,
  onStopRecording,
  onPull,
  onRefresh,
  onDisconnect,
  onForget,
}: {
  state: BandState;
  onScan: () => void;
  onMeasure: () => void;
  onVibrate: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPull: () => void;
  onRefresh: () => void;
  onDisconnect: () => void;
  onForget: () => void;
}) {
  const live = state.stage === 'connected';
  const summary = summaryOfBand(state);
  const [detail, setDetail] = useState<DetailKind>(null);

  return (
    <Stack gap="md">
      <SectionSummary
        title={state.device?.name ?? 'Band'}
        action={
          live
            ? { label: state.busy ? 'Reading…' : 'Refresh', onPress: onRefresh }
            : { label: 'Connect', onPress: onScan }
        }
        caption={<SectionCaption>{summary.caption}</SectionCaption>}
        ring={summary.ring}
        rows={summary.rows}
      />

      <BandMetrics state={state} onOpen={setDetail} />

      <SleepCard sleep={state.sleep} onOpen={() => setDetail('sleep')} />

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Controls</Text>
          <View style={styles.controls}>
            <Button label="Measure" onPress={onMeasure} disabled={!live} />
            <Button label="Vibrate" variant="tonal" onPress={onVibrate} disabled={!live} />
            {state.recording ? (
              <Button label="Stop recording" variant="tonal" onPress={onStopRecording} />
            ) : (
              <Button
                label="Record voice"
                variant="tonal"
                onPress={onStartRecording}
                disabled={!live}
              />
            )}
          </View>
          <Text variant="bodySmall" tone="muted">
            {live
              ? 'A single measurement takes about a minute: the optical sensor turns on for it instead of running all the time.'
              : 'Commands need a live connection to the band.'}
          </Text>
        </Stack>
      </Card>

      <RecordingsCard state={state} onPull={onPull} live={live} />

      <BandDetails kind={detail} state={state} onClose={() => setDetail(null)} />

      <View style={styles.footer}>
        {live ? <Button label="Disconnect" variant="plain" onPress={onDisconnect} /> : null}
        <Button label="Forget band" variant="plain" onPress={onForget} />
      </View>
    </Stack>
  );
}

function RecordingsCard({
  state,
  onPull,
  live,
}: {
  state: BandState;
  onPull: () => void;
  live: boolean;
}) {
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
          disabled={!live || onDevice.length === 0}
        />
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
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
  footer: {
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'flex-end',
  },
});
