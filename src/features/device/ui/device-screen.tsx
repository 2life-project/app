import { Placeholder, Screen } from '@/shared/ui';

export const DeviceScreenOptions = { title: 'Устройство' };

export function DeviceScreen() {
  return (
    <Screen>
      <Placeholder note="Браслет 2Life или сторонний трекер: подключение, синхронизация, заряд." />
    </Screen>
  );
}
