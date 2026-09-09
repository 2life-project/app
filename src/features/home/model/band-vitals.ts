import type { BandReadings } from '@/shared/domain';

/**
 * Что браслет измерил сам — строками для Главной.
 *
 * Здесь только то, чего сервер не считает и посчитать не может: пульс покоя,
 * его размах за сутки, вариабельность, кислород, стресс и прошлая ночь. Оценки
 * и нормы остаются серверными — эти числа с ними не спорят, а дополняют.
 *
 * Показатель без значения не превращается в прочерк, а исчезает: пустая строка
 * «HRV —» сообщает ровно то же, что её отсутствие, но занимает место и создаёт
 * впечатление поломки.
 */
export type Vital = { id: string; title: string; value: string; note?: string };

export function bandVitals(band: BandReadings | null): Vital[] {
  if (!band) return [];

  const vitals: Vital[] = [];

  if (band.restingHeartRate !== undefined) {
    vitals.push({
      id: 'resting',
      title: 'Resting heart rate',
      value: `${band.restingHeartRate} bpm`,
      note: range(band),
    });
  } else if (band.heartRate !== undefined) {
    vitals.push({
      id: 'heart',
      title: 'Heart rate',
      value: `${band.heartRate} bpm`,
      note: range(band),
    });
  }

  if (band.sleepMinutes !== undefined) {
    vitals.push({
      id: 'sleep',
      title: 'Last night',
      value: duration(band.sleepMinutes),
      note: band.sleepEfficiency === undefined ? undefined : `${band.sleepEfficiency}% efficiency`,
    });
  }

  if (band.hrv !== undefined) {
    vitals.push({ id: 'hrv', title: 'Heart rate variability', value: `${band.hrv} ms` });
  }

  if (band.bloodOxygen !== undefined) {
    vitals.push({ id: 'oxygen', title: 'Blood oxygen', value: `${band.bloodOxygen}%` });
  }

  if (band.stress !== undefined) {
    vitals.push({ id: 'stress', title: 'Stress', value: String(band.stress), note: 'out of 100' });
  }

  return vitals;
}

/** Размах пульса за сутки: одно число без него не говорит, много это или мало. */
function range(band: BandReadings): string | undefined {
  const { minHeartRate, maxHeartRate } = band;
  if (minHeartRate === undefined || maxHeartRate === undefined) return undefined;
  return `${minHeartRate}–${maxHeartRate} today`;
}

function duration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
