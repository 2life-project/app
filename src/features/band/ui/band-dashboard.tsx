import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { Banner, Button, Card, SectionCaption, SectionSummary, Stack, Text } from '@/shared/ui';

import type { BandState } from '../model/band-state';
import { summaryOfBand } from '../model/band-summary';

import { BandDetails, type DetailKind } from './band-details';
import { BandMetrics } from './band-metrics';
import { ForgetBand } from './forget-band';
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
  onMeasure,
  onVibrate,
  onStartRecording,
  onStopRecording,
  onPull,
  onRemoveRecording,
  onStartWorkout,
  onStopWorkout,
  onRefresh,
  onReconnect,
  onDisconnect,
  onForget,
}: {
  state: BandState;
  onMeasure: () => void;
  onVibrate: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPull: () => void;
  onRemoveRecording: (session: number) => void;
  onStartWorkout: (sport: number) => void;
  onStopWorkout: () => void;
  onRefresh: () => void;
  /** Поднять связь с уже привязанным браслетом: без поиска, по known id. */
  onReconnect: () => void;
  onDisconnect: () => void;
  onForget: () => void;
}) {
  const live = state.stage === 'connected';
  const [detail, setDetail] = useState<DetailKind>(null);

  // Шапка пересчитывает три ряда по всем минутам дня. Зависимости перечислены
  // по полям, а не по всему состоянию: во время тренировки состояние меняется
  // раз в секунду из-за занятия, и память по объекту целиком не держала бы
  // ничего — весь пересчёт шёл бы каждую секунду.
  const summary = useMemo(
    () => summaryOfBand(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- сверено с полями, которые читает summaryOfBand
    [
      state.info,
      state.live,
      state.measurement,
      state.sleep,
      state.stage,
      state.stress,
      state.summary,
      state.today,
      state.worn,
    ],
  );

  return (
    <Stack gap="md">
      {/* Связи нет, а числа на экране остались: без этой плашки они выдают
          себя за свежие. Подпись под кольцом говорит «LAST KNOWN», но её
          человек читает уже после того, как поверил цифрам. */}
      {/* Отказы занятия человек обязан увидеть: сессия существует только в
          памяти приложения, устройство её не хранит, и молчание здесь стоит
          человеку целой тренировки. */}
      {WORKOUT_TROUBLE[state.problem ?? ''] ? (
        <Banner
          tone={state.problem === 'workout-save-failed' ? 'danger' : 'warning'}
          checked={false}
          title={WORKOUT_TROUBLE[state.problem ?? '']?.title ?? ''}
          subtitle={WORKOUT_TROUBLE[state.problem ?? '']?.subtitle}
        />
      ) : null}

      {live ? null : (
        <Banner
          tone="warning"
          checked={false}
          title={state.retrying ? 'Reconnecting to the band' : 'Band is offline'}
          subtitle={
            state.retrying
              ? 'Everything below is the last reading, not what is happening now.'
              : 'Numbers below are the last reading. Bring the band closer to update them.'
          }
          action={state.retrying ? undefined : { label: 'Reconnect', onPress: onReconnect }}
        />
      )}

      <SectionSummary
        title={state.device?.name ?? 'Band'}
        action={
          live
            ? { label: state.busy ? 'Reading…' : 'Refresh', onPress: onRefresh }
            : // Браслет привязан, его идентификатор известен — сканировать эфир
              // заново значит тратить полминуты и выкладывать чужие устройства
              // в список там, где нужно ровно одно.
              { label: 'Reconnect', onPress: onReconnect }
        }
        caption={<SectionCaption>{summary.caption}</SectionCaption>}
        ring={summary.ring}
        rows={summary.rows}
      />

      <BandMetrics state={state} reading={state.busy} onOpen={setDetail} />

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
          <Text variant="subtitle">Commands</Text>
          <View style={styles.controls}>
            <Button label="Take a reading" onPress={onMeasure} disabled={!live} />
            <Button label="Buzz" variant="tonal" onPress={onVibrate} disabled={!live} />
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
              ? 'A single reading takes about a minute — the optical sensor turns on for it rather than running all the time.'
              : 'Commands need a live connection to the band.'}
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
        {live ? <Button label="Disconnect" variant="plain" onPress={onDisconnect} /> : null}
        <ForgetBand onForget={onForget} />
      </View>
    </Stack>
  );
}

/**
 * Что пошло не так с занятием — словами о последствии, а не о команде.
 *
 * Три состояния различаются тем, где сейчас находятся данные: не начали вовсе,
 * не записали на диск (единственная копия ещё в памяти), не закрыли на
 * устройстве (браслет продолжает считать и тратить заряд).
 */
const WORKOUT_TROUBLE: Record<string, { title: string; subtitle: string } | undefined> = {
  'workout-failed': {
    title: 'The band did not start the workout',
    subtitle: 'Nothing is being recorded. Try again while the band is connected.',
  },
  'workout-save-failed': {
    title: 'The workout did not save',
    subtitle:
      'It is still running here and exists only in the app — the band keeps no copy. Try finishing it again before closing the app.',
  },
  'workout-open': {
    title: 'The band is still in workout mode',
    subtitle:
      'Your workout is saved, but the device keeps counting and draining its battery until it hears otherwise. It closes on the next connection.',
  },
};

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
});
