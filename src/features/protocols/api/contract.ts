/**
 * Протоколы, их правила, цели и рекомендации — формы из контракта. Статусы
 * даны словарём сервера; незнакомое слово читается нейтрально.
 */
export type ProtocolStatus =
  'draft' | 'active' | 'paused' | 'completed' | 'archived' | (string & {});

export type Protocol = {
  id: string;
  goal: string;
  startDate: string;
  endDate: string | null;
  status: ProtocolStatus;
  sourceMode: 'text' | 'manual' | 'hybrid' | (string & {});
  aiSummary: string | null;
  createdAt: number;
  updatedAt: number;
};

export type Domain =
  | 'nutrition'
  | 'water'
  | 'supplements'
  | 'loads'
  | 'recovery'
  | 'heart'
  | 'breathing'
  | 'body'
  | 'reproductive'
  | 'wellbeing'
  | (string & {});

/** Что делать по расписанию: когда, сколько и как проверяется. */
export type Rule = {
  id: string;
  protocolId: string;
  domain: Domain;
  type:
    | 'sleep_before'
    | 'avoid_food'
    | 'daily_training'
    | 'supplement_plan'
    | 'custom_check'
    | (string & {});
  schedule: {
    kind: string;
    time?: string;
    days?: readonly number[];
    date?: string;
    durationMinutes?: number;
  };
  criteria: Record<string, unknown>;
  verificationMode: 'manual' | 'auto' | 'auto_with_manual' | (string & {});
  hint: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

/** Куда двигаем показатель: вверх или вниз. */
export type TargetDirection = 'up' | 'down' | (string & {});

export type Target = {
  id: string;
  protocolId: string;
  domain: Domain;
  metricKey: string;
  metricParams: Record<string, unknown>;
  unit: string | null;
  direction: TargetDirection;
  targetValue: number;
  targetDate: string | null;
  /** От чего считаем прогресс — значение на старте и когда оно снято. */
  baselineValue: number | null;
  baselineDate: string | null;
  baselineSource: 'auto' | 'manual' | 'imported' | null | (string & {});
  status: 'active' | 'reached' | 'archived' | (string & {});
  createdAt: number;
  updatedAt: number;
};

export type Recommendation = {
  id: string;
  protocolId: string;
  domain: Domain;
  rationale: string | null;
  actionJson: Record<string, unknown>;
  status: 'draft' | 'accepted' | 'dismissed' | (string & {});
  createdAt: number;
  updatedAt: number;
};

export type ProtocolBundle = {
  protocol: Protocol;
  rules: readonly Rule[];
  targets: readonly Target[];
  recommendations: readonly Recommendation[];
};

export type Targets = { targets: readonly Target[] };

/**
 * Прогресс по цели считает сервер: текущее значение, долю пути и что делать
 * дальше. Клиент не сравнивает числа сам — иначе он сравнил бы значения за
 * разные дни.
 */
export type TargetProgress = {
  target: Target;
  baselineValue: number | null;
  baselineDate: string | null;
  baselineSource: string | null;
  currentValue: number | null;
  currentDate: string | null;
  currentSource: string | null;
  status: 'active' | 'reached' | 'needs_baseline' | 'no_current' | 'invalid_target' | (string & {});
  /** Доля пути 0…100. */
  percent: number;
  remaining: number | null;
  href: string;
  nextAction: string;
  history: readonly { date: string; value: number }[];
  validationMessage: string | null;
};

export type ProtocolProgress = { protocol: Protocol; targets: readonly TargetProgress[] };
