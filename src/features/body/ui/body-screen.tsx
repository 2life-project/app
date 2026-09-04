import { router } from 'expo-router';
import { useState } from 'react';

import { to } from '@/shared/nav';
import { Button, Placeholder, Screen, Segmented, Stack, Text } from '@/shared/ui';

const SYSTEMS = [
  { value: 'heart', label: 'Сердце' },
  { value: 'breathing', label: 'Дыхание' },
  { value: 'recovery', label: 'Восстановление' },
  { value: 'composition', label: 'Состав тела' },
] as const;

type System = (typeof SYSTEMS)[number]['value'];

const NOTE: Record<System, string> = {
  heart: 'Пульс, вариабельность, давление. Кольцо с выбором показателя и графики.',
  breathing: 'Насыщение кислородом, частота дыхания, храп.',
  recovery: 'Сон по фазам, восстановление, готовность к нагрузке.',
  composition: 'Вес, состав тела, окружности.',
};

export function BodyScreen() {
  const [system, setSystem] = useState<System>('heart');

  return (
    <Screen>
      <Stack gap="lg">
        <Text variant="display">Тело</Text>
        <Segmented items={SYSTEMS} value={system} onChange={setSystem} />
        <Placeholder note={NOTE[system]}>
          <Button
            label="Больше графиков"
            variant="tonal"
            onPress={() => router.push(to.metric(system))}
          />
        </Placeholder>
      </Stack>
    </Screen>
  );
}
