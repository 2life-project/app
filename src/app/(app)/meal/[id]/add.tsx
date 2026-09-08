import { Stack, useLocalSearchParams } from 'expo-router';

import { AddFoodScreen, AddFoodScreenOptions } from '@/features/home';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={AddFoodScreenOptions} />
      <AddFoodScreen meal={id ?? ''} />
    </>
  );
}
