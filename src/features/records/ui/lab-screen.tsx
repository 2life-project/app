import { Placeholder, Screen, Stack, Text } from '@/shared/ui';

export const LabScreenOptions = { title: 'Показатель биохимии' };

export function LabScreen({ id }: { id: string }) {
  return (
    <Screen>
      <Stack gap="lg">
        <Text variant="caption" tone="muted">
          Идентификатор из маршрута: {id}
        </Text>
        <Placeholder note="Значение, референс, динамика и объяснение. Открывается из списка биохимии." />
      </Stack>
    </Screen>
  );
}
