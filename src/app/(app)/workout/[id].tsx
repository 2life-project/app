import { Stack, useLocalSearchParams } from 'expo-router';

import { WorkoutScreen, WorkoutScreenOptions } from '@/features/home';

export default function Route() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();

  return (
    <>
      <Stack.Screen options={WorkoutScreenOptions} />
      <WorkoutScreen id={id} date={date} />
    </>
  );
}
