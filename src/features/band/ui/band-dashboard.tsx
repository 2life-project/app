import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { Button, Card, SectionCaption, SectionSummary, Stack, Text } from '@/shared/ui';

import { summaryOfBand } from '../model/band-summary';
import type { BandState } from '../model/use-band';

import { BandDetails, type DetailKind } from './band-details';
import { BandMetrics } from './band-metrics';
import { RecordingsCard } from './recordings-card';
import { SleepCard } from './sleep-card';
import { WorkoutsCard } from './workouts-card';

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
  onRemoveRecording,
  onStartWorkout,
  onStopWorkout,
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
  onRemoveRecording: (session: number) => void;
  onStartWorkout: () => void;
  onStopWorkout: () => void;
  onRefresh: () => void;
  onDisconnect: () => void;
  onForget: () => void;
}) {
  const live = state.stage === 'connected';
  const [detail, setDetail] = useState<DetailKind>(null);

  // Шапка пересчитывает три ряда по всем минутам дня, а живой отчёт приходит
  // каждые десять секунд. Без памяти этот пересчёт идёт на каждый такт вместе
  // со всеми карточками под ним.
  const summary = useMemo(() => summaryOfBand(state), [state]);

  return (
    <Stack gap="md">
      <SectionSummary
        title={state.device?.name ?? 'Браслет'}
        action={
          live
            ? { label: state.busy ? 'Читаем…' : 'Обновить', onPress: onRefresh }
            : { label: 'Подключить', onPress: onScan }
        }
        caption={<SectionCaption>{summary.caption}</SectionCaption>}
        ring={summary.ring}
        rows={summary.rows}
      />

      <BandMetrics state={state} onOpen={setDetail} />

      <SleepCard sleep={state.sleep} reading={state.busy} onOpen={() => setDetail('sleep')} />

      <WorkoutsCard
        session={state.session}
        recorded={state.recorded}
        states={state.states}
        reading={state.busy}
        live={live}
        onStart={onStartWorkout}
        onStop={onStopWorkout}
        onOpen={() => setDetail('workouts')}
      />

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Команды</Text>
          <View style={styles.controls}>
            <Button label="Замерить" onPress={onMeasure} disabled={!live} />
            <Button label="Вибрация" variant="tonal" onPress={onVibrate} disabled={!live} />
            {state.recording ? (
              <Button label="Остановить запись" variant="tonal" onPress={onStopRecording} />
            ) : (
              <Button
                label="Записать голос"
                variant="tonal"
                onPress={onStartRecording}
                disabled={!live}
              />
            )}
          </View>
          <Text variant="bodySmall" tone="muted">
            {live
              ? 'Один замер занимает около минуты: оптический датчик включается ради него, а не работает постоянно.'
              : 'Команды работают только на живой связи с браслетом.'}
          </Text>
        </Stack>
      </Card>

      <RecordingsCard
        onDevice={state.recordings}
        saved={state.saved}
        freeKb={state.storage?.freeKb}
        reading={state.busy}
        live={live}
        busy={state.busy}
        onPull={onPull}
        onRemove={onRemoveRecording}
      />

      <BandDetails kind={detail} state={state} onClose={() => setDetail(null)} />

      <View style={styles.footer}>
        {live ? <Button label="Отключить" variant="plain" onPress={onDisconnect} /> : null}
        <Button label="Забыть браслет" variant="plain" onPress={onForget} />
      </View>
    </Stack>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
});
