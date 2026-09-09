import { Screen, ScreenHeader, Stack } from '@/shared/ui';

import { BandPanel } from './band-panel';

/** Шапки нет: возврат стоит в содержимом, как на остальных экранах второго уровня. */
export const BandScreenOptions = { headerShown: false };

/**
 * Браслет отдельным экраном. Тот же раздел, что и на Главной: на него ведут
 * настройки, «Тело» и виджеты, и заводить для них второе представление
 * устройства — это ровно тот дубль, из-за которого удалён прежний экран.
 */
export function BandScreen() {
  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title="Устройство" />
        <BandPanel />
      </Stack>
    </Screen>
  );
}
