import {
  acceptsManualEntry,
  availability,
  coverageRatio,
  isThin,
  metricFill,
  percentFill,
  type MetricValue,
} from './metric';
import {
  baselineText,
  deltaText,
  formatMetric,
  formatNumber,
  metricBasis,
  metricValueText,
  NO_VALUE,
} from './metric-format';

/** Конверт из контракта целиком: тест проверяет разбор ответа, а не выдумки. */
const weight: MetricValue = {
  key: 'weight',
  name: 'Weight',
  unit: 'kg',
  aggregation: 'latest',
  value: 80,
  status: 'available',
  period: { startDate: '2026-09-05', endDate: '2026-09-05', days: 1 },
  coverage: { daysWithData: 1, expectedDays: 1 },
  latestDate: '2026-09-05',
  observedAt: '2026-09-04T21:30:00.000Z',
  stale: false,
  target: null,
  points: [{ date: '2026-09-05', value: 80, observedAt: '2026-09-04T21:30:00.000Z', samples: 1 }],
  provenance: { source: 'body_manual_measurements', origin: 'manual', method: 'weight' },
  selection: 'most_recent_then_canonical_then_coverage_single_series',
  alternatives: [],
  warnings: [],
  unavailableReason: null,
  manual: {
    allowed: true,
    endpoint: '/api/v2/measurements',
    unit: 'kg',
    minimum: 0,
    maximum: null,
    minimumExclusive: true,
  },
  baseline: {
    value: null,
    kind: 'personal_observed_mean',
    startDate: '2026-08-08',
    endDate: '2026-09-04',
    samples: 0,
    minimumSamples: 3,
    clinicalReference: false,
  },
  referenceRanges: [],
  previous: null,
  delta: null,
  freshness: {
    stale: false,
    observedAt: '2026-09-04T21:30:00.000Z',
    latestDate: '2026-09-05',
    policy: 'older_than_selected_date_not_a_clinical_expiry',
  },
};

const empty: MetricValue = {
  ...weight,
  key: 'libido',
  name: 'Libido',
  unit: 'score',
  value: null,
  status: 'missing',
  period: { startDate: '2026-06-08', endDate: '2026-09-05', days: 90 },
  coverage: { daysWithData: 0, expectedDays: 90 },
  latestDate: null,
  observedAt: null,
  stale: null,
  points: [],
  provenance: null,
  manual: { ...weight.manual!, allowed: false, endpoint: '/api/v2/wellbeing/checkin' },
};

describe('состояние метрики', () => {
  it('число есть только при available и непустом значении', () => {
    expect(availability(weight)).toBe('value');
    expect(availability(empty)).toBe('missing');
  });

  // «Не вносили» зовёт заполнить, «нельзя прочитать» — починить связь. Слить их
  // в одно значит показать кнопку ввода там, где вводить нечего.
  it('недоступность источника отделена от отсутствия данных', () => {
    expect(availability({ ...empty, unavailableReason: 'v2_read_disabled' })).toBe('unavailable');
    expect(
      availability({ ...weight, status: 'available', unavailableReason: 'v2_read_disabled' }),
    ).toBe('unavailable');
  });

  it('ввод руками предлагают только там, где сервер его принимает', () => {
    expect(acceptsManualEntry(weight)).toBe(true);
    expect(acceptsManualEntry(empty)).toBe(false);
  });
});

describe('доверие к числу', () => {
  it('покрытие считается от ожидаемых дней', () => {
    expect(coverageRatio(weight)).toBe(1);
    expect(coverageRatio(empty)).toBe(0);
  });

  // Последнее значение — это один замер, у него нет «редкости».
  it('последнее значение не считается разреженным', () => {
    expect(isThin({ ...weight, coverage: { daysWithData: 1, expectedDays: 28 } })).toBe(false);
  });

  it('среднее по горстке дней помечается разреженным', () => {
    const thin = { ...weight, aggregation: 'avg' as const };
    expect(isThin({ ...thin, coverage: { daysWithData: 3, expectedDays: 28 } })).toBe(true);
    expect(isThin({ ...thin, coverage: { daysWithData: 20, expectedDays: 28 } })).toBe(false);
  });
});

describe('дуга кольца', () => {
  // Без цели у клиента нет основания рисовать долю: своей нормы он не знает.
  it('без цели и без процента дуги нет', () => {
    expect(metricFill(weight)).toBeNull();
    expect(metricFill({ ...weight, unit: 'bpm', value: 54 })).toBeNull();
  });

  // У процента шкала задана единицей, а не чьим-то мнением о норме.
  it('процент считается от ста без всякой цели', () => {
    expect(metricFill({ ...weight, unit: '%', value: 68 })).toBe(0.68);
  });

  it('с целью считается доля и обрезается единицей', () => {
    expect(metricFill({ ...weight, target: 100 })).toBe(0.8);
    expect(metricFill({ ...weight, target: 40 })).toBe(1);
  });

  it('процент, посчитанный сервером, переводится в долю', () => {
    expect(percentFill(68)).toBe(0.68);
    expect(percentFill(null)).toBeNull();
  });
});

describe('вид числа', () => {
  it('единицу подписывают, кроме счёта и баллов', () => {
    expect(formatMetric(weight)).toBe('80\u202fkg');
    expect(formatMetric({ ...weight, unit: 'count', value: 8420 })).toBe('8,420');
    expect(formatMetric({ ...weight, unit: 'score', value: 7.5 })).toBe('7.5');
  });

  it('часы показываются временем, а не дробью', () => {
    expect(formatNumber(7.7, 'h')).toBe('7:42');
    expect(formatNumber(8, 'h')).toBe('8:00');
  });

  it('пустое значение — прочерк, а не пустая строка', () => {
    expect(metricValueText(empty)).toBe(NO_VALUE);
  });
});

describe('подпись под числом', () => {
  it('свежее последнее значение подписано днём замера', () => {
    expect(metricBasis(weight)).toBe('Sep 5');
  });

  it('устаревшее значение подписано как «на дату», а не спрятано', () => {
    expect(metricBasis({ ...weight, freshness: { ...weight.freshness!, stale: true } })).toBe(
      'as of Sep 5',
    );
  });

  it('агрегат называет период', () => {
    expect(
      metricBasis({ ...weight, aggregation: 'avg', period: { ...weight.period, days: 28 } }),
    ).toBe('average of 28 days');
  });

  it('разреженный агрегат называет, на скольких днях он стоит', () => {
    const thin = {
      ...weight,
      aggregation: 'avg' as const,
      period: { ...weight.period, days: 28 },
      coverage: { daysWithData: 3, expectedDays: 28 },
    };
    expect(metricBasis(thin)).toBe('average of 28 days · 3 of 28 days logged');
  });

  it('недоступный источник не выдаёт себя за отсутствие данных', () => {
    expect(metricBasis({ ...empty, unavailableReason: 'v2_read_disabled' })).toBe(
      'no access to the source',
    );
  });
});

describe('личное среднее', () => {
  // Сервер отдаёт baseline с нулём замеров и порогом в три: показать такое
  // среднее значит выдать шум за привычку.
  it('среднее без набранных замеров не показывается', () => {
    expect(baselineText(weight)).toBeNull();
  });

  it('набранное среднее подписано как личное, а не как норма', () => {
    const withBase = {
      ...weight,
      baseline: { ...weight.baseline!, value: 81.4, samples: 12 },
    };
    expect(baselineText(withBase)).toBe('base 81.4');
  });

  it('разница показывается со знаком', () => {
    expect(deltaText({ ...weight, delta: -0.4 })).toBe('−0.4');
    expect(deltaText({ ...weight, delta: 0 })).toBeNull();
    expect(deltaText(weight)).toBeNull();
  });
});
