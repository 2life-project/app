import { EmptyState, Screen, Stack, Text } from '@/shared/ui';

export default function BodyRoute() {
  return (
    <Screen>
      <Stack gap="lg">
        <Text variant="display">Тело</Text>
        <EmptyState
          title="Раздел ещё не собран"
          description="Восстановление, сердце, дыхание и состав тела появятся здесь."
        />
      </Stack>
    </Screen>
  );
}
