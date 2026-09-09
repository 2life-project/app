import { batteryText, clockSkewText, featureLabels, storageText } from './device-view';

describe('clockSkewText', () => {
  it('расхождение меньше минуты — это синхронные часы', () => {
    expect(clockSkewText(12)).toContain('in sync');
    expect(clockSkewText(-59)).toContain('in sync');
  });

  it('знак различает отставание и спешку: это разные объяснения', () => {
    expect(clockSkewText(-412)).toContain('behind');
    expect(clockSkewText(412)).toContain('ahead');
  });

  it('расхождение переводится в минуты и часы', () => {
    expect(clockSkewText(-412)).toContain('6 min');
    expect(clockSkewText(-3600)).toContain('1 h');
    expect(clockSkewText(-3900)).toContain('1 h 5 min');
  });

  it('неизмеренное расхождение не выдумывается', () => {
    expect(clockSkewText(null)).toBeNull();
    expect(clockSkewText(undefined)).toBeNull();
  });
});

describe('storageText', () => {
  it('свободные килобайты переводятся в часы записи', () => {
    // 105 298 КБ при 2000 байт в секунду — около пятнадцати часов.
    const text = storageText({ totalKb: 105519, freeKb: 105298, bytesPerSecond: 2000 });
    expect(text).toContain('14 h');
    expect(text).toContain('100%');
  });

  it('доля считается от полного объёма', () => {
    expect(storageText({ totalKb: 100, freeKb: 50, bytesPerSecond: 2000 })).toContain('50%');
  });

  it('забитая память показывает ноль, а не пустоту', () => {
    expect(storageText({ totalKb: 100, freeKb: 0, bytesPerSecond: 2000 })).toContain('0 s');
  });

  it('непрочитанная память не выдумывается', () => {
    expect(storageText(undefined)).toBeNull();
  });
});

describe('batteryText', () => {
  it('зарядка называется отдельно: падающий процент при ней — не проблема', () => {
    expect(batteryText({ level: 94, charging: false })).toBe('94%');
    expect(batteryText({ level: 94, charging: true })).toBe('94% · charging');
  });

  it('непрочитанный заряд — прочерк, а не ноль процентов', () => {
    expect(batteryText(undefined)).toBe('—');
  });
});

describe('featureLabels', () => {
  it('показываются только те возможности, у которых есть человеческое имя', () => {
    expect(featureLabels(['audioRecorder', 'bloodPressure'])).toEqual([
      'Voice recorder',
      'Blood pressure estimate',
    ]);
  });

  it('служебные биты наружу не выходят', () => {
    expect(featureLabels(['noScreen', 'twoWaySettings', 'extendedHistory'])).toEqual([]);
  });
});
