import { customWidgetOf } from './custom-widget';

const recipe = { title: 'Weight', kind: 'line', metrics: [] };

describe('customWidgetOf', () => {
  it('читает виджет, когда сервер прислал рецепт и значения', () => {
    const view = customWidgetOf({ recipe, metrics: [] });

    expect(view?.recipe.title).toBe('Weight');
    expect(view?.metrics).toEqual([]);
  });

  // Именно так сервер отвечает на ячейки `create` и `empty`; с `custom`
  // приложение из-за этого закрывалось.
  it('отказывается читать пустые данные', () => {
    expect(customWidgetOf(null)).toBeNull();
    expect(customWidgetOf(undefined)).toBeNull();
  });

  it('отказывается читать данные чужого виджета', () => {
    expect(customWidgetOf({ items: [], done: 0, total: 3 })).toBeNull();
    expect(customWidgetOf({ status: 'unavailable', data: null, error: 'x' })).toBeNull();
  });

  it('отказывается от рецепта без вида и от значений не массивом', () => {
    expect(customWidgetOf({ recipe: { title: 'Weight' }, metrics: [] })).toBeNull();
    expect(customWidgetOf({ recipe: { title: 'Weight', kind: 'pie' }, metrics: [] })).toBeNull();
    expect(customWidgetOf({ recipe, metrics: null })).toBeNull();
  });
});
