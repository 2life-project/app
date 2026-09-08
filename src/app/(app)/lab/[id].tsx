import { Stack, useLocalSearchParams } from 'expo-router';

import { LabScreen, LabScreenOptions } from '@/features/records';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={LabScreenOptions} />
      <LabScreen id={id} />
    </>
  );
}
