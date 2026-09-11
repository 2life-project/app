import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { to } from '@/shared/nav';
import { space } from '@/shared/theme';
import {
  Banner,
  Button,
  Card,
  LinkCard,
  SectionCaption,
  SectionSummary,
  Stack,
  Text,
} from '@/shared/ui';

import type { BandState } from '../model/band-state';
import { summaryOfBand } from '../model/band-summary';

import { ForgetBand } from './forget-band';
import { RecordingsCard } from './recordings-card';

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
  onRefresh: () => void;
  /** Поднять связь с уже привязанным браслетом: без поиска, по known id. */
  onReconnect: () => void;
  onDisconnect: () => void;
  onForget: () => void;
}) {
  const live = state.stage === 'connected';

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

      {/* Показания живут в своих разделах: пульс — в «Сердце», кислород — в
          «Дыхании», сон и стресс — в «Восстановлении», шаги и занятия — на
          Главной. Экран устройства — про связь и команды, а не витрина. */}
      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Where the numbers are</Text>
          <LinkCard
            label="Heart, breathing and sleep — in Body"
            onPress={() => router.push(to.body())}
          />
          <LinkCard label="Steps and workouts — on Home" onPress={() => router.push(to.home())} />
        </Stack>
      </Card>

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Commands</Text>
          <View style={styles.controls}>
            <Button label="Take a reading" onPress={onMeasure} disabled={!live} />
            <Button label="Buzz" variant="tonal" onPress={onVibrate} disabled={!live} />
            {state.recording ? (
              <Button
                label={state.recordingPaused ? 'Finish recording' : 'Stop recording'}
                variant="tonal"
                onPress={onStopRecording}
              />
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
            {state.recordingPaused
              ? 'Recording is paused: one press on the band continues it, two presses finish and save.'
              : live
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

      <View style={styles.footer}>
        {live ? <Button label="Disconnect" variant="plain" onPress={onDisconnect} /> : null}
        <ForgetBand onForget={onForget} />
      </View>
    </Stack>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
});
