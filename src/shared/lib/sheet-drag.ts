/**
 * Куда шит уезжает, когда палец отпустили: обратно на место или за край.
 *
 * Решает не только пройденный путь, но и скорость: короткий быстрый смах —
 * это «закрой», а медленное протаскивание на треть высоты — тоже «закрой»,
 * потому что человек уже показал намерение. Всё остальное возвращается.
 */
const CLOSE_RATIO = 0.3;
const FLICK_VELOCITY = 800;

export function shouldCloseSheet(offset: number, height: number, velocity: number): boolean {
  // Правило считается прямо в жесте, то есть на UI-потоке: без этой пометки
  // функция остаётся на JS-потоке, и обращение к ней из жеста падает.
  'worklet';

  if (offset <= 0) return false;
  if (velocity > FLICK_VELOCITY) return true;
  return height > 0 && offset > height * CLOSE_RATIO;
}
