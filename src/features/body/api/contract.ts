import type { MetricValue } from '@/shared/domain';

/**
 * Ответы `/api/v2/body` — как в контракте, без домысла. Подсистема отдаёт
 * кольцо, набор показателей тем же конвертом, что и везде, и группы, по
 * которым их раскладывают.
 */
export type Subsystem = 'heart' | 'breathing' | 'recovery' | 'composition' | 'reproductive';

/**
 * Основание доли кольца. Сервер называет его сам — клиент своей нормы не знает.
 * Из выданных примеров известен один вид: шкала самого измерения.
 */
export type PercentBasis = { kind: string; minimum: number | null; maximum: number | null };

export type SubsystemRing = {
  metric: string;
  value: number | null;
  unit: string;
  status: string;
  percent: number | null;
  percentBasis: PercentBasis | null;
  provenance: unknown;
  freshness: { stale: boolean | null; observedAt: string | null; latestDate: string | null };
  /** Можно ли сменить показатель кольца и на какой. */
  configurable: boolean;
  options: readonly string[];
};

export type SubsystemData = {
  subsystem: Subsystem;
  name: string;
  date: string;
  timezone: string;
  status: string;
  preferences: RingPreferences;
  ring: SubsystemRing;
  metrics: readonly MetricValue[];
  groups: readonly { key: string; name: string; metrics: readonly string[] }[];
  sleep: unknown;
  insights: readonly unknown[];
  /** Биохимия живёт отдельным процессом — подсистема только показывает, где. */
  medicalData: {
    separateWorkflow: boolean;
    catalogUrl: string;
    suggestedKeys: readonly string[];
    importIncluded: boolean;
  };
  errors: readonly unknown[];
};

/**
 * Настройка кольца версионируется: сервер принимает запись только против той
 * ревизии, которую видел клиент. Разошлись — значит настройку уже меняли.
 */
export type RingPreferences = {
  subsystem: Subsystem;
  schemaVersion: number;
  revision: number;
  ringMetric: string;
  isDefault: boolean;
  updatedAt: string | null;
};

export type MetricCatalog = {
  metrics: readonly MetricValue[];
  subsystems: readonly { key: Subsystem; name: string }[];
  medicalData: { separateWorkflow: boolean; catalogUrl: string };
};
