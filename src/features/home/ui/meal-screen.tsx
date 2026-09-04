import { Placeholder, Screen, Stack, Text } from '@/shared/ui';

export const MealScreenOptions = { title: 'Приём пищи' };

export function MealScreen({ id }: { id: string }) {
  return (
    <Screen>
      <Stack gap="lg">
        <Text variant="caption" tone="muted">
          Идентификатор из маршрута: {id}
        </Text>
        <Placeholder note="Состав приёма, калории и макросы. Открывается тапом по приёму в разделе «Питание»." />
      </Stack>
    </Screen>
  );
}
