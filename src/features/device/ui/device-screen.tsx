import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { size, space, theme } from '@/shared/theme';
import {
  ActionLink,
  BackButton,
  Card,
  IconTile,
  InfoCard,
  ListRow,
  ProgressRing,
  Screen,
  Stack,
  SummaryRow,
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
        <Stack direction="row" gap="md" align="center">
          <BackButton />
          <Stack gap="xs">
            <Text variant="headline">{BAND.name}</Text>
            <Text variant="bodySmall" tone="muted">
              {BAND.status}
            </Text>
          </Stack>
        </Stack>

        <Card>
          <Stack gap="md">
            <Stack direction="row" justify="space-between" align="center">
              <Stack direction="row" gap="sm" align="center">
                <Feather name="battery" size={size.icon.md} color={theme.color.text} />
                <Text variant="subtitle">Battery</Text>
              </Stack>
              <Tag label={BAND.chip} tone="success" dot />
            </Stack>

            <View style={styles.hero}>
              <ProgressRing
                size={RING}
                thickness={RING_THICKNESS}
                value={BAND.battery / 100}
                valueLabel={String(BAND.battery)}
                note="%"
                valueVariant="headline"
              />
              <View style={styles.heroRows}>
                {BAND.rows.map((row, index) => (
                  <SummaryRow key={row.id} {...row} divider={index > 0} />
                ))}
              </View>
            </View>
          </Stack>
        </Card>

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

const RING = 124;
const RING_THICKNESS = 12;
const SENSOR_ICON = 32;
const DOT = 8;

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  heroRows: { flex: 1 },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: theme.color.success.solid,
  },
  unpair: { textAlign: 'center' },
});
