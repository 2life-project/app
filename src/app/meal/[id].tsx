import { Stack, useLocalSearchParams } from 'expo-router';

import { MealScreen, MealScreenOptions } from '@/features/home';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={MealScreenOptions} />
      <MealScreen id={id} />
    </>
  );
}
