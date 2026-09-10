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
    const input = workoutInput(fields({}), 'Europe/Moscow', NOW);

    expect(input?.event).toEqual({ kind: 'workout', typeKey: 'run', durationMinutes: 45 });
    expect(new Date(input?.startAt ?? '').getHours()).toBe(17);
    expect(input?.timezone).toBe('Europe/Moscow');
  });

  it('километры уезжают метрами, калории — целым числом', () => {
    const input = workoutInput(fields({ calories: '360', distanceKm: '5.2' }), 'UTC', NOW);

    expect(input?.event).toMatchObject({ caloriesKcal: 360, distanceMeter: 5200 });
  });

  // Пустая или нечитаемая форма не уезжает: сервер отверг бы её, а человек
  // увидел бы общий отказ вместо подсказки, что не так.
  it('нечитаемые поля дают null', () => {
    expect(workoutInput(fields({ time: '25:00' }), 'UTC', NOW)).toBeNull();
    expect(workoutInput(fields({ time: 'вечером' }), 'UTC', NOW)).toBeNull();
    expect(workoutInput(fields({ duration: '0' }), 'UTC', NOW)).toBeNull();
    expect(workoutInput(fields({ duration: '45.5' }), 'UTC', NOW)).toBeNull();
    expect(workoutInput(fields({ calories: 'many' }), 'UTC', NOW)).toBeNull();
  });
});
