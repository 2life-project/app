import { Stack } from 'expo-router';

import { AssistantScreen, AssistantScreenOptions } from '@/features/assistant';

export default function Route() {
  return (
    <>
      <Stack.Screen options={AssistantScreenOptions} />
      <AssistantScreen />
    </>
  );
}
