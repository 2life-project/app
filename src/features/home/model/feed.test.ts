import type { HomeLayout } from '../api/contract';

import { cellsOf } from './feed';

const layout: HomeLayout = {
  surface: 'mobile',
  schemaVersion: 1,
  revision: 0,
  layout: {
    dockWidth: 0.46,
    columns: [
      {
        id: 'main',
        size: 1,
        cells: [
          { id: 'vitals', widget: 'vitals', size: 0.9 },
          { id: 'plan', widget: 'rails', size: 1.1 },
        ],
      },
      { id: 'aside', size: 0.92, cells: [{ id: 'decisions', widget: 'decisions', size: 1.2 }] },
    ],
  },
  updatedAt: null,
  isDefault: true,
};

describe('лента Главной', () => {
  it('колонки складываются в одну ленту с сохранением порядка', () => {
    expect(cellsOf(layout).map((cell) => cell.widget)).toEqual(['vitals', 'rails', 'decisions']);
  });

  it('без раскладки лента пуста, а не падает', () => {
    expect(cellsOf(null)).toEqual([]);
  });
});
