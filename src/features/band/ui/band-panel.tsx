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

  if (band.state.stage !== 'connected') {
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
