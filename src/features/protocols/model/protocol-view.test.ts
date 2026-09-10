import type { ProtocolBundle, Rule, Target } from '../api/contract';

import { isFinished, protocolParts, ruleSchedule, ruleTitle } from './protocol-view';

const bundle = (extra: Partial<ProtocolBundle>): ProtocolBundle =>
  ({
    protocol: { status: 'active' },
    rules: [],
    targets: [],
    recommendations: [],
    ...extra,
  }) as ProtocolBundle;

const rule = (extra: Partial<Rule>): Rule =>
  ({ type: 'daily_training', schedule: { kind: 'daily' }, ...extra }) as Rule;

describe('isFinished', () => {
  it('завершённые и снятые — в прошлом, незнакомый статус — нет', () => {
    expect(
      isFinished(bundle({ protocol: { status: 'completed' } as ProtocolBundle['protocol'] })),
    ).toBe(true);
    expect(
      isFinished(bundle({ protocol: { status: 'archived' } as ProtocolBundle['protocol'] })),
    ).toBe(true);
    expect(
      isFinished(bundle({ protocol: { status: 'paused' } as ProtocolBundle['protocol'] })),
    ).toBe(false);
    expect(
      isFinished(bundle({ protocol: { status: 'unheard_of' } as ProtocolBundle['protocol'] })),
    ).toBe(false);
  });
});

describe('protocolParts', () => {
  it('называет только то, что есть', () => {
    expect(protocolParts(bundle({}))).toBe('no details yet');
    expect(
      protocolParts(bundle({ rules: [rule({}), rule({})], targets: [{ id: 't' } as Target] })),
    ).toBe('2 rules · 1 targets');
  });
});

describe('правило словами', () => {
  it('расписание читается по полям, которые есть', () => {
    expect(ruleSchedule(rule({ schedule: { kind: 'daily', time: '21:00' } }))).toBe(
      'daily · 21:00',
    );
    expect(
      ruleSchedule(rule({ schedule: { kind: 'weekly', days: [1, 3], durationMinutes: 40 } })),
    ).toBe('days 1, 3 · 40 min');
    expect(ruleSchedule(rule({ schedule: { kind: 'once', date: '2026-09-12' } }))).toBe(
      '2026-09-12',
    );
  });

  it('вид правила становится названием', () => {
    expect(ruleTitle(rule({ type: 'supplement_plan' }))).toBe('supplement plan');
  });
});
