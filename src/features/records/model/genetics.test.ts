import type { GeneticUpload } from '../api/contract';

import { latestParsed, sectionTitle } from './genetics';

const upload = (id: string, parsedAt: number | null): GeneticUpload => ({
  id,
  originalFilename: `${id}.txt`,
  sourceFormat: '23andme',
  sourceName: null,
  totalVariants: null,
  variantsWithRsid: null,
  parseStatus: parsedAt === null ? 'queued' : 'parsed',
  parseError: null,
  uploadedAt: 1,
  parsedAt,
});

describe('latestParsed', () => {
  it('берёт последнюю разобранную, а не последнюю загруженную', () => {
    expect(latestParsed([upload('old', 10), upload('fresh', null), upload('mid', 20)])?.id).toBe(
      'mid',
    );
  });

  it('без разобранных — ничего', () => {
    expect(latestParsed([upload('fresh', null)])).toBeNull();
  });
});

describe('sectionTitle', () => {
  it('делает из ключа заголовок', () => {
    expect(sectionTitle('cardio_health')).toBe('Cardio health');
  });
});
