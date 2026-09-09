import type {
  ActivitySample,
  FeatureName,
  ActivityState,
  DaySummary,
  FoundBand,
  Measurement,
  Recording,
  SavedRecording,
  ScanProblem,
  SleepSession,
  Storage,
  StressDay,
  Workout,
} from '../api';

import type { WorkoutSession } from './workout-session';
import type { RecordedWorkout } from './workout-store';

/** Где сейчас раздел: ищем, подключаемся, на связи или отвалились. */
export type BandStage = 'idle' | 'scanning' | 'connecting' | 'connected' | 'failed';

export type BandState = {
  stage: BandStage;
  /**
   * Что пошло не так. Три последних — про занятие: его не начали, его не
   * удалось сохранить, или браслет остался в режиме тренировки после финиша.
   */
  problem?:
    ScanProblem | 'connect-failed' | 'workout-failed' | 'workout-save-failed' | 'workout-open';
  found: FoundBand[];
  device?: { id: string; name: string };
  battery?: number;
  firmware?: string;
  /** Адрес устройства из паспорта. Им ключуются сутки в архиве. */
  mac?: string;
  /** Что эта прошивка умеет. Пусто — масок ещё не читали, а не «ничего не умеет». */
  supported: FeatureName[];
  /** Последний живой отчёт: приходит сам каждые десять секунд. */
  live?: ActivitySample;
  summary?: DaySummary;
  measurement?: Measurement;
  worn?: boolean;
  sleep: SleepSession[];
  /** Поминутная история за сегодня: из неё строятся все графики дня. */
  today: ActivitySample[];
  stress: StressDay[];
  recordings: Recording[];
  /** Тренировки: полноценные записи с видом спорта. На ES100 их не бывает. */
  workouts: Workout[];
  /** Заходы активности, которые браслет распознал сам: начало и длительность. */
  states: ActivityState[];
  /** Идущее занятие. Живёт только здесь: устройство его не хранит. */
  session?: WorkoutSession;
  /** Записанные занятия с телефона. */
  recorded: RecordedWorkout[];
  saved: SavedRecording[];
  storage?: Storage;
  /** Идёт ли запись прямо сейчас. */
  recording: boolean;
  busy: boolean;
};

/** Пустое состояние раздела: связи нет, данных нет, ничего не делается. */
export const INITIAL: BandState = {
  stage: 'idle',
  found: [],
  supported: [],
  sleep: [],
  today: [],
  stress: [],
  recordings: [],
  workouts: [],
  states: [],
  recorded: [],
  saved: [],
  recording: false,
  busy: false,
};
