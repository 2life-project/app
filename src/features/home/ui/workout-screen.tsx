import { Placeholder, Screen, Stack, Text } from '@/shared/ui';

export const WorkoutScreenOptions = { title: 'Тренировка' };

export function WorkoutScreen({ id }: { id: string }) {
  return (
    <Screen>
      <Stack gap="lg">
        <Text variant="caption" tone="muted">
          Идентификатор из маршрута: {id}
        </Text>
        <Placeholder note="Тип, длительность, зоны пульса, нагрузка. Экран открывается тапом по тренировке в разделе «Активность»." />
      </Stack>
    </Screen>
  );
}
