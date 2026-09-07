import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useBandConnected } from '@/shared/domain';
import { useToday } from '@/shared/lib/day';
import { to } from '@/shared/nav';
import { radius, theme } from '@/shared/theme';
import {
  ActionLink,
  Button,
  Card,
  EmptyPanel,
  ListRow,
  PagedScreen,
  Screen,
  Stack,
  Text,
} from '@/shared/ui';

import { BODY_SECTIONS, NO_BAND } from '../model/systems';

import { BodySystem } from './body-system';
import { ManualPicker } from './manual-picker';

export function BodyScreen() {
  const { date, timeZone } = useToday();
  const connected = useBandConnected();

  if (!connected) return <NoBand />;

  return (
    <PagedScreen
      title="Body"
      subtitle="from your band"
      sections={BODY_SECTIONS}
      pages={BODY_SECTIONS.map((section) => (
        <BodySystem
          key={section.value}
          section={section.value}
          date={date}
          timeZone={timeZone}
          fallback={
            <Card variant="sunken">
              <Text tone="muted">Loading this system…</Text>
            </Card>
          }
        />
      ))}
    />
  );
}

/**
 * Без браслета показывать нечего: четыре системы читаются с носимого
 * устройства. Экран не прячет разделы, а объясняет, что именно даёт браслет.
 */
function NoBand() {
  const [manualOpen, setManualOpen] = useState(false);

  return (
    <Screen>
      <Stack gap="md">
        <Stack gap="xs">
          <Text variant="display">Body</Text>
          <Text variant="bodySmall" tone="muted">
            no band connected
          </Text>
        </Stack>

        <EmptyPanel icon="watch" title={NO_BAND.title} text={NO_BAND.text} />

        <Button label="Connect a device" onPress={() => router.push(to.device())} />
        {/* Состав тела — единственная система, которую ведут без браслета:
            вес, рост и обхваты измеряют не им. */}
        <ActionLink label="Enter measurements by hand" onPress={() => setManualOpen(true)} />
        <ManualPicker
          subsystem="composition"
          visible={manualOpen}
          onClose={() => setManualOpen(false)}
        />

        <Card>
          <Stack gap="sm">
            <Text variant="subtitle">What a band unlocks</Text>
            {NO_BAND.features.map((feature) => (
              <ListRow
                key={feature.id}
                leading={
                  <View
                    style={[styles.dot, { backgroundColor: theme.color[feature.tone].solid }]}
                  />
                }
                title={feature.title}
                subtitle={feature.subtitle}
              />
            ))}
          </Stack>
        </Card>
      </Stack>
    </Screen>
  );
}

const DOT = 8;

const styles = StyleSheet.create({
  dot: { width: DOT, height: DOT, borderRadius: radius.full },
});
