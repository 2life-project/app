import { Placeholder, Screen, Stack, Text } from '@/shared/ui';

export const MetricScreenOptions = { title: 'Показатель' };

export function MetricScreen({ id }: { id: string }) {
  return (
    <Screen>
      <Stack gap="lg">
        <Text variant="caption" tone="muted">
          Идентификатор из маршрута: {id}
        </Text>
        <Placeholder note="Все графики показателя за период. Открывается по «Больше графиков» из системы." />
      </Stack>
    </Screen>
  );
}
