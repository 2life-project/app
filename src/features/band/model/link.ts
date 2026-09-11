import { AppState } from 'react-native';

import { onBleRestore } from '@/core/ble';
import { logger } from '@/core/log/logger';
import { onPairedBand, pairedBand, setPairedBand, syncBodyProfile } from '@/shared/domain';

import { Band, mergeFound, scanForBands, type FoundBand } from '../api';

import { startBackgroundSync } from './background';
import { backfillHistory, loadSnapshot } from './band-data';
import { INITIAL } from './band-state';
import { forgetBand } from './forget-band';
import { adopt, release } from './link-events';
import { isForeground, refresh, setForeground, shareSoon } from './link-refresh';
import { bandRef, patch, reset, snapshot, stateRef, update } from './link-store';
import { sendProfile } from './profile-sync';
import { publishReadings } from './publish-readings';
import { publishDays } from './upload';
import { loadOpenSession } from './workout-store';

/**
 * Связь с браслетом на уровне приложения.
 *
 * Поднимается при старте, если браслет привязан, и держится, пока человек сам
 * не отключится: уход с экрана связь не рвёт, а обрыв тут же ставит новое
 * подключение. На iOS запрос на подключение не истекает — система сама
 * доведёт его, когда браслет появится в эфире, даже в фоне, — а с
 * идентификатором восстановления поднимет приложение ради этого из выгрузки.
 * Пуши браслета обрабатываются, где бы приложение ни было, и уезжают на
 * сервер не реже раза в минуту.
 */

/**
 * Паузы перед повторным подключением. Первая почти сразу — обрыв чаще всего
 * мгновенный; дальше реже: браслет вне зоны не появится оттого, что мы
 * стучимся чаще, а радио и заряд тратятся на каждой попытке.
 */
const RETRY_DELAYS_MS = [1_000, 5_000, 15_000, 30_000, 60_000] as const;

/** Сколько связь должна продержаться, чтобы считаться устойчивой. */
const STABLE_CONNECTION_MS = 60_000;

/** Как часто обновлять сводку дня при открытом приложении. */
const LIVE_POLL_MS = 30_000;

export function retryDelay(attempt: number): number {
  return RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] ?? 0;
}

let started = false;
/** Человек отключился сам — тогда обратно его не тащим. */
let manual = false;
/** Неудачные попытки подряд. Сбрасывает только связь, которая продержалась. */
let attempt = 0;
let connectedSince: number | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let stopScan: (() => void) | null = null;
/** Профиль, который уже принят устройством: второй раз то же самое не шлём. */
let sentProfile: string | null = null;

/** Запустить связь. Вызывается из корня приложения один раз. */
export function start(): void {
  if (started) return;
  started = true;

  // Показания с прошлого запуска — сразу, не дожидаясь Bluetooth: раздел не
  // должен начинаться с пустых графиков, пока связь ещё не поднялась.
  loadSnapshot()
    .then((stored) => {
      if (!stored) return;
      patch(stored);
      publishReadings({ ...INITIAL, ...stored });
    })
    .catch((failure: unknown) => logger.error('band: снимок не поднялся', { failure }));

  // Незавершённое занятие переживает перезапуск: устройство его не хранит.
  loadOpenSession()
    .then((open) => open && patch({ session: open }))
    .catch((failure: unknown) => logger.error('band: занятие не поднялось', { failure }));

  AppState.addEventListener('change', (next) => {
    setForeground(next === 'active');
    syncPoll();
    // Возврат на экран — повод попробовать снова, если связь так и не поднялась.
    if (next === 'active') keep();
  });

  // Привязка появляется позже старта — с диска или после подключения руками.
  onPairedBand(keep);

  // Система подняла приложение ради браслета: он снова в эфире и подключён
  // за нас. Берём его под управление тем же путём, что и обычно.
  onBleRestore((ids) => {
    const known = pairedBand();
    if (known && ids.includes(known.id)) keep();
  });

  keep();
}

/** Держать связь: привязка есть, а связи нет — поднять. */
function keep(): void {
  const known = pairedBand();
  if (!known || manual) return;

  const { stage } = snapshot();
  if (stage === 'connected' || stage === 'connecting' || stage === 'scanning') return;
  void connect({ id: known.id, name: known.name, rssi: 0 });
}

function clearRetry(): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
}

function scheduleRetry(): void {
  if (retryTimer || manual || !pairedBand()) return;

  const wait = retryDelay(attempt);
  attempt += 1;
  patch({ retrying: attempt > 1 });
  retryTimer = setTimeout(() => {
    retryTimer = null;
    keep();
  }, wait);
}

/** Связь оборвалась сама: отпустить и поставить новое подключение. */
function lost(): void {
  // Счёт попыток обнуляет только связь, которая продержалась: короткая
  // означает, что устройство мигает, и пауза должна расти, а не начинаться
  // заново.
  const lasted = connectedSince === null ? 0 : Date.now() - connectedSince;
  if (lasted > STABLE_CONNECTION_MS) attempt = 0;
  syncPoll();
  scheduleRetry();
}

const HOOKS = {
  onLost: lost,
  onFresh: shareSoon,
  onRecordingFinished: () => void refresh(),
};

/** Взять соединение под управление со стандартной подпиской на отчёты. */
export function adoptBand(next: Band | null): void {
  adopt(next, HOOKS);
  syncPoll();
}

/**
 * Пока приложение на экране и связь есть, сводка дня подтягивается сама: шаги
 * и калории живой отчёт не несёт, а смотреть на цифры получасовой давности при
 * подключённом браслете незачем. В фоне опрос бессмысленен: система
 * придерживает радио.
 */
function syncPoll(): void {
  const wanted = snapshot().stage === 'connected' && isForeground() && bandRef.current !== null;
  if (!wanted) {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    return;
  }
  if (pollTimer) return;

  pollTimer = setInterval(() => {
    void bandRef.current
      ?.daySummary()
      .then((summary) => patch({ summary }))
      .catch((failure: unknown) => {
        // Сама по себе связь не восстановится, а опрос ходил бы в неё до
        // бесконечности — по строке в лог каждые полминуты.
        logger.error('band: связь потеряна на опросе', { reason: String(failure) });
        void bandRef.current
          ?.disconnect()
          .catch((reason: unknown) => logger.warn('band: связь не закрылась', { reason }));
        release();
        patch({ stage: 'idle' });
        lost();
      });
  }, LIVE_POLL_MS);
}

export async function scan(): Promise<void> {
  stopScan?.();
  patch({ stage: 'scanning', found: [], problem: undefined });

  const result = await scanForBands((device) => {
    update((current) => ({ found: mergeFound(current.found, device) }));
  });

  if (!result.ok) {
    patch({ stage: 'failed', problem: result.problem });
    return;
  }
  stopScan = result.stop;
}

export async function connect(device: FoundBand): Promise<void> {
  // Второе подключение поверх идущего — это два соединения к одному
  // устройству: их уведомления перемешиваются, и оба читают обрывки.
  if (snapshot().stage === 'connecting') return;

  stopScan?.();
  stopScan = null;
  manual = false;
  clearRetry();
  patch({ stage: 'connecting', step: 'opening', device: { id: device.id, name: device.name } });

  try {
    const connected = await Band.connect(device.id);
    adoptBand(connected);
    patch({ step: 'configuring' });

    // Пульс раз в минуту: это минимум, который принимает прошивка, и с ним
    // живые отчёты приходят каждые десять секунд.
    await connected.watchHeartRate(1);
    await startBackgroundSync(device.id);

    // Привязка живёт на телефоне рядом с показаниями: браслет принадлежит
    // устройству, а не аккаунту, и переподключаться после каждого входа
    // человек не должен.
    setPairedBand({ id: device.id, name: device.name, pairedAt: new Date().toISOString() });

    connectedSince = Date.now();
    patch({ stage: 'connected', step: 'reading', retrying: false, problem: undefined });
    syncPoll();

    // Профиль уезжает при первом подключении и после правок, а не на каждом
    // реконнекте: в плохом покрытии их десятки за час, и каждый стоил бы
    // запроса к серверу и записи по радио ради тех же чисел.
    void syncBodyProfile().then(async (profile) => {
      const wanted = JSON.stringify(profile);
      if (sentProfile === wanted) return;
      const sent = await sendProfile(connected, profile);
      if (sent) sentProfile = wanted;
      patch({ profileSent: sent });
    });

    await refresh();
    patch({ step: undefined });

    // Дочитать сутки, которые устройство ещё помнит, а телефон уже нет. После
    // `refresh`, а не вместо: экран к этому моменту уже полон, а архив
    // набивается молча. Дочитанные сутки уезжают следом — в состоянии их нет.
    if (isForeground()) {
      void backfillHistory(connected)
        .then((days) => publishDays(days, connected.clockSkewSeconds))
        .catch((failure: unknown) =>
          logger.error('band: дочитанные сутки не отправились', { failure }),
        );
    }
  } catch (error) {
    logger.warn('band: подключение не удалось', { reason: String(error) });
    release();
    patch({ stage: 'failed', step: undefined, problem: 'connect-failed' });
    scheduleRetry();
  }
}

/** Отключение по кнопке: обратно не тащим, иначе кнопка ничего не значит. */
export async function disconnect(): Promise<void> {
  manual = true;
  clearRetry();
  await bandRef.current?.disconnect();
  release();
  // Данные и привязка остаются: отключение — это разрыв связи, а не отказ от
  // браслета. Забыть его — отдельное действие.
  patch({ stage: 'idle', found: [], problem: undefined, retrying: false });
  syncPoll();
}

/** Забыть браслет целиком: устройство, сервер, память телефона. */
export async function forget(): Promise<void> {
  clearRetry();
  await forgetBand({ bandRef, latest: stateRef, pairedId: pairedBand()?.id });
  manual = false;
  attempt = 0;
  sentProfile = null;
  reset();
  syncPoll();
}
