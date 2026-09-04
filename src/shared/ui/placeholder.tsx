import type { ReactNode } from 'react';

import { Card } from './card';
import { Stack } from './stack';
import { Text } from './text';

export type PlaceholderProps = {
  /** Что здесь будет, когда экран соберут. Из макета, а не из фантазии. */
  note: string;
  /** Переходы, которые с этого экрана уже работают. */
  children?: ReactNode;
};

/**
 * Экран есть в навигации, содержимого пока нет. Временный компонент: он
 * исчезает по мере того, как экраны получают настоящую вёрстку.
 */
export function Placeholder({ note, children }: PlaceholderProps) {
  return (
    <Stack gap="lg">
      <Card variant="sunken">
        <Text tone="muted">{note}</Text>
      </Card>
      {children ? <Stack gap="sm">{children}</Stack> : null}
    </Stack>
  );
}
