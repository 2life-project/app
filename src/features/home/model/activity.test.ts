import { bandLabel } from './activity';

describe('bandLabel', () => {
  it('известный код — словами, незнакомый — по слову, пустой — ничего', () => {
    expect(bandLabel('almost_still')).toBe('Almost still');
    expect(bandLabel('super_charged')).toBe('Super charged');
    expect(bandLabel(null)).toBeUndefined();
  });
});
