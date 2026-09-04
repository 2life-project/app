import { Placeholder, Screen } from '@/shared/ui';

export const CheckInScreenOptions = { title: 'Чек-ин вечера' };

export function CheckInScreen() {
  return (
    <Screen>
      <Placeholder note="Как прошёл день: самочувствие, сон, заметка. Вход — вечерняя плашка на Главной." />
    </Screen>
  );
}
