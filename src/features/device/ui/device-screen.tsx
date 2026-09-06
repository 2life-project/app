import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { setBandConnected } from '@/shared/domain';
import { to } from '@/shared/nav';
import { theme } from '@/shared/theme';
import {
  ActionLink,
  Button,
  Card,
  IconTile,
  InfoCard,
  ListRow,
  Pressable,
  RingPanel,
  Screen,
  ScreenHeader,
  Sheet,
  Stack,
  Tag,
  Text,
  Toggle,
} from '@/shared/ui';

import {
  BAND,
  CARE,
  HAPTICS,
  MICROPHONE_NOTE,
  SENSORS,
  SYNC,
  TRACKER,
  UNPAIR,
} from '../model/device';

/** Шапки нет: в макете возврат стоит в содержимом, рядом с заголовком. */
export const DeviceScreenOptions = { headerShown: false };

/** Браслет: заряд, датчики, вибрация, синхронизация и уход. */
export function DeviceScreen({ kind }: { kind?: string }) {
  const [synced, setSynced] = useState<string>(SYNC.last.subtitle);
  const [firmware, setFirmware] = useState(false);

  if (kind && kind !== 'band') return <ThirdParty />;

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title={BAND.name} subtitle={BAND.status} />

        <RingPanel
          title="Battery"
          action={<Tag label={BAND.chip} tone="success" dot />}
          ring={{ value: BAND.battery / 100, valueLabel: String(BAND.battery), note: '%' }}
          rows={BAND.rows}
        />

        <Card>
          <Stack gap="sm">
            <Stack direction="row" justify="space-between" align="center">
              <Text variant="subtitle">Sensors</Text>
              <Text variant="bodySmall" tone="muted">
                all working
              </Text>
            </Stack>
            {SENSORS.map((sensor) => (
              <ListRow
                key={sensor.id}
                leading={<IconTile name={sensor.icon} tone={sensor.tone} size={SENSOR_ICON} />}
                title={sensor.title}
                subtitle={sensor.subtitle}
                trailingSlot={<View style={styles.dot} />}
              />
            ))}
            <Text variant="bodySmall" tone="muted">
              {MICROPHONE_NOTE}
            </Text>
          </Stack>
        </Card>

        <Card>
          <Stack gap="sm">
            <Text variant="subtitle">Notifications and haptic</Text>
            {HAPTICS.map((row) => (
              <ListRow
                key={row.id}
                title={row.title}
                subtitle={row.subtitle}
                trailingSlot={<Toggle value={row.on} accessibilityLabel={row.title} />}
              />
            ))}
          </Stack>
        </Card>

        <Card>
          <Stack gap="sm">
            <Text variant="subtitle">Sync and firmware</Text>
            <ListRow
              leading={<IconTile name="refresh-cw" tone="accent" size={SENSOR_ICON} />}
              title={SYNC.last.title}
              subtitle={synced}
              onPress={() => setSynced('just now')}
            />
            <ListRow
              leading={<IconTile name="download-cloud" tone="accent" size={SENSOR_ICON} />}
              title={SYNC.firmware.title}
              subtitle={SYNC.firmware.subtitle}
              trailingSlot={
                <ActionLink label={SYNC.firmware.action} onPress={() => setFirmware(true)} />
              }
            />
            <ListRow
              title={SYNC.background.title}
              subtitle={SYNC.background.subtitle}
              trailingSlot={
                <Toggle value={SYNC.background.on} accessibilityLabel={SYNC.background.title} />
              }
            />
          </Stack>
        </Card>

        <InfoCard
          title={CARE.title}
          text={CARE.text}
          link={{ label: CARE.link, onPress: () => {} }}
        />

        {/* Расставание с устройством — необратимое действие, и оно выглядит им. */}
        <Card variant="sunken">
          <Pressable
            accessibilityLabel={UNPAIR}
            onPress={() => {
              setBandConnected(false);
              router.back();
            }}>
            <Text variant="body" tone="danger" style={styles.unpair}>
              {UNPAIR}
            </Text>
          </Pressable>
        </Card>
      </Stack>

      <Sheet
        visible={firmware}
        onClose={() => setFirmware(false)}
        title="Firmware 1.5.0"
        action={<ActionLink label="Later" onPress={() => setFirmware(false)} />}>
        <Stack gap="md">
          <Text tone="muted">
            Sleep staging gets a new model, the silent alarm stops firing during a workout, and
            charging over 80% slows down to spare the cell.
          </Text>
          <Button label="Install now" onPress={() => setFirmware(false)} />
        </Stack>
      </Sheet>
    </Screen>
  );
}

const SENSOR_ICON = 32;
const DOT = 8;

const styles = StyleSheet.create({
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: theme.color.success.solid,
  },
  unpair: { textAlign: 'center' },
  fullWidth: { width: '100%' },
});

/**
 * Чужой трекер. Экран честно делится надвое: что мы правда получаем из его
 * облака и чего не будет никогда — доступ к самому устройству у его хозяина.
 */
function ThirdParty() {
  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title={TRACKER.name} subtitle={TRACKER.status} />

        <Card>
          <Stack gap="sm" align="flex-start">
            <Stack direction="row" justify="space-between" align="center" style={styles.fullWidth}>
              <Text variant="subtitle">Connection</Text>
              <Tag label={TRACKER.chip} tone="success" dot />
            </Stack>
            <Text tone="muted">{TRACKER.connection}</Text>
            {/* Настроить чужой трекер можно только в его приложении: у нас нет
                доступа к самому устройству, только к его облаку. */}
            <ActionLink label={TRACKER.link} chevron onPress={() => router.push(to.settings())} />
          </Stack>
        </Card>

        <Card>
          <Stack gap="sm">
            <Text variant="subtitle">What syncs</Text>
            {TRACKER.syncs.map((row) => (
              <ListRow
                key={row.id}
                leading={<IconTile name={row.icon} tone="accent" size={SENSOR_ICON} />}
                title={row.title}
                subtitle={row.subtitle}
              />
            ))}
          </Stack>
        </Card>

        <Card>
          <Stack gap="sm">
            <Text variant="subtitle">What you will not get</Text>
            {TRACKER.missing.map((row) => (
              <ListRow
                key={row.id}
                leading={<IconTile name="x" tone="neutral" size={SENSOR_ICON} />}
                title={row.title}
                subtitle={row.subtitle}
              />
            ))}
          </Stack>
        </Card>

        <InfoCard
          title={TRACKER.ours.title}
          text={TRACKER.ours.text}
          link={{ label: TRACKER.ours.action, onPress: () => router.push(to.device()) }}
        />

        <Card variant="sunken">
          <Pressable accessibilityLabel={TRACKER.disconnect} onPress={() => router.back()}>
            <Text variant="body" tone="danger" style={styles.unpair}>
              {TRACKER.disconnect}
            </Text>
          </Pressable>
        </Card>
      </Stack>
    </Screen>
  );
}
