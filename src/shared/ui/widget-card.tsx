import type { ReactNode } from 'react';

import { ActionLink } from './action-link';
import { Card } from './card';
import { Stack } from './stack';
import { Text } from './text';

export type WidgetCardProps = {
  title: string;
  /** Строка под заголовком: «1 из 3 принято сегодня». */
  caption?: string;
  /** Ссылка справа в шапке виджета. */
  action?: { label: string; onPress: () => void; chevron?: boolean };
  children: ReactNode;
};

/**
 * Карточка виджета ленты: шапка с заголовком и ссылкой плюс содержимое.
 * Все виджеты Главной собраны на ней — иначе шапка расходится по отступам
 * и выравниванию от виджета к виджету.
 */
export function WidgetCard({ title, caption, action, children }: WidgetCardProps) {
  return (
    <Card padding="lg">
      <Stack gap="widget">
        <Stack direction="row" justify="space-between" align={caption ? 'flex-start' : 'center'}>
          <Stack gap="xs">
            <Text variant="subtitle">{title}</Text>
            {caption ? (
              <Text variant="bodySmall" tone="muted">
                {caption}
              </Text>
            ) : null}
          </Stack>
          {action ? <ActionLink {...action} /> : null}
        </Stack>
        {children}
      </Stack>
    </Card>
  );
}
