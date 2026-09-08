import { useBand } from '../model/use-band';

import { BandConnect } from './band-connect';
import { BandDashboard } from './band-dashboard';

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

  if (band.state.stage !== 'connected' && !hasData) {
    return (
      <BandConnect
        state={band.state}
        paired={band.paired}
        onScan={band.scan}
        onConnect={band.connect}
        onForget={band.forget}
      />
    );
  }

  return (
    <BandDashboard
      state={band.state}
      onScan={band.scan}
      onMeasure={band.measure}
      onVibrate={band.vibrate}
      onStartRecording={band.startRecording}
      onStopRecording={band.stopRecording}
      onPull={band.pullRecordings}
      onRefresh={band.refresh}
      onDisconnect={band.disconnect}
      onForget={band.forget}
    />
  );
}
