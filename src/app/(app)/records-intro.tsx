import { Stack } from 'expo-router';

import { RecordsIntroScreen, RecordsIntroScreenOptions } from '@/features/records';

export default function Route() {
  return (
    <>
      <Stack.Screen options={RecordsIntroScreenOptions} />
      <RecordsIntroScreen />
    </>
  );
}
