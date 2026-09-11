// Побочный эффект импорта: подписка на выход из аккаунта, стирающая личные
// данные. Подключается здесь, потому что это единственное место, через которое
// домен видят все.
import './on-sign-out';

export {
  ageOf,
  clearBodyProfile,
  EMPTY_PROFILE,
  isComplete,
  LIMITS,
  runStepOf,
  setBodyProfile,
  useBodyProfile,
  walkStepOf,
  within,
  type BodyProfile,
  type Sex,
  type Hand,
} from './body-profile';
export { mergeServerProfile, saveBodyProfile, syncBodyProfile } from './body-profile-sync';
export {
  clearBandReadings,
  sourceCaption,
  readingsNote,
  setBandReadings,
  useBandReadings,
  vitalsOf,
  type BandReadings,
  type Vital,
  type VitalGroup,
} from './band-readings';
export {
  onPairedBand,
  pairedBand,
  setPairedBand,
  useBandPaired,
  usePairedBand,
  type PairedBand,
} from './connection';
export {
  createEvent,
  eventKey,
  eventTitle,
  fetchEvent,
  LAYERS,
  type CreatedEvent,
  type EventInput,
  type EventValue,
  type JournalEvent,
  type Layer,
  type NewEvent,
} from './event';
export {
  availability,
  coverageRatio,
  isStale,
  isThin,
  metricFill,
  percentFill,
  type MetricAggregation,
  type MetricAvailability,
  type MetricBaseline,
  type MetricCoverage,
  type MetricFreshness,
  type MetricManual,
  type MetricPeriod,
  type MetricPoint,
  type MetricProvenance,
  type MetricSeries,
  type MetricValue,
} from './metric';
export {
  baselineText,
  coverageText,
  deltaText,
  formatMetric,
  formatNumber,
  metricBasis,
  metricUnitText,
  metricValueText,
  NO_VALUE,
} from './metric-format';
