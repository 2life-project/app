import { Stack } from 'expo-router';

import { DeviceScreen, DeviceScreenOptions } from '@/features/device';

export default function Route() {
  return (
    <>
      <Stack.Screen options={DeviceScreenOptions} />
      <DeviceScreen />
    </>
  );
}
