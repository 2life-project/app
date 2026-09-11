import type { MetricAggregation, MetricValue } from '@/shared/domain';

/**
 * Формы ответов `/api/v2` для Главной — ровно как в контракте, без домысла.
 *
 * Массивы, которые контракт не описывает (`goals.data`, `streams`, `signals`,
 * `meals`, `symptoms`, `notes`), оставлены `unknown[]`. Придумать им поля
 * значит договориться с собой вместо сервера: такой «контракт» разойдётся
 * молча и разберётся уже на устройстве.
 */

export type Surface = 'web' | 'mobile';

/** Типы виджетов из каталога: раскладка называет один из них для каждой ячейки. */
export type WidgetType =
  | 'decisions'
  | 'now'
  | 'vitals'
  | 'recover'
  | 'fuel'
  | 'move'
  | 'meds'
  | 'rails'
  | 'goals'
  | 'streams'
  | 'create'
  | 'empty'
  | 'custom';

export type WidgetRecipe = {
  /** Названия у рецепта в контракте нет: сборщик отдаёт только вид и показатели. */
  title?: string;
  kind: 'metric' | 'line' | 'bar' | 'list';
  metrics: readonly {
    key: string;
    aggregation: MetricAggregation;
    days: number;
    target?: number;
  }[];
};

export type LayoutCell = {
  id: string;
  widget: WidgetType;
  size: number;
  spec?: WidgetRecipe;
};

export type LayoutColumn = { id: string; size: number; cells: readonly LayoutCell[] };

export type HomeLayout = {
  surface: Surface;
  schemaVersion: number;
  revision: number;
  layout: { dockWidth: number; columns: readonly LayoutColumn[] };
  updatedAt: string | null;
  isDefault: boolean;
};

/**
 * Секция отвечает за себя: одна упавшая не роняет весь ответ, поэтому у каждой
 * свой статус. Экран обязан это уважать — иначе одна недоступная подсистема
 * превращает всю Главную в экран ошибки.
 */
export type Section<T> = { status: string; data: T | null; error: unknown };

/**
 * Дуга кольца. Долю считает сервер и сам называет её основание — шкалу
 * оценки. Максимум шкалы не равен дневной цели: это доля от шкалы, и
 * придумывать ей цель нельзя.
 */
export type Ring = {
  metric: 'wellbeing' | 'movement';
  value: number | null;
  unit: string;
  status: string;
  /** Доля 0…1 или `null`, когда оценки нет. Отсутствие — не ноль. */
  percent: number | null;
  percentBasis: { kind: string; minimum: number; maximum: number } | null;
};

export type HomeHeader = {
  date: string;
  checkinStreak: { days: number; atLeast: boolean; definition: string };
};

export type MovementData = {
  date: string;
  available: boolean;
  unavailableReason: string | null;
  score: number | null;
  band: string | null;
  algorithmKey: string;
  algorithmVersion: string;
  /** Доля дня, закрытая данными, и уверенность алгоритма — обе 0…1. */
  coverage: number;
  confidence: number;
  metrics: {
    steps: number | null;
    distanceMeters: number | null;
    activeDurationMinutes: number | null;
    exerciseDurationMinutes: number | null;
    moderateDurationMinutes: number | null;
    intenseDurationMinutes: number | null;
    activeEnergyKcal: number | null;
    standHours: number | null;
  };
  components: {
    steps: number;
    activeDuration: number;
    exerciseIntensity: number;
    activeEnergy: number;
    stand: number;
  };
  weightedExerciseMinutes: number | null;
  sources: readonly unknown[];
  ring: Ring;
};

export type NutritionAmounts = {
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
};

export type NutritionData = {
  date: string;
  timeZone: string;
  totals: NutritionAmounts;
  /** Цель может быть не задана — тогда сравнивать не с чем, и доли не будет. */
  goals: NutritionAmounts & { provenance: Record<string, string> };
  remainingCalories: number | null;
  completeness: number;
  /** Подсказки может не быть: без записанной еды серверу не о чем говорить. */
  insight: {
    macroBalance: { protein: number; fat: number; carbs: number };
    text: string;
    tone: string;
  } | null;
  meals: readonly unknown[];
  provenance: { source: string; observedAt: string | null };
};

export type WellbeingData = {
  day: {
    date: string;
    daily: unknown;
    symptoms: readonly unknown[];
    notes: readonly unknown[];
  };
  score: number | null;
  status: string;
  /** Рекомендации может не быть: без чек-ина серверу не на чем её строить. */
  recommendation: {
    tone: string;
    text: string;
    focus: string;
    rationale: string;
    actions: readonly string[];
  } | null;
  factorBreakdown: readonly { key: string; label: string; value: number; tone: string }[];
  sevenDayProfile: readonly {
    date: string;
    score: number | null;
    hasEntry: boolean;
    hasSymptoms: boolean;
    symptomCount: number;
  }[];
  ring: Ring;
};

/**
 * Пункт объединённого плана дня. Три вида различаются не полем `kind` — его
 * словарь контракт не закрывает, — а тем, на что пункт ссылается: задача
 * календаря, правило протокола или приём добавки. У приёма есть готовое
 * действие для отметки; остальные отмечаются в своих разделах.
 */
export type PlanItem = {
  id: string;
  kind: string;
  status: string;
  /** Словами сервера: «Magnesium glycinate 300 mg before bed». В спеке поля нет, в ответе есть. */
  title?: string | null;
  /** Миллисекунды; у приёма без точного времени — `null` и подпись словами. */
  startAt: number | null;
  expectedTime?: string | null;
  domain: string;
  source: string;
  href: string;
  reference:
    | { taskId: string }
    | { protocolId: string; ruleId: string; date: string }
    | { entryId: string; projected: boolean };
  action?: {
    method: string;
    url: string;
    body: { status: string; date: string };
  };
};

export type HomeData = {
  schemaVersion: number;
  surface: Surface;
  layoutRevision: number;
  date: string;
  timeZone: string;
  generatedAt: string;
  status: string;
  errors: readonly unknown[];
  header: HomeHeader;
  rings: {
    /** Восстановление приходит обычным конвертом метрики, остальные — своими. */
    recovery: MetricValue;
    movement: Section<MovementData>;
    nutrition: Section<NutritionData>;
    wellbeing: Section<WellbeingData>;
  };
  plan: { items: readonly PlanItem[]; done: number; total: number; errors: readonly unknown[] };
  goals: Section<readonly unknown[]>;
  streams: readonly unknown[];
  signals: readonly unknown[];
  widgets: readonly {
    id: string;
    type: WidgetType;
    /**
     * У каждого типа виджета своя форма, и спека её не описывает вовсе
     * (`x-untyped`). На живых ответах видно: `vitals` присылает четыре кольца,
     * `rails` — план дня, `fuel` и `goals` — конверт секции, а `create` и
     * `empty` — просто `null`. Поэтому здесь `unknown`: разбирает тот, кто
     * знает свой тип, — иначе один незнакомый виджет роняет всю Главную.
     */
    data: unknown;
  }[];
};

export type Decision = {
  id: string;
  revision: number;
  sourceRevision: string;
  title: string;
  reason: string;
  domain: string;
  status: 'pending' | 'snoozed' | 'resolved' | string;
  resolution: string | null;
  snoozedUntil: string | null;
  source: { kind: string; id: string; protocolId?: string; title: string };
  evidence: string;
  safety: string;
  items: readonly { id: string; title: string; action: string; executable: boolean }[];
  /** Что сервер разрешает сделать сейчас. Кнопки берутся отсюда, а не из типа. */
  actions: readonly string[];
  href: string | null;
  limitation: string | null;
  updatedAt: string;
};

export type WidgetCatalog = {
  schemaVersion: number;
  limits: Record<string, number>;
  widgets: readonly { type: WidgetType; surfaces: readonly Surface[] }[];
  metrics: readonly {
    key: string;
    name: string;
    unit: string;
    aggregations: readonly MetricAggregation[];
  }[];
};
