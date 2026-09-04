import { router } from 'expo-router';
import { useState } from 'react';

import { to } from '@/shared/nav';
import { Button, Placeholder, Screen, Segmented, Stack, Text } from '@/shared/ui';

const TABS = [
  { value: 'protocols', label: 'Протоколы' },
  { value: 'goals', label: 'Цели' },
] as const;

type ProtocolsTab = (typeof TABS)[number]['value'];

const NOTE: Record<ProtocolsTab, string> = {
  protocols: 'Активные протоколы и их прогресс.',
  goals: 'Цели и связанные с ними показатели.',
};

export function ProtocolsScreen() {
  const [tab, setTab] = useState<ProtocolsTab>('protocols');

  return (
    <Screen>
      <Stack gap="lg">
        <Text variant="display">Протоколы</Text>
        <Segmented items={TABS} value={tab} onChange={setTab} />
        <Placeholder note={NOTE[tab]}>
          {tab === 'protocols' ? (
            <Button
              label="Открыть протокол"
              variant="tonal"
              onPress={() => router.push(to.protocol('demo'))}
            />
          ) : null}
        </Placeholder>
      </Stack>
    </Screen>
  );
}
