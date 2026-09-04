import { EmptyState, Screen, Stack, Text } from '@/shared/ui';

export default function JournalRoute() {
  return (
    <Screen>
      <Stack gap="lg">
        <Text variant="display">Журнал</Text>
        <EmptyState
          title="Раздел ещё не собран"
          description="День, задачи и записи MEMO. Журнал — единственный источник задач."
        />
      </Stack>
    </Screen>
  );
}
