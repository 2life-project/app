import { setBandReadings, type BandReadings } from '@/shared/domain';

import type { BandState } from './band-state';
import { seriesOf, startOfToday, stressPoints, summaryOf } from './day-metrics';
import { dayKey } from './history-store';
import { walkOf } from './walk-metrics';

/**
 * Показания браслета для остального приложения.
 *
 * Раздел устройства показывает всё подряд — ряды, зоны, гипнограмму. Главной и
 * «Телу» нужны итоги дня, и считаются они здесь, один раз: разойдись счёт между
 * разделами, человек увидел бы у себя два разных числа шагов за один день.
 *
 * Наружу уходит только то, что браслет измерил сам. Оценок, шкал и норм тут
 * нет и быть не может — их считает сервер, и спорить с ним этим числам не о чем.
 */
export function readingsOf(state: BandState, now = new Date()): BandReadings {
  const heart = seriesOf(state.today, (sample) => sample.heartRate ?? sample.averageHeartRate);
  const range = summaryOf(heart);
  const walk = walkOf(state.today);
  const stress = stressPoints(state.stress, startOfToday(now));

  // Последняя ночь, а не сумма за неделю: сложенные ночи не значат ничего.
  const night = state.sleep[state.sleep.length - 1];

  return {
    date: dayKey(now),
    updatedAt: now.toISOString(),
    live: state.stage === 'connected',

    // Шаги и метры — из одного источника. Устройство считает дневной итог само,
    // и взять шаги оттуда, а расстояние из поминутной истории значит показать
    // две цифры, которые между собой не сходятся.
    steps: state.summary?.totals.steps ?? walk?.steps,
    distanceMeters: state.summary?.totals.distance ?? walk?.distance,
    calories: state.summary?.totals.calories,
    activeMinutes: walk?.activeMinutes,

    heartRate: state.measurement?.heartRate ?? state.live?.heartRate ?? range?.last,
    restingHeartRate: lastOf(state, (sample) => sample.restingHeartRate),
    minHeartRate: range?.min,
    maxHeartRate: range?.max,

    bloodOxygen: state.measurement?.bloodOxygen ?? lastOf(state, (s) => s.bloodOxygen),
    hrv: state.measurement?.hrv ?? lastOf(state, (sample) => sample.hrv),
    stress: state.measurement?.stress ?? stress[stress.length - 1]?.value,

    sleepMinutes: night?.asleep,
    sleepEfficiency: night?.efficiency,

    // Ношение известно только при живой связи: вне её это не «снят», а
    // «неизвестно», и выдавать одно за другое нельзя.
    worn: state.stage === 'connected' ? state.worn : undefined,
  };
}

/** Последнее непустое значение показателя за день. */
function lastOf(
  state: BandState,
  pick: (sample: BandState['today'][number]) => number | undefined,
) {
  const points = seriesOf(state.today, pick);
  return points[points.length - 1]?.value;
}

/**
 * Опубликовать итоги дня.
 *
 * Вызывается после чтения устройства, а не на каждый живой отчёт: отчёты
 * приходят каждые десять секунд, и запись на диск с той же частотой ничего не
 * добавляет — минутные итоги между ними не меняются.
 */
export function publishReadings(state: BandState): void {
  setBandReadings(readingsOf(state));
}
