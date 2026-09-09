import { SETTING_GROUPS, thresholdValue, visibleGroups, writeOf } from './settings-view';

/** Найти настройку по имени в общем списке: тесты не должны знать порядок групп. */
function item(id: string) {
  const found = SETTING_GROUPS.flatMap((group) => group.items).find((entry) => entry.id === id);
  if (!found) throw new Error(`нет настройки ${id}`);
  return found;
}

describe('visibleGroups', () => {
  it('настройка без требований к возможностям видна всегда', () => {
    const ids = visibleGroups([]).flatMap((group) => group.items.map((entry) => entry.id));
    expect(ids).toContain('continuousHeartRate');
  });

  it('давление скрыто, пока устройство о нём не заявило', () => {
    const ids = visibleGroups([]).flatMap((group) => group.items.map((entry) => entry.id));
    expect(ids).not.toContain('autoBloodPressure');
  });

  it('заявленная возможность открывает свои настройки', () => {
    const ids = visibleGroups(['bloodPressure']).flatMap((group) =>
      group.items.map((entry) => entry.id),
    );
    expect(ids).toContain('autoBloodPressure');
    expect(ids).toContain('bloodPressureInterval');
  });

  it('группа без единой доступной настройки не показывается пустой', () => {
    for (const group of visibleGroups([])) expect(group.items.length).toBeGreaterThan(0);
  });
});

describe('writeOf', () => {
  it('переключатель меняет своё же поле ответа', () => {
    expect(writeOf(item('continuousHeartRate'), { on: true }).optimistic).toEqual({
      continuousHeartRate: true,
    });
  });

  it('интервал уезжает числом минут', () => {
    expect(writeOf(item('heartRateInterval'), { amount: 30 }).optimistic).toEqual({
      heartRateInterval: 30,
    });
  });

  it('порог пульса возвращается полем bpm', () => {
    expect(writeOf(item('heartRateHighLimit'), { on: true, amount: 150 }).optimistic).toEqual({
      heartRateHighLimit: { enabled: true, bpm: 150 },
    });
  });

  it('порог кислорода — полем percent, а не bpm', () => {
    expect(writeOf(item('oxygenLowLimit'), { on: true, amount: 90 }).optimistic).toEqual({
      oxygenLowLimit: { enabled: true, percent: 90 },
    });
  });

  it('без значения берётся нижняя граница, а не ноль', () => {
    const optimistic = writeOf(item('heartRateHighLimit'), { on: true }).optimistic;
    expect(optimistic).toEqual({ heartRateHighLimit: { enabled: true, bpm: 100 } });
  });
});

describe('thresholdValue', () => {
  it('оба имени поля читаются одинаково', () => {
    expect(thresholdValue({ enabled: true, bpm: 140 })).toEqual({ enabled: true, amount: 140 });
    expect(thresholdValue({ enabled: false, percent: 92 })).toEqual({ enabled: false, amount: 92 });
  });

  it('непрочитанный порог остаётся непрочитанным, а не нулевым', () => {
    expect(thresholdValue(undefined)).toBeUndefined();
  });
});
