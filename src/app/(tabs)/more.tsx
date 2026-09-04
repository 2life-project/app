import { EmptyState, Screen, Stack, Text } from '@/shared/ui';

export default function MoreRoute() {
  return (
    <Screen>
      <Stack gap="lg">
        <Text variant="display">Ещё</Text>
        <EmptyState title="Раздел ещё не собран" description="Медкарта, протоколы и настройки." />
      </Stack>
    </Screen>
  );
}
