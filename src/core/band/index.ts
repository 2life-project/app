/**
 * Драйвер браслета ES100 (протокол JX вендора UTE).
 *
 * Наружу отдаётся только то, что нужно приложению: подключение, чтение данных,
 * управление и подписка на отчёты устройства. Кадры, TLV и номера полей —
 * внутренние детали и за пределы модуля не выходят.
 */

export { Band } from './band';
export type { BandEvent, BandListener } from './band';

export type { ActivitySample } from './activity';
export type { BatteryState, Capabilities, DeviceInfo, FeatureName } from './device';
export { Feature, supports } from './device';
export type { DaySummary, Measurement, SleepSegment, SleepStageName, StressSample } from './health';
export { SleepStage, sleepTotals } from './health';
export type { Recording, RecorderEvent, Storage } from './recorder';
export { BYTES_PER_SECOND } from './recorder';

export { MeasureType } from './commands';

export { BAND_NAME, SCAN_TIMEOUT_MS } from './names';
export { mergeFound, scanForBands, sortByProximity } from './scan';
export type { FoundBand, ScanProblem, ScanResult } from './scan';

export { toOgg, durationSeconds } from './audio';
export {
  markUploaded,
  pendingUploads,
  readRecording,
  removeSaved,
  saveRecording,
  savedRecordings,
  savedSessions,
  usedBytes,
} from './storage';
export type { SavedRecording } from './storage';
export { startBackgroundSync, stopBackgroundSync, syncRecordings } from './sync';
