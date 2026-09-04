import { Stack, useLocalSearchParams } from 'expo-router';

import { ProtocolScreen, ProtocolScreenOptions } from '@/features/protocols';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={ProtocolScreenOptions} />
      <ProtocolScreen id={id} />
    </>
  );
}
