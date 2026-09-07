import { Stack, useLocalSearchParams } from 'expo-router';

import { DeviceScreen, DeviceScreenOptions } from '@/features/device';

export default function Route() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();

  return (
    <>
      <Stack.Screen options={DeviceScreenOptions} />
      <DeviceScreen kind={kind} />
    </>
  );
}
