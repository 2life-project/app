import { Stack } from '@/shared/ui';

import { useBand } from '../model/use-band';

import { BandConnect } from './band-connect';
import { BandDashboard } from './band-dashboard';
import { BodyProfileCard } from './body-profile-card';

/**
 * Раздел браслета на Главной. Временный: он показывает всё, что устройство
 * умеет отдавать, чтобы проверить протокол на живом железе. В продукт из него
 * переедут отдельные показатели, а не раздел целиком.
 */
export function BandPanel() {
  const band = useBand();

  // Данные показываем, как только они есть, а не только на живой связи: они
  // лежат на диске телефона, и прятать вчерашнюю ночь за плашкой «браслет не
  // подключён» — значит терять её каждый раз, пока связь поднимается.
  const hasData = band.state.today.length > 0 || band.state.summary !== undefined;

  return (
    <Stack gap="md">
      {/* Профиль стоит выше связи намеренно: заполнить его можно и нужно до
          привязки, тогда браслет считает по человеку с первой же минуты. Под
          дашбордом он попадался бы на глаза уже после того, как накопились
          посчитанные не по нему числа. */}
      <BodyProfileCard onSaved={(profile) => void band.saveProfile(profile)} />

      {band.state.stage !== 'connected' && !hasData ? (
        <BandConnect
          state={band.state}
          paired={band.paired}
          onScan={band.scan}
          onConnect={band.connect}
          onForget={band.forget}
        />
      ) : (
        <BandDashboard
          state={band.state}
          onScan={band.scan}
          onMeasure={band.measure}
          onVibrate={band.vibrate}
          onStartRecording={band.startRecording}
          onStopRecording={band.stopRecording}
          onPull={band.pullRecordings}
          onRemoveRecording={band.removeRecording}
          onStartWorkout={band.startWorkout}
          onStopWorkout={band.stopWorkout}
          onRefresh={band.refresh}
          onDisconnect={band.disconnect}
          onForget={band.forget}
        />
      )}
    </Stack>
  );
}
