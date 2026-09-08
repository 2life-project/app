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
    return <BandConnect state={band.state} onScan={band.scan} onConnect={band.connect} />;
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
    />
  );
}
