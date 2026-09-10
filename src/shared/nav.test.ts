import { to } from './nav';

describe('адреса экранов', () => {
  it('корневые разделы совпадают с маршрутами группы табов', () => {
    expect(to.home()).toBe('/');
    expect(to.journal()).toBe('/journal');
    expect(to.body()).toBe('/body');
    expect(to.records()).toBe('/records');
    expect(to.protocols()).toBe('/protocols');
  });

  it('детальные экраны подставляют идентификатор', () => {
    expect(to.workout('42')).toBe('/workout/42');
    expect(to.workout('new', '2026-09-09')).toEqual({
      pathname: '/workout/[id]',
      params: { id: 'new', date: '2026-09-09' },
    });
    expect(to.lab('apob')).toBe('/lab/apob');
    expect(to.protocol('sleep')).toBe('/protocol/sleep');
  });
});
