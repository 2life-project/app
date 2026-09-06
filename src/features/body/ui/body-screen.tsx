import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useBandConnected } from '@/shared/domain';
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

export function BodyScreen() {
  const connected = useBandConnected();

  if (!connected) return <NoBand />;

  return (
    <PagedScreen
      title="Body"
      subtitle="from your band · synced 2 min ago"
      sections={BODY_SECTIONS}
      pages={BODY_SECTIONS.map((section) => (
        <BodySystem key={section.value} section={section.value} />
      ))}
    />
  );
}

/**
 * Без браслета показывать нечего: четыре системы читаются с носимого
 * устройства. Экран не прячет разделы, а объясняет, что именно даёт браслет.
 */
function NoBand() {
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
        <ActionLink label="Enter measurements by hand" onPress={() => router.push(to.checkIn())} />

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
