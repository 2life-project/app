import type { MutableRefObject } from 'react';

import { logger } from '@/core/log/logger';
import { clearBandReadings, setPairedBand } from '@/shared/domain';

import type { Band } from '../api';
import { dropConnection } from '../api';

import { stopBackgroundSync } from './background';
import { clearSnapshot } from './band-data';
import type { BandState } from './band-state';
import { clearHistory } from './history-store';
import { clearNights } from './sleep-store';
import { releaseServerBinding } from './upload';
import { clearOpenSession, rememberWorkout, toRecord } from './workout-store';

/**
 * Забыть браслет: отвязать на устройстве, разорвать связь и стереть память
 * телефона. Порядок важен — снять привязку можно только пока связь жива, а
 * после разрыва браслет уже недоступен. Сброс состояния экрана — за вызывающим.
 */
export async function forgetBand({
  bandRef,
  latest,
  pairedId,
}: {
  bandRef: MutableRefObject<Band | null>;
  latest: MutableRefObject<BandState>;
  pairedId: string | undefined;
}): Promise<void> {
  const active = bandRef.current;
  const deviceId = latest.current.device?.id ?? pairedId;
  bandRef.current = null;

  if (active) {
    try {
      await active.admin.unbind();
    } catch (error) {
      logger.warn('band: устройство не отвязалось', { reason: String(error) });
    }
    await active
      .disconnect()
      .catch((reason: unknown) => logger.warn('band: связь не закрылась', { reason }));
  }

  // Связь могли держать и без нас: другой экран, прошлый запуск, система.
  if (deviceId) await dropConnection(deviceId);
  await stopBackgroundSync();

  // Серверу говорим до того, как забудем адрес: после очистки состояния
  // сказать будет уже нечем, а накопленная очередь принадлежала этой
  // привязке — под новой её отправлять нельзя.
  await releaseServerBinding(latest.current.info?.mac);

  // Занятие могло идти прямо сейчас. Копии на устройстве нет, поэтому
  // дописываем его перед тем, как стереть всё остальное.
  const open = latest.current.session;
  if (open) {
    await rememberWorkout(toRecord(open)).catch((failure: unknown) =>
      logger.error('band: занятие не сохранилось перед отвязкой', { failure }),
    );
  }
  await clearOpenSession();

  setPairedBand(null);
  clearSnapshot();
  clearBandReadings();
  // Архив суток уходит вместе с браслетом: иначе история старого устройства
  // подмешается к новому, а разделить их будет уже нечем.
  await clearHistory().catch((failure: unknown) =>
    logger.error('band: архив суток не стёрся', { failure }),
  );
  await clearNights();
}
