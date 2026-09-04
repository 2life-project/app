import { Link } from 'expo-router';

import { Screen, Stack, Text } from '@/shared/ui';

export default function NotFoundRoute() {
  return (
    <Screen scroll={false}>
      <Stack gap="md" grow justify="center" align="center">
        <Text variant="title">Такого экрана нет</Text>
        <Link href="/">
          <Text tone="accent">На главную</Text>
        </Link>
      </Stack>
    </Screen>
  );
}
