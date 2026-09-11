import { retryDelay } from './link';

describe('retryDelay', () => {
  // Первая попытка почти сразу — обрыв чаще всего мгновенный; дальше реже,
  // а после последней ступени пауза не растёт: минута — потолок.
  it('растёт по ступеням и упирается в минуту', () => {
    expect(retryDelay(0)).toBe(1_000);
    expect(retryDelay(1)).toBe(5_000);
    expect(retryDelay(4)).toBe(60_000);
    expect(retryDelay(40)).toBe(60_000);
  });
});
