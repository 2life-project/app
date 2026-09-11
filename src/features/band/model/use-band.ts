import { usePairedBand } from '@/shared/domain';

import { useBandActions } from './band-actions';
import { connect, disconnect, forget, scan } from './link';
import { collectRecordings } from './link-recordings';
import { refresh } from './link-refresh';
import { bandRef, patch, stateRef, useBandState } from './link-store';
import { useAlarms } from './use-alarms';
import { useService } from './use-service';
import { useDeviceSettings } from './use-settings';

/**
 * Экранная сторона связи с браслетом: подписка на состояние и команды.
 *
 * Сама связь живёт на уровне приложения (`link.ts`) и экрана не ждёт: уход с
 * него не рвёт соединение, возврат — не поднимает заново. Здесь только то,
 * что нужно разметке.
 */
export function useBand() {
  const state = useBandState();
  const paired = usePairedBand();

  // Будильники и настройки держат своё состояние: список читается по
  // требованию, и тянуть двадцать обменов по радио в общее состояние незачем.
  const alarms = useAlarms(bandRef);
  const settings = useDeviceSettings(bandRef);
  const service = useService(bandRef);

  const actions = useBandActions({ bandRef, collect: collectRecordings, patch, stateRef });

  return {
    state,
    paired,
    scan,
    connect,
    disconnect,
    forget,
    refresh,
    alarms,
    settings,
    service,
    ...actions,
  };
}
