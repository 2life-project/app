# Модуль браслета: API и модель данных

Документ для бэкенда и для всякого, кто подключает браслет из приложения.
Описывает **наш модуль**: какие у него входы и методы, какими типами он говорит,
что снимает с устройства и в каком виде отдаёт наружу.

Как устроить хранение и какими сделать адреса — решаете вы. Здесь формы данных,
их ключи и требования, из которых эти решения вытекают.

Три документа про браслет разделены так:

| Документ                             | О чём                                            |
| ------------------------------------ | ------------------------------------------------ |
| [band-hardware.md](band-hardware.md) | что физически внутри: датчики, память, кристалл  |
| [band-protocol.md](band-protocol.md) | как с устройством говорить: биты, байты, команды |
| **этот**                             | что из этого отдаёт модуль: API, типы, данные    |

Устройство: ES100, платформа `NAL-WB00`, протокол вендора UTE (диалект JX).
Связь — Bluetooth LE напрямую с телефона, без облака производителя. Всё
описанное снято с живого устройства и проверено на нём.

---

## 1. Что модуль умеет

Семь входов. Всё перечисленное уже работает.

| Вход                 | Возможности                                                                                                                                                                                                                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Band`               | подключение и переподключение к запомненному устройству, измерение расхождения часов и их синхронизация, паспорт, заряд, маски возможностей, состояние ношения, вибрация «найти», сводка дня с разбивкой по типам активности, разовый замер, живой пульс, сон сессиями, стресс сутками с сеткой, поминутная история с PAI и высотой |
| `band.settings`      | чтение всех настроек разом; запись языка, единиц длины и веса, таймаута экрана, автозамера и непрерывного пульса, интервалов пульса и SpO₂, порогов пульса и SpO₂ с тревогой, автозамеров стресса, настроения и давления с интервалами, единицы давления, «не беспокоить», профиля, дневной цели и зон пульса на устройстве         |
| `band.alarms`        | список, предел числа ячеек, запись целиком, добавление в свободную ячейку, правка, включение и выключение, удаление, полная очистка                                                                                                                                                                                                 |
| `band.notifications` | разрешение на звонки и сообщения, отправка уведомления с типом сигнала                                                                                                                                                                                                                                                              |
| `band.recorder`      | занятость памяти, список записей, только последняя, старт, стоп, пауза, продолжение, удаление, метки, выгрузка файла с докачкой                                                                                                                                                                                                     |
| `band.workouts`      | старт, пауза, продолжение и финиш занятия; секундный поток; заходы движения, размеченные устройством; каталог видов спорта; список и сводка тренировок (на ES100 всегда пусты)                                                                                                                                                      |
| `band.admin`         | отвязка от аккаунта, повторное сопряжение, отвязка диктофона, пароль, заводской сброс, стирание всех записей                                                                                                                                                                                                                        |

Плюс подписка на отчёты, которые устройство присылает само: живая активность,
результат разового замера, надевание и снятие, секунда тренировки, события
диктофона, потеря связи.

**Всё это уезжает на сервер** через приёмник `es100` (см. раздел 3.14):
прочитанное складывается в очередь на телефоне и отправляется пачками, записи —
файлом по частям с докачкой. Очередь переживает перезапуск и отсутствие сети.

---

## 2. Карта модуля

```
src/features/band
├── api/     драйвер устройства: кадры, команды, разбор, хранилище файлов
├── model/   состояние экрана, производные показатели, накопление тренировки
└── ui/      экран и карточки
```

Наружу из фичи выходят только экран и панель (`BandPanel`, `BandScreen`). Всё
остальное — внутреннее устройство модуля; драйвер доступен внутри фичи как
`../api`.

Ключевые файлы драйвера:

| Файл                               | Ответственность                                       |
| ---------------------------------- | ----------------------------------------------------- |
| `api/band.ts`                      | корень: подключение, чтение, подписка на отчёты       |
| `api/history-api.ts`               | архив за период: поминутная история, сон, стресс      |
| `api/transport.ts`                 | одно соединение, очередь команд, сборка ответов       |
| `api/frame.ts`, `api/tlv.ts`       | кадры и полезная нагрузка                             |
| `api/commands*.ts`                 | сборка кадров команд                                  |
| `api/activity.ts`                  | поминутные слоты: история и живой отчёт одним кодеком |
| `api/health.ts`                    | сводка дня, стресс, разовый замер, ношение            |
| `api/sleep*.ts`                    | стадии сна и группировка в сессии                     |
| `api/workouts*.ts`                 | тренировки и распознанная активность                  |
| `api/recorder*.ts`, `api/audio.ts` | диктофон и упаковка звука в Ogg                       |
| `api/storage.ts`                   | файлы записей на телефоне                             |
| `api/recording-parts.ts`           | хеш записи и части, которыми она уезжает              |
| `api/sync.ts`                      | выгрузка записей с устройства на телефон              |
| `api/backend.ts`                   | контракт приёмника: формы и запросы                   |
| `api/sha256.ts`                    | хеш файла и устойчивые идентификаторы событий         |

Ключевые файлы модели:

| Файл                       | Ответственность                                                |
| -------------------------- | -------------------------------------------------------------- |
| `model/link.ts`            | связь на уровне приложения: подъём, удержание, переподключение |
| `model/link-store.ts`      | состояние связи вне React и подписка экрана на него            |
| `model/link-events.ts`     | отчёты устройства: живая минута, замер, диктофон, обрыв        |
| `model/link-refresh.ts`    | чтение после подключения и отправка прочитанного               |
| `model/link-recordings.ts` | записи с устройства по живому соединению: финиш, подключение   |
| `model/use-band.ts`        | экранная сторона: подписка и команды                           |
| `model/forget-band.ts`     | отвязка: устройство, сервер, память телефона                   |
| `model/band-state.ts`      | форма этого состояния                                          |
| `model/band-data.ts`       | что читаем с устройства и что переживает перезапуск            |
| `model/band-actions.ts`    | команды, которые нажимает человек                              |
| `model/workout-session.ts` | накопление идущей тренировки                                   |
| `model/workout-store.ts`   | тренировки на диске телефона                                   |
| `model/day-metrics.ts`     | ряды, суммы, зоны и прореживание для графиков                  |
| `model/analysis.ts`        | пороги вычислений — договорённость, не деталь                  |
| `model/binding.ts`         | регистрация браслета на сервере и версия привязки              |
| `model/outbox*.ts`         | очередь на отправку: что уезжает и как режется                 |
| `model/publish.ts`         | что из прочитанного ставить в очередь и с каким окном          |
| `model/upload.ts`          | отправка пачек и разбор ответов приёмника                      |
| `model/audio-upload.ts`    | выгрузка записей по частям с докачкой                          |
| `model/background.ts`      | фоновое окно: забрать с устройства, отправить                  |

---

## 3. Публичный API

Сигнатуры даны в TypeScript. Всё асинхронное — по одной команде за раз: у
устройства нет опознавателя запроса, параллельные обмены перепутались бы
ответами.

### 3.1. Поиск и подключение

```ts
function scanForBands(onFound: (band: FoundBand) => void): Promise<ScanResult>;
function connectedBands(): Promise<FoundBand[]>;
function mergeFound(list: readonly FoundBand[], band: FoundBand): FoundBand[];
function sortByProximity(bands: readonly FoundBand[]): FoundBand[];
function dropConnection(deviceId: string): Promise<void>;

const BAND_NAME = 'ES100';
const SCAN_TIMEOUT_MS = 30_000;
```

`scanForBands` **не останавливается сам** — останавливает экран, когда человек
выбрал устройство или ушёл. Отказ приходит не исключением, а разобранной
причиной: `bluetooth-off`, `no-permission`, `radio-silent`. Три разных текста в
интерфейсе, а не один «не получилось».

`connectedBands` обязателен рядом со сканированием: браслет, уже подключённый к
телефону, рекламу прекращает, и поиск его не найдёт никогда.

### 3.2. `Band` — корень

```ts
class Band {
  static connect(deviceId: string): Promise<Band>;
  disconnect(): Promise<void>;
  subscribe(listener: (event: BandEvent) => void): () => void;

  info(): Promise<DeviceInfo>;
  battery(): Promise<number>;
  deviceTime(): Promise<Date | undefined>;
  syncTime(): Promise<void>;
  loadCapabilities(): Promise<Capabilities>;
  find(on: boolean): Promise<void>;

  daySummary(): Promise<DaySummary>;
  measure(): Promise<void>;
  watchHeartRate(intervalMinutes?: number): Promise<void>;
  history(from: Date, to: Date): Promise<ActivitySample[]>;
  sleep(from: Date, to: Date): Promise<SleepSession[]>;
  stress(from: Date, to: Date): Promise<StressDay[]>;

  get features(): Capabilities | null;
  get worn(): boolean | undefined;
  get clockSkewSeconds(): number | null;
  get connectedAt(): Date;

  readonly settings: BandSettings;
  readonly alarms: BandAlarms;
  readonly notifications: BandNotifications;
  readonly recorder: BandRecorder;
  readonly workouts: BandWorkouts;
  readonly admin: BandAdmin;
}
```

`connect` делает три вещи сверх открытия канала: читает часы устройства **до**
синхронизации (иначе расхождение исчезает и объяснить сдвинутые даты нечем),
выставляет своё время и читает маски возможностей.

`measure` только запускает замер — результат придёт отчётом примерно через
минуту.

`worn` берётся из отчёта, а не опросом: команды чтения для ношения в протоколе
нет.

### 3.3. `band.settings`

```ts
class BandSettings {
  read(): Promise<DeviceSettings>;
  doNotDisturb(): Promise<DoNotDisturb | null>;
  twoWaySettings(): Promise<Uint8Array>;

  setLanguage(code: number): Promise<void>;
  setLengthUnits(metric: boolean): Promise<void>;
  setWeightUnits(metric: boolean): Promise<void>;
  setScreenTimeout(seconds: number): Promise<void>;

  setAutoHeartRate(on: boolean): Promise<void>;
  setContinuousHeartRate(on: boolean): Promise<void>;
  setHeartRateInterval(minutes: number): Promise<void>;
  setHeartRateHighLimit(enabled: boolean, bpm: number): Promise<void>;
  setHeartRateLowLimit(enabled: boolean, bpm: number): Promise<void>;
  setHeartRateZones(zones: HeartRateZones): Promise<void>;

  setContinuousOxygen(on: boolean): Promise<void>;
  setOxygenInterval(minutes: number): Promise<void>;
  setOxygenLowLimit(enabled: boolean, percent: number): Promise<void>;

  setAutoStress(enabled: boolean, intervalMinutes: number): Promise<void>;
  setAutoMood(on: boolean): Promise<void>;
  setMoodInterval(minutes: number): Promise<void>;
  setAutoBloodPressure(on: boolean): Promise<void>;
  setBloodPressureInterval(minutes: number): Promise<void>;
  setBloodPressureUnit(unit: number): Promise<void>;

  setDoNotDisturb(options: DoNotDisturbInput): Promise<void>;
  setProfile(profile: UserProfile): Promise<void>;
  setGoal(goal: MotionGoal): Promise<void>;
}
```

`read()` спрашивает устройство по одной настройке — двадцать обменов подряд.
Читать перед показом обязательно: приложение не знает, что человек менял с
другого телефона или в программе вендора.

**Часть настроек односторонняя.** Единицы веса и автозамер пульса только
пишутся; напоминание о малоподвижности, лимиты уведомлений и поддержка погоды —
только читаются. Хранить можно все, применить обратно на устройство — не все.

### 3.4. `band.alarms`

```ts
class BandAlarms {
  list(): Promise<Alarm[]>;
  limit(): Promise<number | undefined>;
  save(list: readonly Alarm[]): Promise<void>;
  add(alarm: Omit<Alarm, 'slot'>): Promise<Alarm[]>;
  update(slot: number, patch: Partial<Omit<Alarm, 'slot'>>): Promise<Alarm[]>;
  setEnabled(slot: number, enabled: boolean): Promise<Alarm[]>;
  remove(slot: number): Promise<Alarm[]>;
  clear(): Promise<void>;
}
```

**Устройство принимает будильники только целиком:** слоты, которых нет в записи,
обнуляются. Поэтому каждое изменение — это чтение, правка и запись всего списка,
и каждый метод возвращает **весь список**, а не изменённый элемент.

`add` спрашивает у прошивки предел числа ячеек (на нашем экземпляре — 10) и
бросает, когда свободных нет: сверх предела будильник молча не сохранился бы, а
человек просто не проснулся.

### 3.5. `band.notifications`

```ts
class BandNotifications {
  configure(calls: boolean, messages: boolean): Promise<void>;
  push(options: {
    kind: 1 | 2 | 7; // call | message | application
    title: string; // до 32 символов
    body: string; // до 60 символов
    application?: string; // до 32 символов
  }): Promise<void>;
}
```

Экрана нет — до человека дойдёт вибрация и светодиод. Текст всё равно
передаётся: по типу уведомления прошивка выбирает рисунок вибрации, и без него
звонок неотличим от сообщения.

### 3.6. `band.recorder`

```ts
class BandRecorder {
  storage(): Promise<Storage | null>;
  list(): Promise<Recording[]>;
  latest(): Promise<Recording[]>;
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(session: number): Promise<void>;
  resume(session: number): Promise<void>;
  remove(session: number): Promise<void>;
  marks(): Promise<Uint8Array>;
  download(
    session: number,
    size: number,
    options?: { from?: number; onProgress?: (received: number) => void },
  ): Promise<Uint8Array>;
}
```

`download` умеет продолжать с места обрыва — устройство отдаёт диапазон байт.
`remove` вызывать только после того, как файл сохранён: он освобождает память
браслета.

`marks()` отдаёт сырой пакет: раскладку списка меток на устройстве проверить
нечем (см. §9).

### 3.7. `band.workouts`

```ts
class BandWorkouts {
  start(sport: number): Promise<void>;
  pause(sport: number): Promise<void>;
  resume(sport: number): Promise<void>;
  finish(
    sport: number,
    total: { seconds: number; distance: number; calories: number },
  ): Promise<void>;
  operator(): Promise<number | undefined>;

  catalog(): Promise<SportCatalog>;
  states(from: Date, to: Date): Promise<ActivityState[]>;
  list(from: Date, to: Date): Promise<WorkoutRef[]>;
  summary(id: number): Promise<Workout>;
  detail(id: number, index: number): Promise<Field[]>;
  pace(id: number, paceIndex: number): Promise<Field[]>;
}
```

`start` сначала разрешает устройству докладывать о ходе занятия, потом запускает
его: без первой команды браслет ведёт тренировку молча.

`list` и `summary` на ES100 **всегда пусты** — см. §5.9.

### 3.8. `band.admin`

```ts
class BandAdmin {
  unbind(): Promise<void>;
  requestPairing(): Promise<void>;
  unbindRecorder(): Promise<void>;
  setPassword(digits: readonly number[]): Promise<void>; // шесть цифр, пустой массив снимает
  factoryReset(): Promise<void>;
  eraseRecordings(): Promise<void>;
}
```

Отдельным входом намеренно: перепутать «синхронизировать» и «стереть всё» не
должно быть возможно по опечатке в имени метода. Ни одна из этих команд не
спрашивает подтверждения на устройстве.

### 3.9. События

```ts
type BandEvent =
  | { kind: 'activity'; sample: ActivitySample }
  | { kind: 'measurement'; measurement: Measurement }
  | { kind: 'wear'; worn: boolean; at: Date }
  | { kind: 'workout'; tick: WorkoutTick }
  | { kind: 'recorder'; event: RecorderEvent }
  | { kind: 'disconnected' };
```

`band.subscribe(listener)` возвращает функцию отписки. Событий вне открытого
соединения не бывает — это ограничение устройства, а не модуля.

### 3.10. Файлы записей на телефоне

```ts
function saveRecording(session: number, raw: Uint8Array): SavedRecording;
function savedRecordings(): SavedRecording[];
function savedSessions(): Set<number>;
function pendingUploads(): SavedRecording[];
function readRecording(session: number): Promise<Uint8Array | undefined>;
function markUploaded(session: number): void;
function removeSaved(session: number): void;
function usedBytes(): number;

function rememberMark(session: number, mark: RecordingMark): void;
function marksOf(session: number): RecordingMark[];

function toOgg(raw: Uint8Array): Uint8Array;
function durationSeconds(bytes: number): number;
```

Файл лежит в файловой системе телефона под именем `<сессия>.<байт>.ogg`;
выгруженные помечаются переименованием в `.sent.ogg`. Имя несёт длину **исходного
потока**: из неё считается длительность, а по размеру файла Ogg она была бы
завышена на несколько процентов.

Метки хранятся рядом отдельным файлом: они приходят отчётами задолго до того,
как файл скачан, и держать их в памяти нельзя.

### 3.11. Фоновое окно

```ts
function startBackgroundSync(deviceId: string): Promise<void>;
function stopBackgroundSync(): Promise<void>;
function syncRecordings(deviceId: string): Promise<{ fetched: number; freed: number }>;
function holdBand(on: boolean): void;
```

В окне системы задача делает два дела по порядку: забирает с устройства **одну
запись** (удаляя её с браслета только когда файл скачан целиком) и отправляет на
сервер всё накопленное — пачки показаний и файлы записей. Система выдаёт окна
сама и редко; `syncRecordings` вызывается ещё и с экрана, потому что при
открытии приложения окон не выдают вовсе.

`holdBand` защищает от того, чтобы фоновая задача подключилась поверх живого
соединения экрана: браслет допускает одно. Отправка на сервер идёт в любом
случае: ей связь с устройством не нужна.

### 3.12. Связь на уровне приложения

Соединение держит не экран, а модуль `model/link.ts`, который стартует из
корня приложения (`features/band/index.ts`). Пока браслет привязан и человек
не отключился сам, связь поднимается при старте, переживает уход с экрана и
после обрыва тут же ставит новое подключение (паузы 1 → 5 → 15 → 30 → 60 с,
сброс после устойчивой минуты связи). На iOS запрос на подключение не
истекает: система доводит его сама, когда браслет появляется в эфире, в том
числе в фоне; `BleManager` создаётся с идентификатором восстановления, и
после выгрузки из памяти приложение поднимается в фоне ради события
Bluetooth (после принудительного закрытия пользователем — нет, это правило
системы). Пуши устройства обрабатываются в любом состоянии приложения и
уезжают на сервер не реже раза в минуту; долгие чтения — история, дочитывание
суток — только на экране. Android для постоянной связи в фоне требует
foreground service — не сделано.

### 3.13. Экранный слой

```ts
function useBand(): {
  state: BandState;
  paired: PairedBand | null;
  scan(): Promise<void>;
  connect(device: FoundBand): Promise<void>;
  disconnect(): Promise<void>;
  forget(): Promise<void>;
  refresh(): Promise<void>;
  vibrate(): Promise<void>;
  measure(): Promise<void>;
  startRecording(): Promise<void>;
  stopRecording(): Promise<void>;
  pullRecordings(): Promise<void>;
  removeRecording(session: number): void;
  saveProfile(profile: BodyProfile): Promise<void>;
  startWorkout(sport: number): Promise<void>;
  stopWorkout(): Promise<void>;
  /** Будильники: читаются по требованию, каждая операция отдаёт весь список. */
  alarms: Alarms;
  /** Настройки устройства: читаются при открытии, пишутся по одной. */
  settings: DeviceSettingsState;
  /** Служебные команды: стирание записей, заводской сброс, пересопряжение. */
  service: Service;
};
```

Будильники, настройки и служебное держат своё состояние, а не общее: полное
чтение настроек — два десятка обменов подряд, список будильников — ещё
столько же, и платить за них при каждом открытии раздела незачем.

Один хук на всё намеренно: у браслета одно соединение, и разнести его по
нескольким состояниям — значит получить два экрана, спорящих за радио.

`BandState` — форма того, что видит экран:

```ts
type BandState = {
  stage: 'idle' | 'scanning' | 'connecting' | 'connected' | 'failed';
  problem?:
    ScanProblem | 'connect-failed' | 'workout-failed' | 'workout-save-failed' | 'workout-open';
  found: FoundBand[];
  device?: { id: string; name: string };
  battery?: number;
  firmware?: string;
  live?: ActivitySample; // последний живой отчёт
  today: ActivitySample[]; // поминутная история за сегодня
  summary?: DaySummary;
  measurement?: Measurement;
  worn?: boolean;
  sleep: SleepSession[];
  stress: StressDay[];
  states: ActivityState[]; // заходы движения от устройства
  workouts: Workout[]; // на ES100 всегда пусто
  session?: WorkoutSession; // идущее занятие
  recorded: RecordedWorkout[]; // записанные занятия с телефона
  recordings: Recording[]; // что лежит на браслете
  saved: SavedRecording[]; // что скачано на телефон
  storage?: Storage;
  recording: boolean;
  busy: boolean;
};
```

**Карточки в разделах.** Фича отдаёт четыре секции — `BandHeartSection`,
`BandBreathingSection`, `BandRecoverySection`, `BandActivitySection`, — и
маршруты «Тела» и Главной подставляют их в слоты своих экранов: пульс — в
«Сердце», кислород с разовым замером — в «Дыхании», последняя ночь, история
ночей с телефона (`model/sleep-store.ts`, до девяноста ночей) и стресс — в
«Восстановлении», шаги и занятия со стартом тренировки — в «Активности».
Секция читает то же состояние связи, что и экран устройства, и без привязки
не рисует ничего. Экран устройства — про связь, команды и записи.

### 3.14. Показания для остального приложения

Раздел устройства показывает всё подряд; Главной, «Телу» и Журналу нужны итоги
дня. Они публикуются в общий доменный слой — `@/shared/domain`, — потому что
фича фиче не видна, а показатели видны всем:

```ts
type BandReadings = {
  date: string; // YYYY-MM-DD по часам телефона
  updatedAt: string;
  live: boolean; // была ли связь в момент снятия
  steps?: number;
  distanceMeters?: number;
  calories?: number;
  activeMinutes?: number;
  heartRate?: number;
  restingHeartRate?: number;
  minHeartRate?: number;
  maxHeartRate?: number;
  bloodOxygen?: number;
  hrv?: number;
  stress?: number;
  sleepMinutes?: number;
  sleepEfficiency?: number;
  worn?: boolean; // известно только при живой связи
};

function useBandReadings(date: string): BandReadings | null;
function vitalsOf(band: BandReadings | null, group?: VitalGroup): Vital[];
function readingsNote(band: BandReadings | null): string | null;
```

**Правило между источниками.** То, что браслет измеряет сам, берётся с
браслета; оценки, шкалы, нормы и биохимия остаются серверными. Множества не
пересекаются, поэтому спорить о числе некому, а под числом стоит подпись об
источнике и его свежести.

**Архив суток.** Устройство хранит около четырёх суток и затирает старое молча,
поэтому прочитанные сутки складываются на диск в той форме, в какой уедут на
сервер: сутки целиком, с отметкой времени чтения и адресом устройства. После
подключения пропущенные дни дочитываются, пока браслет их ещё помнит.

**Профиль тела** живёт там же, правится в одном месте и уезжает на сервер и
на устройство. Перед записью на устройство телефон сверяется с сервером:
сервер главный, пустое у него дозаполняется с телефона и отправляется, а
профиль «по умолчанию» знанием не считается. Правка, которую сервер не принял,
помнится как неотправленная и уезжает первой при следующей сверке. Команды
чтения профиля с устройства в протоколе нет, сверить записанное нечем.

**Показания принадлежат человеку, а привязка — телефону.** Снимок состояния,
архив суток, записанные занятия и файлы записей стираются или прячутся при
выходе из аккаунта: телефоном пользуются двое, и второй не должен увидеть
чужую ночь и чужой пульс. Привязка к устройству при этом остаётся — браслет
переподключать после каждого входа не нужно. Папка записей — своя у каждого
аккаунта, очередь на отправку ключуется аккаунтом (см. 3.14). Минуты
вчерашнего дня из снимка отбрасываются при загрузке.

### 3.15. Отправка на сервер

```ts
function publishToServer(state: BandState): Promise<void>; // после чтения устройства
function publishDays(days: string[], clockSkewSeconds: number | null): Promise<void>;
function flushOutbox(): Promise<void>; // из фона, без связи с устройством
function uploadRecordings(): Promise<void>;
function releaseServerBinding(mac?: string): Promise<void>; // «забыть браслет»
```

Приёмник — `POST /api/v2/bands/{id}/ingestions`, контракт `es100-v1`. Правила,
которых держится клиент:

- **Привязка** — тройка «аккаунт, адрес устройства, установка приложения».
  Регистрация идёт один раз по первому чтению; версию привязки и пределы пачки
  выдаёт сервер. Очередь ключуется аккаунтом и браслетом: накопленное одним
  человеком не отправляется от имени другого, а после «забыть браслет» —
  стирается, потому что принадлежало прежней привязке.
- **Записи уезжают как есть**: `payload` — исходный объект модуля, поля не
  переименовываются. Живой отчёт не отправляется: та же минута приходит
  историей и перекрывает его.
- **Идентификатор события устойчив**: считается из адреса устройства, потока и
  естественного ключа события (минута, дата, начало ночи); у снимков — сводки
  дня, состояния устройства, настроек — ещё и из содержимого, потому что
  приёмник не даёт менять содержимое под уже принятым именем. Прочитанное
  второй раз уезжает под тем же именем, а в очереди одно имя стоит не больше
  одного раза: дубль в пачке приёмник отвергает вместе со всей пачкой. Снимок,
  который приёмник уже получил — принял или отверг, — второй раз не ставится,
  пока не изменится содержимое: повтор под принятым именем с новым временем
  чтения для него конфликт.
- **Пачка, отправленная хоть раз, замораживается целиком** — состав записей и
  конверт (версия привязки, версия модуля, пояс, эпоха часов). Повтор после
  обрыва байт в байт тот же; ответ «уже принято» — норма.
- **Эпоха часов** меняется, когда часы устройства при подключении разошлись с
  телефоном больше чем на минуту; прочитанная в этом сеансе история помечается
  `clock_reset`. Пачка не пересекает границу эпох.
- **Доставленным считается по приёму** (`202`/`200`), не по разбору. Результат
  разбора запрашивается следом и пишется в лог: данные, которые доехали, но не
  стали показателями, — это то, что надо видеть.
- **Аудио** отправленным считается только по `audioStored: true`. Файл
  регистрируется с SHA-256 (считается кусками, с передышкой для интерфейса),
  грузится частями по пределу сервера — файлом, нативной сессией
  `expo-file-system`, — докачивается по его же списку принятых частей; часть
  другого размера на сервере — отказ, а не пропуск. Старые записи уезжают
  первыми. Метки уезжают и с заявкой, и своим потоком: файл могут не скачать
  вовсе, а нажатие кнопки существует только в отчёте.
- **Отказ пачки** — слишком большая, не по схеме, конфликт записи — делит её
  пополам, пока виновник не останется один; он отбрасывается с записью в лог.
  После этого пачка растёт от одной записи, удваиваясь на каждом приёме: иначе
  каждая отвергнутая запись стоила бы столько запросов, сколько раз полная
  пачка делится пополам.
- **Отказ разбора** с `retryable: true` возвращает запись в очередь (до трёх
  раз); остальные оговорки пишутся в лог. Отказы без ответа сервера — сеть,
  хранилище, BLE — пишутся уровнем `error`: в релизе виден только он.

Что клиент **не** отправляет, потому что не держит: настройки устройства,
окна ношения, секундные точки тренировки с временем, события диктофона.

---

## 4. Типы данных

То, чем модуль говорит наружу. Именно эти формы имеет смысл повторять на сервере.

```ts
/** Поминутный слот: и история, и живой отчёт. */
type ActivitySample = {
  at: Date; // начало минуты
  source: 'history' | 'live'; // откуда приехал слот — правило слияния строится на этом
  steps?: number;
  calories?: number;
  distance?: number; // МЕТРЫ
  heartRate?: number;
  averageHeartRate?: number;
  restingHeartRate?: number;
  minHeartRate?: number;
  maxHeartRate?: number;
  bloodOxygen?: number; // %
  systolic?: number;
  diastolic?: number; // мм рт. ст., только парой
  hrv?: number; // мс
  mood?: number; // 1–5, шкала устройства
  bloodSugar?: number; // ммоль/л, у ES100 всегда пусто
  elevation?: number; // метры за минуту
  paiLow?: number;
  paiMedium?: number;
  paiHigh?: number;
  paiLowMinutes?: number;
  paiMediumMinutes?: number;
  paiHighMinutes?: number;
};

/** Дневная сводка от самого устройства. */
type DaySummary = {
  date: string; // YYYY-MM-DD по часам телефона
  totals: { steps: number; distance: number; calories: number };
  heartRate?: number; // на момент выборки, не среднее за день
  measuredAt?: Date;
  byActivity: ActivityBlock[];
};

type ActivityBlock = {
  kind:
    | 'unknown'
    | 'walk'
    | 'run'
    | 'climb'
    | 'ride'
    | 'stand'
    | 'lightSleep'
    | 'deepSleep'
    | 'awake'
    | 'swim';
  steps: number;
  distance: number; // метры
  calories: number;
  elevation: number; // метры
  sleepMinutes: number;
};

/** Сон: сессия, а не плоский список отрезков. */
type SleepSession = {
  from: Date;
  to: Date;
  inBed: number; // минуты, включая пробуждения
  asleep: number; // минуты сна
  efficiency: number; // проценты
  awakenings: number;
  cycles: number; // по возвратам в rem
  longestBlock: number; // минуты
  totals: Record<'deep' | 'light' | 'awake' | 'rem' | 'nap' | 'snore', number>;
  shares: Record<'deep' | 'light' | 'rem' | 'awake', number>; // проценты
  segments: SleepSegment[];
};

type SleepSegment = {
  at: Date;
  minutes: number;
  stage: 'deep' | 'light' | 'awake' | 'rem' | 'nap' | 'snore';
};

/** Стресс: сутки с сеткой, а не голый список точек. */
type StressDay = {
  midnight: Date;
  stepMinutes: number; // шаг сетки: без него редкий замер неотличим от потери
  samples: { at: Date; value: number }[]; // value 1–100
};

/** Результат разового замера. */
type Measurement = {
  id: string; // ставит клиент: в кадре опознавателя нет
  at: Date;
  heartRate?: number;
  bloodOxygen?: number;
  stress?: number;
  hrv?: number;
  systolic?: number;
  diastolic?: number;
  mood?: number;
};

/** Заход движения, размеченный устройством. */
type ActivityState = {
  at: Date;
  minutes: number;
  type: number; // во всех наблюдениях 1
  stream: 'status' | 'state'; // два независимых потока, различие не установлено
};

/** Секунда идущей тренировки. */
type WorkoutTick = {
  seconds: number;
  heartRate?: number;
  steps?: number;
  distance?: number; // метры
  calories?: number;
  averageHeartRate?: number;
  at?: Date;
};

/** Тренировка, накопленная клиентом: единственный её экземпляр. */
type RecordedWorkout = {
  sport: number;
  startedAt: string; // ISO со смещением
  seconds: number;
  distance: number; // метры
  calories: number;
  steps: number;
  averageHeartRate?: number;
  peakHeartRate?: number;
  heartRates: number[]; // посекундный ряд
};

/** Запись на устройстве. */
type Recording = {
  session: number; // время начала, оно же идентификатор
  startedAt: Date;
  bytes: number;
  seconds: number;
  type: number;
};

/** Запись, скачанная на телефон. */
type SavedRecording = {
  session: number;
  startedAt: Date;
  uri: string;
  deviceBytes: number; // длина потока с устройства — из неё длительность
  uploadBytes: number; // размер файла Ogg — он и уедет в хранилище
  seconds: number;
  uploaded: boolean;
  marks: { index: number; offsetSeconds: number }[];
};

/** Событие диктофона. */
type RecorderEvent = { at: Date; id: string } & (
  | { kind: 'started'; session: number }
  | { kind: 'paused'; session: number }
  | { kind: 'resumed'; session: number }
  | { kind: 'finished'; session: number; bytes: number; byButton: boolean }
  | { kind: 'marked'; session: number; offsetSeconds: number; index: number }
);

/** Память диктофона. */
type Storage = { totalKb: number; freeKb: number; bytesPerSecond: number };

/** Паспорт и заряд. */
type DeviceInfo = {
  mac?: string;
  platform?: string;
  hardware?: string;
  firmware?: string;
  protocol?: string;
  system?: string;
  serial?: string;
  battery?: { level: number; charging: boolean; lowBatteryAlert: boolean };
};

/** Возможности: сырые списки и производные флаги. */
type Capabilities = {
  lists: Record<number, number>; // объект, а не массив: списки нумеруются с единицы
  maxPacket: number;
  has(list: number, bit: number): boolean;
};

/** Настройки устройства. */
type DeviceSettings = {
  language?: number;
  screenAutoLight?: boolean;
  metricLength?: boolean;
  screenTimeout?: number;
  heartRateInterval?: number;
  oxygenInterval?: number;
  continuousHeartRate?: boolean;
  continuousOxygen?: boolean;
  heartRateHighLimit?: { enabled: boolean; bpm: number };
  heartRateLowLimit?: { enabled: boolean; bpm: number };
  oxygenLowLimit?: { enabled: boolean; percent: number };
  autoStress?: boolean;
  autoMood?: boolean;
  autoBloodPressure?: boolean;
  stressInterval?: number;
  moodInterval?: number;
  bloodPressureInterval?: number;
};

type Alarm = {
  slot: number; // позиция, а не личность
  enabled: boolean;
  hour: number;
  minute: number;
  days: number; // маска: бит 0 — воскресенье, бит 6 — суббота
  label?: string; // до 20 символов
};

/** Профиль на устройство. */
type UserProfile = {
  age: number;
  birth: { year: number; month: number; day: number };
  gender: number; // 0 женский, 1 мужской — шкала прошивки
  height: number; // см
  weight: number; // кг
  walkStepLength: number; // см
  runStepLength: number; // см
  maxOxygenUptake?: number;
  maxOxygenUptakeAt?: number;
  wearHand?: 0 | 1; // левая | правая
};

/** Найденное устройство. */
type FoundBand = {
  id: string; // платформенный: на iOS это UUID, не MAC
  name: string;
  rssi: number;
  mac?: string; // из рекламного пакета
  connected?: boolean; // уже на связи с телефоном
};
```

---

## 5. Данные: что мы отдаём

### 5.1. Голосовые записи

Самая объёмная и самая требовательная часть. Всё остальное — числа, здесь файлы.

Браслет — диктофон с одной кнопкой. Двойное нажатие начинает запись, одиночное
ставит на паузу и снимает с неё, повторное двойное завершает и сохраняет — на
одиночное нажатие устройство отвечает паузой, а не финишем, и файл остаётся
открытым. Экрана нет, поэтому человек не видит ни длительности, ни того,
идёт ли запись, — только вибрацию. Внутри записи он может **ставить метки**:
нажатие во время записи отмечает момент.

| Свойство  | Значение                      |
| --------- | ----------------------------- |
| Кодек     | Opus                          |
| Частота   | 16 000 Гц                     |
| Каналы    | 1                             |
| Битрейт   | 16 кбит/с, жёсткий CBR        |
| Поток     | ровно **2000 байт в секунду** |
| Контейнер | Ogg — **упаковывает клиент**  |

Устройство отдаёт голый поток пакетов Opus без контейнера: такой файл не откроет
плеер и не примет часть распознавателей. Клиент собирает `OpusHead`, `OpusTags`,
режет на страницы и считает CRC32 — **на сервер уезжает нормальный `.ogg`**.
Подробности упаковки — в [band-protocol.md](band-protocol.md), §10.

| Объём                  | Размер               |
| ---------------------- | -------------------- |
| 1 минута               | ≈ 120 КБ             |
| 1 час                  | ≈ 7,2 МБ             |
| полная память браслета | ≈ 103 МиБ ≈ 15 часов |

**Два разных размера, и путать их нельзя.** `deviceBytes` — длина сырого потока,
из неё считается длительность (`seconds = deviceBytes / 2000`). `uploadBytes` —
размер файла Ogg, который реально уедет в хранилище; упаковка добавляет около
4 %. Сервер, который сверит `Content-Length` загрузки с `deviceBytes`, отвергнет
каждую загрузку.

```json
{
  "session": 1788248934,
  "startedAt": "2026-09-07T16:43:02+03:00",
  "deviceBytes": 13280,
  "uploadBytes": 13798,
  "seconds": 6.64,
  "marks": [{ "index": 1, "offsetSeconds": 42 }]
}
```

`session` — время начала записи в секундах Unix. **Это единственный
идентификатор записи на устройстве.** Ключ — пара `(deviceMac, session)`: она же
защищает от дубликатов при повторной отправке после обрыва.

**Метки лежат внутри записи.** `offsetSeconds` — смещение от начала файла,
`index` — номер метки. Вне своей записи метка не значит ничего. Метки приходят
отчётами по ходу записи и накапливаются клиентом; если запись уже отправлена, а
метка доехала позже, она дописывается тем же ключом.

События вокруг записи устройство присылает само:

```json
{ "kind": "paused", "session": 1788248934, "at": "2026-09-07T16:43:09+03:00" }
```

`kind`: `started` · `paused` · `resumed` · `finished` · `marked`. У `finished`
дополнительно `bytes` и **`byButton`** — различает «человек нажал кнопку на
браслете» и «остановило приложение». Для продукта это разные события: первое
осознанное.

**Время события ставит телефон, а не устройство.** `session` — момент начала
записи, а не момент паузы: запись на семь секунд звука может растянуться на сорок
минут стенных часов. Ключом по `(session, kind)` обойтись нельзя: цикл «пауза →
продолжение → пауза → продолжение» схлопнется в одну строку каждого вида.
Идентификатор события ставит клиент.

Порядок работы у нас:

1. Человек нажимает кнопку — устройство пишет во внутреннюю память, не в ОЗУ.
2. Приложение получает отчёт `finished` с готовым размером файла и тут же, по
   тому же соединению, забирает файл. Записи, сделанные без связи, событием не
   придут: список спрашивается при подключении и при возврате приложения на
   экран. Во время занятия качка не идёт — секундный поток застыл бы до финиша.
3. Файл качается по одной записи за раз диапазоном байт, поэтому дозагрузка
   после обрыва штатная.
4. Клиент упаковывает поток в Ogg и кладёт в файловую систему телефона.
5. Запись помечается выгруженной переименованием; на браслете её можно удалить и
   освободить память.

Фоновая задача делает то же самое своим соединением, когда связь приложения
не держится, но iOS выдаёт ей окна сама и редко.

### 5.2. Поминутный слот

Основной поток. Устройство копит слоты по минутам и отдаёт кадрами за период. За
сутки — до 1440 слотов, реально меньше: пустые минуты оно не пишет.

```json
{
  "at": "2026-09-09T14:32:00+03:00",
  "source": "history",
  "steps": 118,
  "calories": 5,
  "distance": 85,
  "heartRate": 96,
  "averageHeartRate": 94,
  "restingHeartRate": 59,
  "minHeartRate": 88,
  "maxHeartRate": 104,
  "bloodOxygen": 97,
  "systolic": 124,
  "diastolic": 78,
  "hrv": 44,
  "mood": 3,
  "elevation": 12,
  "paiLow": 3,
  "paiMedium": 5,
  "paiHigh": 0,
  "paiLowMinutes": 14,
  "paiMediumMinutes": 6,
  "paiHighMinutes": 0
}
```

| Поле                 | Единица    | Замечание                                                 |
| -------------------- | ---------- | --------------------------------------------------------- |
| `at`                 | —          | начало минуты, всегда выровнено                           |
| `source`             | —          | `history` или `live`, см. 5.3                             |
| `distance`           | **метры**  | не километры                                              |
| `heartRate`          | уд/мин     | значение на момент слота                                  |
| `averageHeartRate`   | уд/мин     | среднее за слот                                           |
| `restingHeartRate`   | уд/мин     | приходит не в каждом слоте                                |
| `bloodOxygen`        | %          |                                                           |
| `systolic/diastolic` | мм рт. ст. | приходят только парой                                     |
| `hrv`                | мс         |                                                           |
| `mood`               | 1–5        | шкала устройства, вендором не документирована             |
| `bloodSugar`         | ммоль/л    | поле в протоколе есть, датчика у ES100 нет — всегда пусто |
| `elevation`          | метры      | набор высоты за минуту                                    |
| `pai*`               | баллы      | оценка нагрузки самим устройством, три уровня             |
| `pai*Minutes`        | минуты     | сколько минут в каждом уровне                             |

**PAI считает браслет по своей модели.** Пересчитать эти баллы ни на клиенте, ни
на сервере нельзя — формулу вендор не публикует. Если они нужны, хранить надо то,
что пришло.

**Все поля кроме `at` и `source` — необязательные.** В одном слоте обычно два-три
поля: устройство пишет только то, что в эту минуту измеряло. Слот, где есть
только пульс, — норма, а не битые данные.

Ключ — `(deviceMac, at)`. При совпадении нужно **слияние полей**, а не замена
строки: устройство может дослать в тот же слот показатель, которого в первый раз
не было.

### 5.3. Живой отчёт: одна минута в развитии

Пока приложение подключено, устройство шлёт отчёт по **текущей, ещё не
закончившейся минуте** — примерно раз в десять секунд, без запроса. Это не
готовая минута, а её промежуточное состояние: на границе минуты счётчики
сбрасываются.

Так минута приезжает из истории, когда её уже посчитали:

```json
{
  "at": "2026-09-08T23:56:00+03:00",
  "source": "history",
  "restingHeartRate": 88,
  "maxHeartRate": 88,
  "minHeartRate": 88,
  "averageHeartRate": 88,
  "mood": 3
}
```

А так та же минута 23:56 приезжала вживую — настоящая выгрузка с устройства:

| Время      | Что в отчёте                                                              |
| ---------- | ------------------------------------------------------------------------- |
| `23:56:06` | `restingHeartRate: 88`                                                    |
| `23:56:10` | `restingHeartRate, maxHeartRate, minHeartRate, averageHeartRate` — все 88 |
| `23:56:20` | то же                                                                     |
| `23:56:30` | то же                                                                     |
| `23:56:40` | то же                                                                     |
| `23:56:41` | то же **плюс** `mood: 3`                                                  |
| `23:56:50` | то же                                                                     |
| `23:56:59` | то же                                                                     |

Восемь отчётов на одну минуту. Первый нёс **одно** поле, последние — **пять**.
Байтовая картина того же — в [band-protocol.md](band-protocol.md), §7.1.

Что из этого следует:

- **Отметка времени — текущая секунда, а не начало минуты.** Клиент округляет её
  до начала минуты перед отправкой, иначе одна минута превращается в восемь
  разных строк.
- **Отчёты дублируются.** `23:56:06` и `23:56:41` пришли по два раза подряд с
  одинаковым содержимым. Это нормальная работа устройства, а не потеря пакета.
- **Набор полей растёт по ходу минуты.** Ранний отчёт беднее позднего.
- **Счётчики внутри минуты растут** от нуля к итогу.
- **История всегда сильнее живого отчёта.** Приложение закрылось на `23:56:20` —
  уехали шаги за двадцать секунд, а не за минуту.

**Правило слияния при совпадении `(deviceMac, at)`:**

1. Пришло `history` — заменить строку целиком, живые значения выбросить.
2. Пришло `live`, а в строке уже `history` — **проигнорировать**.
3. Пришло `live`, в строке тоже `live` — слить поля: каждое берётся из более
   позднего отчёта, отсутствующие в нём сохраняются от предыдущих.

Без пункта 1 последние минуты каждого сеанса остаются занижены навсегда: история
перечитывается только за сегодня, и вчерашний хвост уже никто не исправит.

### 5.4. Сводка дня

Устройство считает дневные итоги само и отдаёт **блоками по типам активности**.

```json
{
  "date": "2026-09-09",
  "measuredAt": "2026-09-09T14:31:00+03:00",
  "heartRate": 93,
  "totals": { "steps": 699, "distance": 955, "calories": 53 },
  "byActivity": [
    {
      "kind": "walk",
      "steps": 699,
      "distance": 955,
      "calories": 36,
      "elevation": 0,
      "sleepMinutes": 0
    },
    {
      "kind": "unknown",
      "steps": 0,
      "distance": 0,
      "calories": 17,
      "elevation": 0,
      "sleepMinutes": 0
    }
  ]
}
```

Числа из реального ответа. Блок ходьбы нёс 36 ккал, нераспознанный — 17; шаги и
метры лежали только в первом. **Взять один блок значит занизить день, а сложить
без разбивки — потерять различие между активными калориями и базовым обменом.**

**Шаги суммируются только по `walk`, `run` и `climb`.** Сон приезжает такими же
блоками, и слепая сумма приписывала бы к дневным шагам ночь.

**`totals.calories` — число самого устройства**, когда оно пришло, а не наша
сумма блоков: браслет считает по своей формуле, и два числа не совпадают.

`date` — всегда сегодняшний день по часам телефона: устройство отдаёт сводку
только за текущие сутки. **Бэкфилла по ней не будет никогда.**

### 5.5. Сон — сессиями

**Сон это массив сессий, а не плоский список отрезков.** Устройство размечает
сессии само служебными маркерами. Стадии имеют смысл внутри одного сна;
сложенные за неделю не значат ничего.

```json
{
  "from": "2026-09-08T00:58:00+03:00",
  "to": "2026-09-08T09:18:00+03:00",
  "inBed": 500,
  "asleep": 490,
  "efficiency": 98,
  "awakenings": 2,
  "cycles": 4,
  "longestBlock": 233,
  "totals": { "deep": 96, "light": 254, "rem": 78, "awake": 22, "nap": 0, "snore": 0 },
  "shares": { "deep": 24, "light": 46, "rem": 20, "awake": 2 },
  "segments": [{ "at": "2026-09-08T01:15:00+03:00", "minutes": 13, "stage": "deep" }]
}
```

| Поле           | Единица | Что это                                               |
| -------------- | ------- | ----------------------------------------------------- |
| `inBed`        | минуты  | от засыпания до подъёма, включая пробуждения          |
| `asleep`       | минуты  | сон без пробуждений                                   |
| `efficiency`   | %       | `asleep / inBed`                                      |
| `cycles`       | штуки   | по возвратам в быстрый сон — он завершает цикл        |
| `longestBlock` | минуты  | самый длинный сон без пробуждений                     |
| `segments`     | —       | отрезки; своего ключа не имеют, живут только в сессии |

**Служебные маркеры наружу не уходят:** «пять минут начала сессии» смысла не
имеют. **Дневной сон приходит такой же сессией** — устройство про «ночь» ничего
не знает.

Ключ сессии — `(deviceMac, from)`; при совпадении сессия заменяется целиком
вместе с отрезками: человек проснулся и снова уснул, устройство продлило её.

### 5.6. Стресс — блоками по суткам

Устройство хранит его сутками: время полуночи, шаг сетки и по байту на каждую
минуту. **Ноль означает «замера не было», а не «стресс равен нулю».**

```json
{
  "midnight": "2026-09-08T00:00:00+03:00",
  "stepMinutes": 1,
  "samples": [{ "at": "2026-09-08T00:39:00+03:00", "value": 43 }]
}
```

Клиент шлёт только измеренные минуты, но шаг сетки и границу суток сохраняет: без
них редкий замер неотличим от потери данных. `value` — 1–100, производная от
вариабельности пульса, а не отдельный датчик.

### 5.7. Разовый замер

Результат ручного запуска: оптический датчик включается примерно на минуту.

```json
{
  "id": "m3k7x1-4",
  "at": "2026-09-09T14:03:00+03:00",
  "heartRate": 82,
  "bloodOxygen": 97,
  "stress": 41,
  "hrv": 44,
  "systolic": 124,
  "diastolic": 78,
  "mood": 3
}
```

**Ключом по времени обойтись нельзя:** два запуска подряд попадают в одну минуту
законно. Идентификатор ставит клиент.

### 5.8. Ношение — окнами, а не событиями

Отчёты о ношении приходят **только пока приложение подключено к браслету**.
Браслет пролежал ночь в ящике без телефона — не придёт ничего, и «событий нет»
прочитается как «носил».

```json
{
  "observedFrom": "2026-09-09T14:02:00+03:00",
  "observedTo": "2026-09-09T14:32:00+03:00",
  "intervals": [{ "from": "…", "to": "…", "worn": true }]
}
```

Вне окна наблюдения состояние **неизвестно** — не «надет» и не «снят».

### 5.9. Тренировки

**Занятие начинает приложение, и его данные надо ловить на лету.** Проверено
живьём полным циклом: кнопки старта у ES100 нет, автораспознавания занятий тоже.
Как только занятие начато, браслет присылает данные **раз в секунду** — вдесятеро
чаще обычного отчёта.

**В историю тренировка не попадает.** После корректного финиша с ненулевыми
итогами список тренировок остаётся пустым, а сводка отдаёт нули для любого
номера. Проверено дважды — на минуте и на трёх минутах.

**Отсюда контракт:** во время занятия браслет работает датчиком, а не
регистратором. Накопить тренировку обязан клиент и отдать её целиком —
переспросить устройство потом будет нечего.

```json
{
  "sport": 1,
  "startedAt": "2026-09-09T16:39:47+03:00",
  "seconds": 182,
  "distance": 60,
  "calories": 16,
  "steps": 12,
  "averageHeartRate": 104,
  "peakHeartRate": 110,
  "heartRates": [87, 88, 90, "…посекундно"]
}
```

**`heartRates` — посекундный ряд, и он единственный меняется каждую секунду.**
Шаги, дистанция и калории приходят нарастающим итогом и подолгу стоят на месте: за
три минуты наблюдения шаги замерли на 12, дистанция на 60 метрах, а пульс всё это
время гулял. Поэтому по ним берётся последнее значение, а не разница соседних
тиков — иначе минуты без обновления превратятся в нули.

**Ключ — `(deviceMac, startedAt)`.** Своего идентификатора у тренировки нет:
устройство её не нумерует, потому что и не хранит.

**Незавершённое занятие клиент пишет на диск по ходу**, а не только на финише:
приложение могут закрыть или выгрузить из памяти посреди тренировки, и другой
копии нет. При следующем открытии раздела оно поднимается и продолжается.

Сводка тренировки с устройства (на ES100 всегда пустая) отдаётся как есть:

```json
{
  "id": 3610,
  "from": "2026-09-08T18:12:00+03:00",
  "to": "2026-09-08T18:47:00+03:00",
  "sport": 1,
  "sportName": "Running",
  "fields": [{ "tag": 5, "value": [0, 212] }]
}
```

`sportName` — из таблицы вендора на 115 видов. `fields` — номерами: структура
сводки известна полностью, смысл тегов — нет, а выдуманная подпись хуже честного
номера, потому что по ней принимают решения как по измеренному.

### 5.10. Распознанная активность

Заходы движения браслет размечает сам, и вот их каждый день много: за сутки на
живом устройстве было 28, длительностью от одной до восьми минут.

```json
{ "at": "2026-09-09T09:14:00+03:00", "minutes": 8, "type": 1, "stream": "state" }
```

**Тип во всех наблюдениях равен единице** — различать виды движения прошивка не
умеет или не сообщает, поэтому подписывать его словом нельзя. Потоков два, и чем
они отличаются, не установлено; признак сохраняется, чтобы это можно было
выяснить на данных.

Записи появляются с задержкой: заход дописывается, судя по всему, после
завершения, а не в момент начала.

### 5.11. Устройство

Паспорт:

```json
{
  "mac": "d8:0f:b5:11:2e:f7",
  "platform": "NAL-WB00",
  "firmware": "AT519V003396",
  "hardware": "010404",
  "protocol": "V1.0",
  "serial": "V1.0"
}
```

**Ключ устройства — `mac`, а не идентификатор из системы.** iOS не отдаёт
приложению адрес: он выдаёт собственный UUID, свой на каждом телефоне. Тот же
браслет на втором телефоне получит другой UUID, и привязка по нему развалит
историю на две. MAC браслет отдаёт сам — в рекламном пакете и в паспорте.

Состояние — временной ряд, а не свойство устройства:

```json
{
  "at": "2026-09-09T14:32:00+03:00",
  "battery": 94,
  "charging": false,
  "lowBatteryAlert": false,
  "clockSkewSeconds": -412,
  "storage": { "totalKb": 105519, "freeKb": 105298 }
}
```

`clockSkewSeconds` — на сколько часы браслета расходились с телефоном **в момент
подключения**, до синхронизации. Модуль читает их до того, как выставит свои,
именно ради этого числа: **это единственное объяснение сдвинутых дат в истории.**

Возможности — битовые маски, которые браслет отдаёт сам:

```json
{
  "readAt": "2026-09-09T14:02:00+03:00",
  "firmware": "AT519V003396",
  "maxPacket": 244,
  "lists": { "1": 0, "2": 5111809, "3": 8388608, "4": 5245312, "7": 32768, "8": 32 },
  "features": {
    "audioRecorder": true,
    "heartRateVariability": true,
    "bloodPressure": true,
    "mood": true,
    "noScreen": true,
    "temperature": false,
    "music": false,
    "gps": false,
    "speechToText": false,
    "chatGpt": false,
    "extendedHistory": true,
    "noBluetoothClassic": true,
    "noBluetoothCall": true,
    "twoWaySettings": true
  }
}
```

**Маска — и есть список возможностей.** Команды «перечисли, что умеешь» в
протоколе нет: SDK вендора вычисляет её локально из этих же битов.

**`lists` — объект, а не массив:** списки нумеруются с единицы, и массив с
нулевым элементом-заполнителем даёт ошибку на единицу у всякого, кто повторит
проверку битов. `lists` — сырьё от устройства, `features` — производная клиента.
Снимок привязан к `firmware` и `readAt`: маски меняются при обновлении прошивки.

**Зачем это вам.** Отсутствие данных перестаёт быть загадкой: если
`temperature: false`, температуры не будет никогда, и это не сбой синхронизации.

### 5.12. Настройки, профиль и будильники

```json
{
  "language": 1,
  "metricLength": true,
  "screenTimeout": 5,
  "heartRateInterval": 1,
  "oxygenInterval": 30,
  "continuousHeartRate": true,
  "continuousOxygen": false,
  "heartRateHighLimit": { "enabled": true, "bpm": 140 },
  "heartRateLowLimit": { "enabled": false, "bpm": 50 },
  "oxygenLowLimit": { "enabled": false, "percent": 92 },
  "autoStress": true,
  "autoMood": true,
  "autoBloodPressure": true,
  "stressInterval": 10,
  "moodInterval": 5,
  "bloodPressureInterval": 10,
  "doNotDisturb": {
    "allDay": false,
    "scheduled": true,
    "from": { "hour": 23, "minute": 0 },
    "to": { "hour": 7, "minute": 0 },
    "muteVibration": true,
    "muteMessages": true
  }
}
```

**Автозамеры включены с завода.** Стресс, настроение и давление браслет меряет
сам по расписанию — отсюда берётся часть показаний, которые иначе выглядят как
взявшиеся ниоткуда.

Экрана у ES100 нет, поэтому `screenTimeout` и `language` на нём ни на что не
влияют: прошивка общая на линейку.

**Профиль, дневная цель и зоны пульса пишутся на устройство.** Рост, вес,
возраст, пол, длина шага при ходьбе и беге, VO₂max и рука ношения задают, как
браслет считает дистанцию и калории. Без них он считает по заводским значениям, а
приложение читает результат как измеренный факт — систематическая ошибка уходит
во все производные числа. Отправлять при привязке.

```json
{
  "age": 34,
  "birth": { "year": 1992, "month": 4, "day": 17 },
  "gender": 1,
  "height": 182,
  "weight": 78,
  "walkStepLength": 74,
  "runStepLength": 96,
  "wearHand": 0
}
```

Будильники:

```json
{ "slot": 1, "enabled": true, "hour": 7, "minute": 30, "days": 62, "label": "Подъём" }
```

`days` — битовая маска: бит 0 воскресенье … бит 6 суббота; `62` = будни. `label`
— до 20 символов.

**Браслет принимает будильники только целиком.** Отсюда требование к хранению:
любая операция должна возвращать **весь список**, а не изменённый элемент.
Клиенту всё равно писать на устройство целиком, и собирать список из дельты он не
должен.

**`slot` — это позиция, а не личность.** После удаления и добавления слот 1 будет
уже другим будильником. Вешать на него историю нельзя.

**Реплик три:** сервер, телефон и сам браслет. У браслета версии нет и быть не
может. Нужен счётчик версии на стороне сервера, иначе два телефона будут по
очереди молча затирать будильники друг друга — а человек узнает об этом, когда не
проснётся. Часть изменений приезжает отчётом (устройство умеет сообщать о том,
что настройку поменяли на нём — 12 записей в списке двусторонних настроек),
остальные надо перечитывать.

**Уведомления на браслет:** `kind` — `call` · `message` · `application`,
заголовок до 32 символов, тело до 60, имя приложения до 32. Экрана нет, до
человека доходит вибрация и светодиод.

**Служебные операции:** отвязка от аккаунта, повторное сопряжение, пароль из
шести цифр, заводской сброс и стирание всех записей. Вам это нужно знать: после
сброса история на устройстве обнуляется, и дыра в данных — не сбой синхронизации.

---

## 6. Пороги вычислений

Производные показатели считаются по конкретным числам. **Это договорённость, а не
деталь реализации клиента:** если сервер посчитает по своим, приложение покажет
одну цифру, а сервер за тот же день — другую.

| Порог                           | Значение                 | Где применяется                      |
| ------------------------------- | ------------------------ | ------------------------------------ |
| Минута считается ходьбой от     | 20 шагов                 | активные минуты, темп, прогулки      |
| Длина шага вне диапазона — брак | 0,3–1,2 м                | расчёт длины шага                    |
| Разрыв, режущий сон на сессии   | 180 минут                | только когда маркеров устройства нет |
| Ориентир длительности сна       | 480 минут                | доля от нормы                        |
| Цикл сна                        | возврат в `rem`          | счётчик циклов                       |
| Прогулка рвётся                 | на любом пропуске минуты | список прогулок                      |
| Байт звука в секунде            | 2000                     | длительность записи                  |

Зоны пульса, уд/мин: `0–98` Rest · `99–118` Warm-up · `119–137` Fat burn ·
`138–157` Aerobic · `158–177` Anaerobic · `178+` Peak.

Зоны стресса: `1–29` Relaxed · `30–59` Normal · `60–79` Medium · `80–100` High.

Границы включительны с обеих сторон. Сессии сна и их статистику считает клиент и
отдаёт готовыми — там правило завязано на маркеры устройства; всё остальное
сервер может считать сам, но **по этим числам**.

---

## 7. Что нужно от бэкенда

Раздел написан до приёмника и оставлен как требования, по которым он
проверялся. Приёмник `es100` (сентябрь 2026) закрывает их; как клиент им
пользуется — в разделе 3.14.

Формы адресов и способ хранения — ваши. Ниже свойства, без которых клиент не
сможет работать.

### 7.1. По записям

**Хранение файла.** Записи должны жить на сервере, а не на телефоне. Телефон —
транзитный буфер: приложение переустановят, память кончится, человек сменит
устройство. Сейчас файлы лежат в файловой системе телефона и больше нигде.

**Адрес для загрузки, а не multipart через основной API.** Час звука — 7 МБ, а
память браслета держит пятнадцать часов. Выгрузка идёт с телефона в фоне, ей
нужен докачиваемый адрес и своя таймаутная политика. Через JSON-клиент файл
отправить нельзя вовсе: там только тела `application/json`. Если presigned-адресов
у вас нет — скажите, клиент будет слать multipart на отдельный хост.

**Распознавание на вашей стороне.** У ES100 признаки `speechToText` и `chatGpt` в
масках возможностей **выключены** — устройство ничего не расшифровывает. Всё, что
можно, — снять звук и отдать.

**Транскрипт с таймингами**, а не сплошной текст:

```json
{
  "status": "transcribed",
  "language": "ru",
  "text": "…",
  "segments": [{ "from": 0.0, "to": 2.4, "text": "…" }]
}
```

Без таймингов метки бесполезны: человек отметил сорок вторую секунду, а показать
ему нечего.

**Статус, по которому клиент понимает, что происходит:** `awaiting_upload` ·
`uploaded` · `transcribing` · `transcribed` · `failed`. У `failed` нужна причина
отдельным полем — иначе нечего показать и не по чему решать, повторять ли.

**Список записей с курсором** и фильтром по статусу: архив на сервере растёт без
предела, а после переустановки на телефоне не остаётся ничего.

**Отдавать текст без сегментов по умолчанию.** У часовой записи их тысячи; одним
ответом это не грузится.

### 7.2. По данным

**Приём пачками.** История за период приезжает кадрами; по строке на запрос — это
сотни вызовов на сутки. У клиента жёсткий потолок 15 секунд на запрос, сутки — до
1440 строк. Если это много, назовите лимит, клиент нарежет.

**Ключи строк.** При совпадении почти везде перезапись; у поминутного слота —
**слияние полей**.

| Сущность          | Ключ                        |
| ----------------- | --------------------------- |
| поминутный слот   | `(deviceMac, at)`           |
| сводка дня        | `(deviceMac, date)`         |
| сессия сна        | `(deviceMac, from)`         |
| сутки стресса     | `(deviceMac, date)`         |
| разовый замер     | `(deviceMac, id)`           |
| окно ношения      | `(deviceMac, observedFrom)` |
| заход движения    | `(deviceMac, at, stream)`   |
| тренировка        | `(deviceMac, startedAt)`    |
| запись            | `(deviceMac, session)`      |
| событие диктофона | `(deviceMac, id)`           |
| состояние         | `(deviceMac, at)`           |
| возможности       | `(deviceMac, firmware)`     |

**Идемпотентность по ключу.** Повторная заявка той же записи — не ошибка, а
нормальный случай после обрыва: верните ту же строку с её текущим статусом.
**Дедупликация повтора запроса — отдельно от дедупликации строки.** Первое спасает
от обрыва сети, второе — от пересечения окон синхронизации: клиент может прислать
те же сутки двумя разными запросами.

**Окно покрытия у каждой пачки.** Клиент сообщает период, который считает
прочитанным. Без этого «за 5 сентября данных не было» неотличимо от «5 сентября не
синхронизировали» — а разница существенная, потому что заводской сброс обнуляет
историю устройства, и глубже четырёх суток она не хранится вовсе.

**Частичный приём вместо отказа целиком.** Клиент читает устройство окнами и не
может выбросить сутки из-за одной минуты с битой отметкой. Нужен список
отклонённых строк с причиной: принятое клиент пометит отправленным, отклонённое
не станет повторять.

**Тело в ответе на запись.** Клиентский транспорт на пустой ответ возвращает
`null`, и ручка без тела роняет экран на первом обращении к полю.

**Время со смещением, а не UTC.** Браслет живёт по времени, которое ему выставил
телефон, и часового пояса не хранит. Отметки приходят как локальное время; клиент
отдаёт их со смещением и отдельно сообщает зону строкой — по `+03:00` нельзя
вычислить сутки при переводе часов.

**Машинный код ошибки в поле `error`.** Текст сервера в интерфейс не идёт: экран
выбирает формулировку по коду. Если в ошибке есть подробность — лимит,
некорректное поле, причина отказа — назовите поле явно, клиент читает только
`error` и заранее знать имя не может.

---

## 8. Что нужно от платформы

| Требование              | iOS                                             | Android                                                                        |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| Разрешение на Bluetooth | строка `bluetoothAlwaysPermission` в `app.json` | `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` (до Android 12 — `ACCESS_FINE_LOCATION`) |
| Фоновый режим           | `isBackgroundEnabled`, режим `central`          | —                                                                              |
| Фоновая выгрузка        | `expo-background-task`, окна выдаёт система     | то же                                                                          |

Без разрешений сканирование на Android **молча возвращает пустой список**, а не
ошибку: человек видит вечное «ищем» и ни одного устройства.

Сразу после запуска приложения состояние радио — `Unknown`: система ещё не
ответила. Принять это за отказ значит показать «нет доступа» ровно в тот момент,
когда доступ только что дали.

Фоновая выгрузка регистрируется **из корня приложения**, а не из экрана браслета:
система будит приложение ради задачи, и бандл при этом поднимается без экрана.

---

## 9. Чего мы не знаем

Честный список того, что проверить не удалось.

1. **Поведение при полной памяти диктофона** — перезапись по кругу или отказ
   записи.
2. **Раскладка полей сводки тренировки**: структура снята целиком (49 полей), но
   сопоставить тег с величиной можно только на записанной тренировке, а ES100 их
   не хранит.
3. **Раскладка списка меток, сохранённого на устройстве** — по той же причине
   метки старых записей теряются при переустановке приложения.
4. **Шкала `mood`** — 1–5, но что означает каждое значение, неизвестно.
5. **`restingHeartRate`**: в протоколе на него отображаются три разных бита. Одно
   ли это и то же в разных прошивках, на одном устройстве не проверить.
6. **Чем различаются два потока распознанной активности.**
7. **Глубина истории измерена — около четырёх суток.** Окно бэкфилла не больше.

---

## 10. Открытые вопросы к вам

1. ~~**Модель владения устройством.**~~ Решено приёмником: привязка на сервере —
   аккаунт, адрес устройства и установка приложения. На телефоне привязка
   по-прежнему локальная, а очередь на отправку ключуется аккаунтом.
2. **Распознавание речи:** чьё, с какой задержкой, нужен ли клиенту прогресс.
3. **Хранить ли настройки и будильники в аккаунте**, чтобы они переезжали на
   второй телефон.
4. **Нужно ли чтение истории с сервера** — сейчас данные живут на телефоне, и
   второй телефон их не увидит.
5. ~~**Лимит пачки**~~ выдаётся при регистрации (500 записей, 512 КиБ); **окно
   допустимых отметок времени** не названо — клиент шлёт как есть с признаком
   качества времени.
6. **Предел числа будильников** на вашей стороне, если он есть.
7. ~~**Нужны ли состояние устройства и маски возможностей вообще.**~~ Приёмник
   хранит их как есть отдельными потоками — отправляем.
