import { Card } from './card';
import { Stack } from './stack';
import { Text } from './text';

export type EmptyStateProps = {
  title: string;
  description: string;
};

/** Честная заглушка: раздел есть в навигации, экрана пока нет. */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card variant="sunken">
      <Stack gap="sm">
        <Text variant="subtitle">{title}</Text>
        <Text tone="muted">{description}</Text>
      </Stack>
    </Card>
  );
}
