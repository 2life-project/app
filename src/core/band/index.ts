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

/** Имя, под которым браслет виден при поиске. */
export const BAND_NAME = 'ES100';

/**
 * Сколько сканировать. Браслет рекламирует себя с паузами, и на пяти секундах
 * его регулярно не видно — это не отсутствие устройства, а слишком короткий поиск.
 */
export const SCAN_TIMEOUT_MS = 30_000;
