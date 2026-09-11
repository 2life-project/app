/**
 * Драйвер браслета ES100 (протокол JX вендора UTE).
 *
 * Наружу отдаётся только то, что нужно приложению: подключение, чтение данных,
 * управление и подписка на отчёты устройства. Кадры, TLV и номера полей —
 * внутренние детали и за пределы модуля не выходят.
 */

export { Band } from './band';
export type { BandEvent, BandListener } from './events';

export type { Alarm } from './alarms';
export { EVERY_DAY, WEEKDAYS, WEEKEND, Weekday } from './alarms';
export type { DeviceSettings, DoNotDisturb, Threshold } from './settings';
export { NotificationKind } from './notifications';
export type { ActivityState, SportCatalog, Workout, WorkoutRef, WorkoutTick } from './workouts';
export { SportType, sportName } from './sports';

export type { ActivitySample } from './activity';
export type { BatteryState, Capabilities, DeviceInfo, FeatureName } from './device';
export { Feature, supports } from './device';
export type { DaySummary, Measurement, StressDay, StressSample } from './health';
export { SLEEP_STAGES, SleepStage, sleepTotals } from './sleep-stages';
export type { SleepSegment, SleepStageName, SleepStageOnly } from './sleep-stages';
export type { SleepSession } from './sleep';
export { groupSleep, lastSleep } from './sleep';
export type { Recording, RecorderEvent, Storage } from './recorder';
export { BYTES_PER_SECOND } from './recorder';

export { MeasureType } from './commands';

export { dropConnection } from './connection';

export { BAND_NAME, SCAN_TIMEOUT_MS } from './names';
export { connectedBands, mergeFound, scanForBands, sortByProximity } from './scan';
export type { FoundBand, ScanProblem, ScanResult } from './scan';

export { toOgg, durationSeconds } from './audio';
export {
  markUploaded,
  pendingUploads,
  recordingBytes,
  removeSaved,
  saveRecording,
  savedRecordings,
  savedSessions,
} from './storage';
export type { RecordingMark, SavedRecording } from './storage';
export { hashRecording, partFile, type PartFile } from './recording-parts';
export { marksOf, rememberMark } from './storage';
export {
  holdBand,
  holdsBand,
  pullRecordings,
  setSyncDevice,
  syncDevice,
  syncRecordings,
} from './sync';
export { WearHand, type MotionGoal, type UserProfile } from './profile';

export {
  claimRecording,
  completeUpload,
  disconnectBand,
  fetchRecording,
  fetchReceipt,
  registerBand,
  sendBatch,
  uploadPart,
} from './backend';
export type {
  BandLimits,
  BandStream,
  Batch,
  Coverage,
  IngestionRecord,
  Receipt,
  RecordingClaim,
  RemoteRecording,
  TimeQuality,
} from './backend';
export { uuidFrom } from './sha256';
