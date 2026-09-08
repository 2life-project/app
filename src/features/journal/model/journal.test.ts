import type { CalendarEvent } from '../api/contract';

import { detailTags, detailText, markable } from './journal';

const event = (extra: Partial<CalendarEvent>) => ({ status: 'planned', ...extra }) as CalendarEvent;

describe('markable', () => {
  it('запланированное можно отметить и снять отметку', () => {
    expect(markable(event({ status: 'planned' }))).toBe(true);
    expect(markable(event({ status: 'done' }))).toBe(true);
  });

  it('записанный факт не переключается: заметка не «не случилась»', () => {
    expect(markable(event({ status: 'recorded' }))).toBe(false);
  });

  it('незнакомый статус не трогаем — сервер знает о нём больше', () => {
    expect(markable(event({ status: 'cancelled' }))).toBe(false);
  });
});

describe('detailText и detailTags', () => {
  it('читают заметку, когда сервер её прислал', () => {
    const note = event({ detail: { text: 'Устал', tags: ['rest'] } });
    expect(detailText(note)).toBe('Устал');
    expect(detailTags(note)).toEqual(['rest']);
  });

  it('чужая форма detail не роняет экран и не выдумывает содержимое', () => {
    expect(detailText(event({ detail: null }))).toBeNull();
    expect(detailText(event({ detail: { text: 42 } }))).toBeNull();
    expect(detailText(event({ detail: { text: '' } }))).toBeNull();
    expect(detailTags(event({ detail: { tags: 'rest' } }))).toEqual([]);
    expect(detailTags(event({ detail: { tags: [1, 'rest'] } }))).toEqual(['rest']);
  });
});
