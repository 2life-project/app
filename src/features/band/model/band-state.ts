import type {
  ActivitySample,
  DeviceInfo,
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

/**
 * Чем занято подключение прямо сейчас.
 *
 * Подключение к браслету — не одно действие, а четыре подряд, и вместе они
 * занимают до полуминуты. Без имени текущего шага это полминуты неподвижного
 * «connecting…», после которых человек решает, что приложение зависло, и жмёт
 * заново — обрывая обмен на середине.
 */
export type ConnectStep = 'opening' | 'configuring' | 'reading';

export type BandState = {
  stage: BandStage;
  /** Шаг подключения. Есть только пока идёт подключение. */
  step?: ConnectStep;
  /**
   * Идёт восстановление связи после обрыва, а не первое подключение. Экран
   * говорит об этом иначе: человек ничего не нажимал и не должен решать, что
   * приложение зависло.
   */
  retrying: boolean;
  /**
   * Что пошло не так. Три последних — про занятие: его не начали, его не
   * удалось сохранить, или браслет остался в режиме тренировки после финиша.
   */
  problem?:
    ScanProblem | 'connect-failed' | 'workout-failed' | 'workout-save-failed' | 'workout-open';
  found: FoundBand[];
  device?: { id: string; name: string };
  /** Паспорт и заряд одним ответом устройства: адрес, модель, прошивка, батарея. */
  info?: DeviceInfo;
  /**
   * На сколько часы браслета расходились с телефоном в момент подключения.
   * Единственное объяснение сдвинутых дат в истории — после синхронизации
   * расхождения уже не видно.
   */
  clockSkew?: number | null;
  /** Что эта прошивка умеет. Пусто — масок ещё не читали, а не «ничего не умеет». */
  supported: FeatureName[];
  /**
   * Дошёл ли профиль тела до устройства в последнюю попытку.
   *
   * `undefined` — не пробовали. `false` — заполненный профиль на телефоне есть,
   * а на браслете его нет: тот продолжает считать по заводским значениям, и
   * молчать об этом нельзя — числа выглядят измеренными.
   */
  profileSent?: boolean;
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
  retrying: false,
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
