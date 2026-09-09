import type { FeatureName } from '../api';
// Из самих файлов драйвера, а не через его вход: вход тянет транспорт и радио,
// а здесь только счёт секунд и подписи.
import { BYTES_PER_SECOND, type Storage } from '../api/recorder';

/**
 * Паспорт устройства для экрана.
 *
 * Ни одно из этих чисел не показывается как есть: расхождение часов в секундах,
 * свободные килобайты и биты масок человеку ничего не говорят, а объясняют они
 * ровно то, из-за чего к данным бывают вопросы.
 */

/** Что означает возможность из маски. Перечислено только то, что видно человеку. */
export const FEATURE_LABELS: Partial<Record<FeatureName, string>> = {
  audioRecorder: 'Voice recorder',
  heartRateVariability: 'Heart rate variability',
  bloodPressure: 'Blood pressure estimate',
  mood: 'Mood scale',
  temperature: 'Skin temperature',
  gps: 'GPS',
  music: 'Music control',
};

export function featureLabels(supported: readonly FeatureName[]): string[] {
  return supported
    .map((name) => FEATURE_LABELS[name])
    .filter((label): label is string => label !== undefined);
}

/**
 * Расхождение часов словами.
 *
 * Знак важен: отставшие часы двигают историю в прошлое, спешащие — в будущее,
 * и это разные объяснения тому, почему запись легла не в тот час. Меряется
 * оно в момент подключения, до синхронизации: после неё расхождения уже нет.
 */
export function clockSkewText(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined) return null;

  const total = Math.abs(Math.round(seconds));
  if (total < 60) return 'Clock was in sync when it connected.';

  const behind = seconds < 0;
  return `Clock was ${duration(total)} ${behind ? 'behind' : 'ahead'} when it connected — readings before that may sit in the wrong hour.`;
}

/** Память диктофона в часах записи: килобайты человеку ни о чём не говорят. */
export function storageText(storage: Storage | undefined): string | null {
  if (!storage) return null;

  const seconds = Math.floor((storage.freeKb * 1024) / BYTES_PER_SECOND);
  const share = storage.totalKb > 0 ? Math.round((storage.freeKb / storage.totalKb) * 100) : 0;
  return `${duration(seconds)} of recording free · ${share}%`;
}

/** Заряд и то, что с ним происходит. */
export function batteryText(battery: { level: number; charging: boolean } | undefined): string {
  if (!battery) return '—';
  return battery.charging ? `${battery.level}% · charging` : `${battery.level}%`;
}

/** Часы и минуты без нулевых хвостов: «2 h 5 min», «14 min», «40 s». */
function duration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/**
 * Сила сигнала словами.
 *
 * Децибелы на экране выбора устройства бесполезны: человеку нужно понять, его
 * это браслет на столе или чужой за стеной. Границы взяты по обычной для BLE
 * шкале: около −60 это вытянутая рука, за −85 связь уже рвётся.
 */
export function signalText(rssi: number): string {
  if (rssi === 0) return 'paired with this phone';
  if (rssi > -60) return 'right here';
  if (rssi > -75) return 'nearby';
  return 'far — bring it closer';
}
