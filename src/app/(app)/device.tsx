import { Stack } from 'expo-router';

import { BandScreen, BandScreenOptions } from '@/features/band';

export default function Route() {
  return (
    <>
      <Stack.Screen options={BandScreenOptions} />
      <BandScreen />
    </>
  );
}
