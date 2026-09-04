import { greetingFor } from './greeting';

const at = (hour: number) => new Date(2026, 0, 1, hour, 0, 0);

describe('greetingFor', () => {
  it('делит сутки на четыре части по границам 5 / 12 / 18', () => {
    expect(greetingFor(at(0))).toBe('Доброй ночи');
    expect(greetingFor(at(4))).toBe('Доброй ночи');
    expect(greetingFor(at(5))).toBe('Доброе утро');
    expect(greetingFor(at(11))).toBe('Доброе утро');
    expect(greetingFor(at(12))).toBe('Добрый день');
    expect(greetingFor(at(17))).toBe('Добрый день');
    expect(greetingFor(at(18))).toBe('Добрый вечер');
    expect(greetingFor(at(23))).toBe('Добрый вечер');
  });
});
