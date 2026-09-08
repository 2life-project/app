import { Stack } from 'expo-router';

import { CheckInScreen, CheckInScreenOptions } from '@/features/home';

export default function Route() {
  return (
    <>
      <Stack.Screen options={CheckInScreenOptions} />
      <CheckInScreen />
    </>
  );
}
