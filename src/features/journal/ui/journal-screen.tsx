import { Placeholder, Screen, Stack, Text } from '@/shared/ui';

export const JournalScreenOptions = { title: 'Журнал' };

export function JournalScreen() {
  return (
    <Screen>
      <Stack gap="lg">
        <Text variant="display">Журнал</Text>
        <Placeholder note="Календарь с действиями, агенда дня, слои. Единственный источник задач." />
      </Stack>
    </Screen>
  );
}
