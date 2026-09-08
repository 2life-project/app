import { StyleSheet } from 'react-native';

import { type FoundBand, isOurBand } from '@/core/band';
import { space } from '@/shared/theme';
import { Banner, Button, Card, ListRow, Stack, Text } from '@/shared/ui';

import type { BandState } from '../model/use-band';

/**
 * Подключение браслета.
 *
 * Устройство рекламирует себя с паузами, поэтому поиск не ограничен по времени
 * и не показывает «ничего не найдено» через пять секунд: чаще всего это значит,
 * что искали слишком мало, а не что браслета рядом нет.
 */
export function BandConnect({
  state,
  onScan,
  onConnect,
}: {
  state: BandState;
  onScan: () => void;
  onConnect: (device: FoundBand) => void;
}) {
  if (state.problem === 'bluetooth-off') {
    return (
      <Banner
        tone="warning"
        title="Bluetooth is off"
        subtitle="Turn it on in system settings, then search again."
        action={{ label: 'Search', onPress: onScan }}
      />
    );
  }

  if (state.problem === 'no-permission') {
    return (
      <Banner
        tone="warning"
        title="No permission to search"
        subtitle="Allow Bluetooth access for the app to find the band."
        action={{ label: 'Search', onPress: onScan }}
      />
    );
  }

  if (state.stage === 'connecting') {
    return (
      <Card variant="sunken">
        <Stack gap="xs">
          <Text variant="title">Connecting to {state.device?.name ?? 'band'}…</Text>
          <Text variant="bodySmall" tone="muted">
            The band keeps a single connection. Close the vendor app if it holds it.
          </Text>
        </Stack>
      </Card>
    );
  }

  if (state.stage === 'idle') {
    return (
      <Card variant="sunken">
        <Stack gap="md">
          <Stack gap="xs">
            <Text variant="title">Band is not connected</Text>
            <Text variant="bodySmall" tone="muted">
              Wear the band and start the search. It advertises itself in bursts, so it may take up
              to half a minute.
            </Text>
          </Stack>
          <Button label="Search for band" onPress={onScan} />
        </Stack>
      </Card>
    );
  }

  const ours = state.found.filter(isOurBand);
  const others = state.found.filter((device) => !isOurBand(device));

  return (
    <Stack gap="md">
      {state.problem === 'connect-failed' ? (
        <Banner
          tone="danger"
          title="Could not connect"
          subtitle="The band may still be paired with another phone."
          action={{ label: 'Try again', onPress: onScan }}
        />
      ) : null}

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="title">Searching…</Text>

          {ours.length === 0 && others.length === 0 ? (
            <Text variant="bodySmall" tone="muted">
              Nothing yet. Keep the band close to the phone.
            </Text>
          ) : null}

          {ours.map((device) => (
            <ListRow
              key={device.id}
              title={device.name}
              subtitle={device.mac ?? `signal ${device.rssi} dBm`}
              onPress={() => onConnect(device)}
            />
          ))}

          {others.length > 0 ? (
            <Stack gap="xs" style={styles.others}>
              <Text variant="bodySmall" tone="muted">
                Other devices nearby
              </Text>
              {others.slice(0, 4).map((device) => (
                <ListRow
                  key={device.id}
                  title={device.name}
                  subtitle={`signal ${device.rssi} dBm`}
                  onPress={() => onConnect(device)}
                />
              ))}
            </Stack>
          ) : null}
        </Stack>
      </Card>
    </Stack>
  );
}

const styles = StyleSheet.create({
  others: {
    marginTop: space.sm,
  },
});
