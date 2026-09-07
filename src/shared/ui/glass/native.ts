/**
 * Сырые примитивы стекла. Реэкспорт нужен для санкционированных поверхностей,
 * которые не являются ни плашкой, ни кнопкой — например нативный таббар.
 *
 * `shared/ui/glass` — единственный модуль, которому линтер разрешает
 * импортировать `expo-glass-effect` и `expo-blur`. Обычная плашка берётся
 * через `<Glass>`, кнопка — через `<GlassButton>`.
 */
export { BlurView } from 'expo-blur';
export { GlassContainer, GlassView } from 'expo-glass-effect';
