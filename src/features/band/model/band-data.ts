import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '@/core/log/logger';

import type { Band, FeatureName, Workout } from '../api';
import { Feature, savedRecordings, supports } from '../api';

import type { BandState } from './band-state';
import { startOfToday } from './day-metrics';
import { loadDay, needsRead, recentDays, rememberDay } from './history-store';
import { loadWorkouts } from './workout-store';

/**
 * Данные браслета: что читаем с устройства и что храним между запусками.
 *
 * Показания принадлежат телефону и браслету, а не аккаунту: они читаются по
 * Bluetooth, лежат локально и к сессии на сервере отношения не имеют. Поэтому
 * выход из аккаунта их не трогает — иначе раздел каждый раз начинался бы с
 * пустых графиков, хотя браслет всё это время писал.
 */
/**
 * Номер в ключе — версия формы снимка. Меняется форма — меняется ключ, и старая
 * запись просто перестаёт читаться: разбирать чужую форму на лету значит ловить
 * падения в отрисовке, а данные всё равно приедут с устройства заново.
 */
const KEY = '2life:band-snapshot.2';

/**
 * Что переживает перезапуск. Остальное — состояние соединения, оно всегда новое.
 *
 * Список один: и форма снимка, и перечень ключей для сборки выводятся из него.
 * Двумя списками, которые обязаны совпадать, это уже было — и разъезжалось
 * молча при каждом новом поле.
 */
const KEEP = [
  'info',
  'clockSkew',
  'supported',
  'live',
  'summary',
  'measurement',
  'worn',
  'sleep',
  'today',
  'stress',
  'recordings',
  'workouts',
  'states',
  'storage',
] as const satisfies readonly (keyof BandState)[];

type Snapshot = Pick<BandState, (typeof KEEP)[number]>;

const ISO = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/;

/** JSON не знает дат: без восстановления время замера приезжает строкой. */
function revive(_key: string, value: unknown): unknown {
  return typeof value === 'string' && ISO.test(value) ? new Date(value) : value;
}

export async function loadSnapshot(): Promise<Snapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw === null) return null;

    const snapshot = JSON.parse(raw, revive) as Snapshot;

    // Снимок мог пролежать до следующего дня. Показывать вчерашние минуты как
    // сегодняшние нельзя: карточки складывают их в дневные шаги и пульс, и
    // человек в первую секунду после полуночи видит чужой день как свой.
    const midnight = startOfToday();
    return { ...snapshot, today: snapshot.today.filter((sample) => sample.at >= midnight) };
  } catch (failure) {
    logger.warn('band: сохранённые данные не прочитались', { failure });
    return null;
  }
}

export function saveSnapshot(state: BandState): void {
  // `Object.fromEntries` теряет связь ключа со значением и возвращает
  // `Record<string, unknown>`. Список ключей — тот же `KEEP`, по которому
  // объявлен `Snapshot`, поэтому набор полей здесь верен по построению.
  const snapshot = Object.fromEntries(KEEP.map((key) => [key, state[key]])) as unknown as Snapshot;

  void AsyncStorage.setItem(KEY, JSON.stringify(snapshot)).catch((failure: unknown) =>
    logger.warn('band: данные не сохранились', { failure }),
  );
}

export function clearSnapshot(): void {
  void AsyncStorage.removeItem(KEY).catch(() => undefined);
}

/**
 * Прочитать с устройства всё, что показывает раздел.
 *
 * Каждый показатель читается сам по себе и сам по себе доезжает на экран.
 * Одним запросом на всё делать нельзя: у браслета своя очередь команд, любой
 * ответ может не прийти за отведённое время, и на общем `try` один такой
 * промах оставлял бы раздел полностью пустым — хотя остальное устройство
 * отдало.
 *
 * История, сон и стресс идут по одному, а не пачкой: браслет отвечает на них
 * многими кадрами подряд, и одновременные запросы перемешали бы ответы.
 */
/** Сколько последних тренировок вычитывать: у каждой своя сводка отдельным обменом. */
const WORKOUTS_SHOWN = 3;

/** Заходы активности берём за сутки: дальше их сотни, а смысл только у свежих. */
const DAY_MS = 24 * 60 * 60 * 1000;

export async function loadEverything(
  band: Band,
  patch: (next: Partial<BandState>) => void,
): Promise<void> {
  const now = new Date();
  const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  await step('info', async () => {
    patch({ info: await band.info(), clockSkew: band.clockSkewSeconds });
  });

  // Маски возможностей устройство отдало при подключении. Без них экран
  // предлагал бы настраивать то, чего в этой прошивке нет: неподдержанную
  // команду браслет подтверждает пустым эхом, неотличимым от успеха.
  patch({ supported: supportedFeatures(band) });
  await step('сводка дня', async () => patch({ summary: await band.daySummary() }));
  await step('записи', async () => patch({ recordings: await band.recorder.list() }));
  await step('память', async () =>
    patch({ storage: (await band.recorder.storage()) ?? undefined }),
  );
  await step('сон', async () => patch({ sleep: await band.sleep(week, now) }));
  await step('стресс', async () => patch({ stress: await band.stress(startOfToday(now), now) }));

  // Тренировки браслет заводит сам, без единой кнопки. Берём только последние:
  // сводка каждой — отдельный обмен по радио, и вычитывать всю неделю значит
  // держать человека перед пустым экраном ради записей, которых он не просил.
  // Заходы активности браслет распознаёт сам и пишет отдельным каналом — не
  // тем, где лежат тренировки. Полноценной тренировки на ES100 не бывает
  // вовсе, а вот эти заходы есть каждый день, и до сих пор они никуда не шли.
  await step('распознанная активность', async () =>
    patch({ states: await band.workouts.states(new Date(now.getTime() - DAY_MS), now) }),
  );

  await step('тренировки', async () => {
    const refs = await band.workouts.list(week, now);
    const recent = refs.slice(-WORKOUTS_SHOWN);
    const summaries: Workout[] = [];
    for (const ref of recent) summaries.push(await band.workouts.summary(ref.id));
    patch({ workouts: summaries.reverse() });
  });

  patch({ saved: savedRecordings(), recorded: await loadWorkouts() });

  // История последней: она забирается кадр за кадром и идёт дольше всего
  // остального вместе взятого. Впереди неё числа успели бы устареть.
  await step('история', async () => patch({ today: await band.history(startOfToday(now), now) }));
}

/** Какие возможности взведены в масках этого устройства. */
export function supportedFeatures(band: Band): FeatureName[] {
  const capabilities = band.features;
  if (!capabilities) return [];

  const names = Object.keys(Feature) as FeatureName[];
  return names.filter((name) => supports(capabilities, name));
}

/** Один шаг чтения. Провал одного не отменяет остальные, но виден в логе. */
async function step(what: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (failure) {
    logger.warn('band: не прочиталось', { what, reason: String(failure) });
  }
}

/**
 * Дочитать сутки, которые устройство ещё помнит, а телефон уже нет.
 *
 * Отдельно от `loadEverything` и после него: это единственное чтение, которое
 * нужно не экрану, а архиву. Идёт оно долго — по кадру на минуту, — и человек
 * всё это время смотрит на уже показанные числа, а не на «читаем…».
 *
 * По одним суткам за раз: у браслета одна очередь команд, и параллельные
 * запросы истории перемешали бы ответы.
 */
export async function backfillHistory(band: Band, mac?: string): Promise<string[]> {
  const filled: string[] = [];

  for (const day of recentDays()) {
    const stored = await loadDay(day);
    if (!needsRead(day, stored)) continue;

    const [year, month, date] = day.split('-').map(Number);
    if (!year || !month || !date) continue;

    const from = new Date(year, month - 1, date);
    // Сутки могут ещё идти: тогда конец окна — сейчас, а не полночь впереди.
    const end = new Date(year, month - 1, date + 1);
    const to = end > new Date() ? new Date() : end;

    try {
      await rememberDay(day, await band.history(from, to), mac);
      filled.push(day);
    } catch (failure) {
      // Один непрочитанный день не отменяет остальные: связь могла оборваться
      // на середине, и следующий заход дочитает то, что не успело.
      logger.warn('band: сутки не дочитались', { day, reason: String(failure) });
    }
  }

  return filled;
}
