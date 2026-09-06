import { StyleSheet, View } from 'react-native';

import { theme } from '@/shared/theme';
import {
  ActionLink,
  Card,
  IconTile,
  InfoCard,
  ListRow,
  RingPanel,
  Screen,
  ScreenHeader,
  Stack,
  Tag,
  Text,
  Toggle,
} from '@/shared/ui';

import { BAND, CARE, HAPTICS, MICROPHONE_NOTE, SENSORS, SYNC, UNPAIR } from '../model/device';

/** Шапки нет: в макете возврат стоит в содержимом, рядом с заголовком. */
export const DeviceScreenOptions = { headerShown: false };

/** Браслет: заряд, датчики, вибрация, синхронизация и уход. */
export function DeviceScreen() {
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
              subtitle={SYNC.last.subtitle}
              onPress={() => {}}
            />
            <ListRow
              leading={<IconTile name="download-cloud" tone="accent" size={SENSOR_ICON} />}
              title={SYNC.firmware.title}
              subtitle={SYNC.firmware.subtitle}
              trailingSlot={<ActionLink label={SYNC.firmware.action} onPress={() => {}} />}
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
          <Text variant="body" tone="danger" style={styles.unpair}>
            {UNPAIR}
          </Text>
        </Card>
      </Stack>
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
});
