import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/core/auth';
import { to } from '@/shared/nav';

/**
 * Экраны входа. Свайп назад выключен: из входа возвращаться некуда, а из
 * регистрации он унёс бы уже набранную пару без единого следа на экране.
 */
export default function AuthLayout() {
  const session = useSession();

  // Вошедшему здесь делать нечего: сессия появилась — уходим в приложение.
  if (session.status === 'signed') return <Redirect href={to.home()} />;

  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />;
}
