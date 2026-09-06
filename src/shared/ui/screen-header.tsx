import type { ReactNode } from 'react';

import { BackButton } from './back-button';
import { Stack } from './stack';
import { Text } from './text';

export type ScreenHeaderProps = {
  title: string;
  /** Строка под заголовком: дата, состояние, источник. */
  subtitle?: string;
  /** Справа: действие над экраном. */
  action?: ReactNode;
};

/**
 * Шапка экрана второго уровня: возврат, заголовок, строка под ним. Системную
 * шапку эти экраны не показывают — в макете возврат стоит в содержимом, а
 * прозрачная шапка iOS кладёт поверх своё стекло и гасит им заголовок.
 */
export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <Stack direction="row" gap="md" align="center">
      <BackButton />
      <Stack gap="xs" grow>
        <Text variant="headline">{title}</Text>
        {subtitle ? (
          <Text variant="bodySmall" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </Stack>
      {action}
    </Stack>
  );
}
