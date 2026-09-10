import { EVERY_DAY, WEEKDAYS, WEEKEND, Weekday } from '../api/alarms';

import {
  daysText,
  hasDay,
  isEmpty,
  parseTime,
  realAlarms,
  timeText,
  toggleDay,
} from './alarm-view';

describe('daysText', () => {
  it('привычные наборы называются словом, а не перечислением', () => {
    expect(daysText(EVERY_DAY)).toBe('Every day');
    expect(daysText(WEEKDAYS)).toBe('Weekdays');
    expect(daysText(WEEKEND)).toBe('Weekend');
  });

  it('пустая маска — разовый будильник, а не «никогда»', () => {
    expect(daysText(0)).toBe('Once');
  });

  it('произвольный набор перечисляется с понедельника', () => {
    expect(daysText(Weekday.sunday | Weekday.monday | Weekday.friday)).toBe('Mon, Fri, Sun');
  });

  it('маска будней из документации совпадает с нашей', () => {
    // 62 — значение из описания протокола для «будни».
    expect(WEEKDAYS).toBe(62);
  });
});

describe('toggleDay', () => {
  it('день включается и выключается', () => {
    const once = toggleDay(0, Weekday.monday);
    expect(hasDay(once, Weekday.monday)).toBe(true);
    expect(hasDay(toggleDay(once, Weekday.monday), Weekday.monday)).toBe(false);
  });

  it('соседние дни не задеваются', () => {
    const mask = toggleDay(WEEKDAYS, Weekday.monday);
    expect(hasDay(mask, Weekday.tuesday)).toBe(true);
    expect(hasDay(mask, Weekday.monday)).toBe(false);
  });
});

describe('timeText и parseTime', () => {
  it('время всегда с ведущим нулём', () => {
    expect(timeText(7, 5)).toBe('07:05');
  });

  it('разбор принимает и 7:30, и 07:30', () => {
    expect(parseTime('7:30')).toEqual({ hour: 7, minute: 30 });
    expect(parseTime('07:30')).toEqual({ hour: 7, minute: 30 });
  });

  it('несуществующее время не становится полуночью', () => {
    expect(parseTime('25:00')).toBeNull();
    expect(parseTime('12:60')).toBeNull();
    expect(parseTime('утром')).toBeNull();
    expect(parseTime('730')).toBeNull();
  });

  it('оборот время → текст → время ничего не меняет', () => {
    expect(parseTime(timeText(23, 59))).toEqual({ hour: 23, minute: 59 });
  });
});

describe('realAlarms', () => {
  const alarm = (extra: object) => ({
    slot: 1,
    enabled: false,
    hour: 0,
    minute: 0,
    days: 0,
    ...extra,
  });

  it('пустая ячейка устройства — не будильник', () => {
    expect(isEmpty(alarm({}))).toBe(true);
    expect(realAlarms([alarm({})])).toHaveLength(0);
  });

  it('выключенный будильник с временем остаётся будильником', () => {
    expect(isEmpty(alarm({ hour: 7, minute: 30 }))).toBe(false);
  });

  it('включённая полночь без дней — тоже будильник', () => {
    expect(isEmpty(alarm({ enabled: true }))).toBe(false);
  });
});
