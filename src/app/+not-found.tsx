import { Link } from 'expo-router';
import { Pressable } from 'react-native';

import { Screen, Stack, Text } from '@/shared/ui';

export default function NotFoundRoute() {
  return (
    <Screen scroll={false}>
      <Stack gap="md" grow justify="center" align="center">
        <Text variant="title">This screen does not exist</Text>
        {/* Единственный выход с экрана. Строка текста даёт зону нажатия ниже
            минимальных 44pt — разницу добирает hitSlop. */}
        <Link href="/" asChild>
          <Pressable accessibilityRole="link" hitSlop={16}>
            <Text tone="accent">Go home</Text>
          </Pressable>
        </Link>
      </Stack>
    </Screen>
  );
}
