import { Placeholder, Screen } from '@/shared/ui';

export const WidgetsScreenOptions = { title: 'Настроить виджеты' };

export function WidgetsScreen() {
  return (
    <Screen>
      <Placeholder note="Порядок и состав виджетов ленты. Вход — карандаш в шапке Главной." />
    </Screen>
  );
}
