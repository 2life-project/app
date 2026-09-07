import type { HomeLayout, LayoutCell } from '../api/contract';

/**
 * Лента Главной задана сервером: раскладка называет, какие виджеты показывать
 * и в каком порядке. Поэтому экран её не выдумывает — он её читает.
 *
 * Колонки складываются в одну ленту: на телефоне сервер и так присылает одну,
 * но если прилетит раскладка на две (её редактируют с большого экрана),
 * порядок сохранится, а не потеряется вместе со второй колонкой.
 */
export function cellsOf(layout: HomeLayout | null): readonly LayoutCell[] {
  if (!layout) return [];
  return layout.layout.columns.flatMap((column) => column.cells);
}
