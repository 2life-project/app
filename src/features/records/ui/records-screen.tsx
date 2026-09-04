import { router } from 'expo-router';
import { useState } from 'react';

import { to } from '@/shared/nav';
import { Button, Placeholder, Screen, Segmented, Stack, Text } from '@/shared/ui';

const TABS = [
  { value: 'chart', label: 'Медкарта' },
  { value: 'labs', label: 'Биохимия' },
] as const;

type RecordsTab = (typeof TABS)[number]['value'];

const NOTE: Record<RecordsTab, string> = {
  chart: 'Диагнозы, приёмы, документы и загрузка новых.',
  labs: 'Показатели анализов со статусами и историей.',
};

export function RecordsScreen() {
  const [tab, setTab] = useState<RecordsTab>('chart');

  return (
    <Screen>
      <Stack gap="lg">
        <Text variant="display">Медкарта</Text>
        <Segmented items={TABS} value={tab} onChange={setTab} />
        <Placeholder note={NOTE[tab]}>
          {tab === 'labs' ? (
            <Button
              label="Показатель"
              variant="tonal"
              onPress={() => router.push(to.lab('apob'))}
            />
          ) : null}
        </Placeholder>
      </Stack>
    </Screen>
  );
}
