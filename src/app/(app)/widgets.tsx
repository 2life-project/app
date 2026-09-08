import { Stack } from 'expo-router';

import { WidgetsScreen, WidgetsScreenOptions } from '@/features/home';

export default function Route() {
  return (
    <>
      <Stack.Screen options={WidgetsScreenOptions} />
      <WidgetsScreen />
    </>
  );
}
