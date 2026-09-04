import { Placeholder, Screen } from '@/shared/ui';

export const SettingsScreenOptions = { title: 'Настройки' };

export function SettingsScreen() {
  return (
    <Screen>
      <Placeholder note="Аккаунт, согласия, источники данных, экспорт и удаление." />
    </Screen>
  );
}
