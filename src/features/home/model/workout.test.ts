import { workoutInput } from './workout';

const NOW = new Date(2026, 8, 10, 12, 0, 0);

const fields = (extra: Partial<Parameters<typeof workoutInput>[0]>) => ({
  typeKey: 'run',
  time: '17:05',
  duration: '45',
  calories: '',
  distanceKm: '',
  ...extra,
});

describe('workoutInput', () => {
  it('собирает событие сегодняшнего дня из времени и длительности', () => {
    const input = workoutInput(fields({}), 'Europe/Moscow', undefined, NOW);

    expect(input?.event).toEqual({ kind: 'workout', typeKey: 'run', durationMinutes: 45 });
    expect(new Date(input?.startAt ?? '').getHours()).toBe(17);
    expect(input?.timezone).toBe('Europe/Moscow');
  });

  it('километры уезжают метрами, калории — целым числом', () => {
    const input = workoutInput(
      fields({ calories: '360', distanceKm: '5.2' }),
      'UTC',
      undefined,
      NOW,
    );

    expect(input?.event).toMatchObject({ caloriesKcal: 360, distanceMeter: 5200 });
  });

  // Пустая или нечитаемая форма не уезжает: сервер отверг бы её, а человек
  // увидел бы общий отказ вместо подсказки, что не так.
  it('нечитаемые поля дают null', () => {
    expect(workoutInput(fields({ time: '25:00' }), 'UTC', undefined, NOW)).toBeNull();
    expect(workoutInput(fields({ time: 'вечером' }), 'UTC', undefined, NOW)).toBeNull();
    expect(workoutInput(fields({ duration: '0' }), 'UTC', undefined, NOW)).toBeNull();
    expect(workoutInput(fields({ duration: '45.5' }), 'UTC', undefined, NOW)).toBeNull();
    expect(workoutInput(fields({ calories: 'many' }), 'UTC', undefined, NOW)).toBeNull();
  });

  // Из журнала тренировку добавляют в выбранный день, а не в сегодняшний.
  it('выбранный день записывается в его дату', () => {
    const input = workoutInput(fields({}), 'UTC', '2026-09-08', NOW);
    const at = new Date(input?.startAt ?? '');

    expect([at.getFullYear(), at.getMonth() + 1, at.getDate(), at.getHours()]).toEqual([
      2026, 9, 8, 17,
    ]);
  });
});
