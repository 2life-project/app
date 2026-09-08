import { Stack, useLocalSearchParams } from 'expo-router';

import { MetricScreen, MetricScreenOptions } from '@/features/body';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={MetricScreenOptions} />
      <MetricScreen id={id} />
    </>
  );
}
