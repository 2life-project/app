/**
 * Протоколы и цели.
 *
 * Сам протокол приходит вложенным объектом, форму которого сервер не
 * описывает — в спеке он выведен из кода и пуст. Поэтому он оставлен
 * нетипизированным: придумать ему поля значит договориться с собой.
 * Цели описаны полностью и читаются как есть.
 */
export type ProtocolBundle = {
  protocol: unknown;
  rules: readonly unknown[];
  targets: readonly unknown[];
  recommendations: readonly unknown[];
};

/** Куда двигаем показатель: вверх, вниз или удержать в коридоре. */
export type TargetDirection = 'increase' | 'decrease' | 'maintain' | (string & {});

export type Target = {
  id: string;
  protocolId: string;
  domain: string;
  metricKey: string;
  unit: string | null;
  direction: TargetDirection;
  targetValue: number;
  targetDate: string | null;
  /** От чего считаем прогресс — значение на старте и когда оно снято. */
  baselineValue: number | null;
  baselineDate: string | null;
  baselineSource: string | null;
  status: string;
  createdAt: number;
  updatedAt: number;
};

export type Targets = { targets: readonly Target[] };
