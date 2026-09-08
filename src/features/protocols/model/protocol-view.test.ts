import type { ProtocolBundle, Target } from '../api/contract';

import { isFinished, openTargets, protocolParts, protocolTitle } from './protocol-view';

const bundle = (protocol: unknown, extra: Partial<ProtocolBundle> = {}): ProtocolBundle =>
  ({ protocol, rules: [], targets: [], recommendations: [], ...extra }) as ProtocolBundle;

describe('protocolTitle', () => {
  it('берёт первое найденное название', () => {
    expect(protocolTitle(bundle({ title: 'Липиды' }))).toBe('Липиды');
    expect(protocolTitle(bundle({ name: 'Сон' }))).toBe('Сон');
    expect(protocolTitle(bundle({ goal: 'Снизить ApoB' }))).toBe('Снизить ApoB');
  });

  it('без названия ставит заглушку, а не пустую строку', () => {
    expect(protocolTitle(bundle({}))).toBe('Protocol');
    expect(protocolTitle(bundle(null))).toBe('Protocol');
    expect(protocolTitle(bundle({ title: '  ' }))).toBe('Protocol');
  });
});

describe('isFinished', () => {
  it('завершённым считаем только знакомые слова', () => {
    expect(isFinished(bundle({ status: 'finished' }))).toBe(true);
    expect(isFinished(bundle({ status: 'archived' }))).toBe(true);
    expect(isFinished(bundle({ status: 'active' }))).toBe(false);
  });

  it('незнакомый статус не убирает протокол из активных', () => {
    expect(isFinished(bundle({ status: 'paused_by_doctor' }))).toBe(false);
    expect(isFinished(bundle({}))).toBe(false);
  });
});

describe('protocolParts', () => {
  it('перечисляет только непустое', () => {
    const full = bundle({}, { rules: [1, 2], targets: [1] } as Partial<ProtocolBundle>);
    expect(protocolParts(full)).toBe('2 rules · 1 targets');
  });

  it('пустой протокол говорит об этом прямо', () => {
    expect(protocolParts(bundle({}))).toBe('no details yet');
  });
});

describe('openTargets', () => {
  it('в работе — активные', () => {
    const targets = [{ status: 'active' }, { status: 'achieved' }] as Target[];
    expect(openTargets(targets)).toHaveLength(1);
  });
});
