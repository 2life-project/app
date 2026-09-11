import type { Tone } from '@/shared/theme';

/**
 * Медкарта. Формы сняты с живых ответов — в спеке большинство этих объектов
 * выведено из кода и приходит пустым.
 *
 * Правило то же, что у показателей тела: статус, доля шкалы и свежесть — от
 * сервера. Клиент не решает, высокое значение или нормальное: у одного и того
 * же числа разная норма по полу, возрасту и лаборатории.
 */

/** Словарь сервера. Незнакомое слово — нейтральное, а не «наверное, плохо». */
export type MarkerStatus = 'ok' | 'warn' | 'hi' | 'lo' | 'unknown' | (string & {});
export type Freshness = 'fresh' | 'aging' | 'stale' | (string & {});
export type Direction = 'up' | 'down' | 'flat' | 'unknown' | (string & {});

export const STATUS_TONE: Record<string, Tone> = {
  ok: 'success',
  warn: 'warning',
  hi: 'danger',
  lo: 'danger',
};

/** Что сервер говорит про значение: норма, доля шкалы, слова для подписи. */
export type Marker = {
  markerKey: string;
  displayName: string;
  displayNameRu: string | null;
  displayNameEn: string | null;
  latestValue: number | null;
  latestRaw: string | null;
  latestUnit: string | null;
  normalizedUnit: string | null;
  refLow: number | null;
  refHigh: number | null;
  refText: string | null;
  status: MarkerStatus;
  /** Положение значения на шкале нормы, 0–100. Считает сервер. */
  fillPercent: number | null;
  historyCount: number;
  latestDate: string | null;
  category: string;
  previousValue: number | null;
  delta: {
    absolute: number | null;
    percent: number | null;
    direction: Direction;
    changed: boolean;
  };
  freshness: { state: Freshness; ageDays: number | null; needsUpdate: boolean };
  important: boolean;
  needsReviewCount: number;
  latestDocument: { id: string; filename: string; uploadedAt: string } | null;
};

export type BiochemistryDocument = {
  id: string;
  filename: string;
  uploadedAt: string;
  parseStatus: string;
  markerCount: number;
};

export type Biochemistry = {
  schemaVersion: number;
  /** Ключ показателя → показатель. Списки ниже — это выборки из этой карты. */
  markersByKey: Record<string, Marker>;
  importantKeys: readonly string[];
  changedKeys: readonly string[];
  staleKeys: readonly string[];
  documents: readonly BiochemistryDocument[];
  thresholds: { changedPercent: number; staleDays: number };
};

/**
 * Одно измерение показателя. `chartEligibility` — решение сервера, можно ли
 * ставить точку на график: дубли и несравнимые единицы он отсеивает сам, и
 * рисовать отсеянное значит показывать динамику, которой нет.
 */
export type Observation = {
  id: string;
  value: number | null;
  rawValueText: string | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  refText: string | null;
  date: string | null;
  documentId: string;
  documentFilename: string;
  sourceFileAvailable: boolean;
  biomaterial: string | null;
  reviewStatus: string | null;
  chartEligibility: { eligible: boolean; reasons: readonly string[]; severity: string };
  chartValue: number | null;
  chartUnit: string | null;
};

export type MarkerOverview = {
  markerKey: string;
  displayName: string;
  displayNameRu: string | null;
  latest: Observation | null;
  previous: Observation | null;
  delta: {
    absolute: number | null;
    percent: number | null;
    direction: Direction;
    changed: boolean;
  };
  /** Клиническая оценка словами сервера: код и готовая подпись. */
  clinicalStatus: { code: MarkerStatus; label: string | null; reason: string | null };
  freshness: {
    state: Freshness;
    ageDays: number | null;
    needsUpdate: boolean;
    reason: string | null;
  };
  knowledge: unknown;
};

export type MarkerTrend = {
  markerKey: string;
  period: string;
  points: readonly Observation[];
  /** Норм бывает несколько: лабораторная, стандартная, оптимальная, личная. */
  refSources: {
    labVariants: readonly {
      refLow: number | null;
      refHigh: number | null;
      unit: string | null;
      label: string;
    }[];
    standard: { refLow: number | null; refHigh: number | null } | null;
    optimal: { refLow: number | null; refHigh: number | null } | null;
    bio: { refLow: number | null; refHigh: number | null } | null;
    refUnit: string | null;
  };
};

export type MarkerHistory = { markerKey: string; observations: readonly Observation[] };

export type DocumentRow = {
  id: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  uploadedAt: number;
  parseStatus: string;
  parseNotes: string | null;
};

export type Examinations = {
  summary: {
    documents: number;
    activeConditions: number;
    keyInsights: number;
    verifiedRecommendations: number;
  };
  documents: readonly (DocumentRow & {
    examType: string | null;
    examDate: number | null;
    severity: string | null;
    findingCount: number;
    keyInsightCount: number;
  })[];
  conditions: readonly Condition[];
};

export type Condition = {
  id: string;
  title: string;
  bodySystem: string | null;
  status: string;
  severity: string | null;
  notes: string | null;
  relatedMarkerKeys: readonly string[];
  aiGenerated: boolean;
  userConfirmed: boolean;
};

/**
 * Генетика. Загрузок может быть несколько — отчёт читается по конкретной;
 * без `uploadId` сервер отвечает ошибкой проверки, а не пустым разделом.
 */
export type GeneticUpload = {
  id: string;
  originalFilename: string;
  sourceFormat: string;
  sourceName: string | null;
  totalVariants: number | null;
  variantsWithRsid: number | null;
  parseStatus: string;
  parseError: string | null;
  uploadedAt: number;
  parsedAt: number | null;
};

export type GeneticsSummary = { uploads: readonly GeneticUpload[] };

/** Разбор по темам: оценки и выводы считает сервер, клиент их показывает. */
export type GeneticsPanel = {
  id: string;
  subtitle?: string;
  intro: string;
  recommendation?: string;
  compositeScore: number;
  compositeLevel: string;
  totalFound: number;
};

export type GeneticsSection = {
  id: string;
  icon: string;
  panels: readonly GeneticsPanel[];
  sectionScore: number;
  sectionLevel: string;
  insight: {
    headline: string;
    body: string;
    actionItems: readonly string[];
    severity: 'good' | 'mixed' | 'concern' | (string & {});
  } | null;
};

export type GeneticsReport = {
  sections: readonly GeneticsSection[];
  totalSnps: number;
  foundSnps: number;
  overallScore: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
};
