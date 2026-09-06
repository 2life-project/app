import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';

import { size, theme } from '@/shared/theme';

import { GlassButton } from './glass-button';

/**
 * Возврат кнопкой в содержимом, а не системной шапкой. Прозрачная шапка iOS
 * всё равно кладёт поверх контента своё стекло и гасит им заголовок экрана —
 * а заголовок в этих экранах стоит первой строкой, как в макете.
 */
export function BackButton() {
  return (
    <GlassButton size="sm" accessibilityLabel="Назад" onPress={() => router.back()}>
      <Feather name="chevron-left" size={size.icon.md} color={theme.color.text} />
    </GlassButton>
  );
}
