import { onSignOut } from '@/core/auth';

import { clearSnapshot } from './band-data';
import { clearHistory } from './history-store';
import { clearWorkouts } from './workout-store';

/**
 * Показания браслета уходят вместе с человеком.
 *
 * Снимок раздела, архив суток и записанные занятия — это то, что намерило
 * тело одного конкретного человека. Телефоном пользуются двое, и второй не
 * должен увидеть чужую ночь и чужой пульс, даже если браслет остался тот же.
 *
 * Сама привязка к устройству остаётся: браслет принадлежит телефону, а не
 * аккаунту (docs/decisions.md), и переподключать его после каждого входа
 * человек не должен.
 */
onSignOut(() => {
  clearSnapshot();
  void clearHistory().catch(() => undefined);
  void clearWorkouts().catch(() => undefined);
});
