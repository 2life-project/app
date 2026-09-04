import { Placeholder, Screen, Stack, Text } from '@/shared/ui';

export const CourseScreenOptions = { title: 'Курс добавок' };

export function CourseScreen({ id }: { id: string }) {
  return (
    <Screen>
      <Stack gap="lg">
        <Text variant="caption" tone="muted">
          Идентификатор из маршрута: {id}
        </Text>
        <Placeholder note="Состав курса, расписание приёмов, история. Открывается из списка курсов." />
      </Stack>
    </Screen>
  );
}
