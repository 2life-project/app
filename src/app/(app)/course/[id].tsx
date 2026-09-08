import { Stack, useLocalSearchParams } from 'expo-router';

import { CourseScreen, CourseScreenOptions } from '@/features/home';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={CourseScreenOptions} />
      <CourseScreen id={id} />
    </>
  );
}
