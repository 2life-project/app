import { Stack } from 'expo-router';

import { SettingsScreen, SettingsScreenOptions } from '@/features/settings';

export default function Route() {
  return (
    <>
      <Stack.Screen options={SettingsScreenOptions} />
      <SettingsScreen />
    </>
  );
}
