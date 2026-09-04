import { Placeholder, Screen, Stack, Text } from '@/shared/ui';

export const ProtocolScreenOptions = { title: 'Протокол' };

export function ProtocolScreen({ id }: { id: string }) {
  return (
    <Screen>
      <Stack gap="lg">
        <Text variant="caption" tone="muted">
          Идентификатор из маршрута: {id}
        </Text>
        <Placeholder note="Шаги протокола, прогресс, связанные показатели." />
      </Stack>
    </Screen>
  );
}
