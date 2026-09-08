import type { FoundBand } from '@/core/band';
import type { PairedBand } from '@/shared/domain';
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
  paired,
  onScan,
  onConnect,
  onForget,
}: {
  state: BandState;
  paired: PairedBand | null;
  onScan: () => void;
  onConnect: (device: FoundBand) => void;
  onForget: () => void;
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

  // Привязанный браслет искать заново не нужно: телефон помнит его
  // идентификатор и подключается по нему напрямую.
  if (paired && state.stage !== 'scanning') {
    return (
      <Card variant="sunken">
        <Stack gap="md">
          <Stack gap="xs">
            <Text variant="title">{paired.name}</Text>
            <Text variant="bodySmall" tone="muted">
              {state.problem === 'connect-failed'
                ? 'Out of range or held by another phone. It will connect as soon as it is nearby.'
                : 'Paired with this phone. Connecting happens on its own.'}
            </Text>
          </Stack>
          <Button label="Connect" onPress={() => onConnect({ ...paired, rssi: 0 })} />
          <Button label="Forget band" variant="plain" onPress={onForget} />
        </Stack>
      </Card>
    );
  }

  // Найденное до поиска — это уже подключённые устройства: их надо показать
  // сразу, иначе человек ищет то, что у него и так на связи.
  if (state.stage === 'idle' && state.found.length === 0) {
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

  const searching = state.stage === 'scanning';

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
          <Text variant="title">{searching ? 'Searching…' : 'Found nearby'}</Text>

          {state.found.length === 0 ? (
            <Text variant="bodySmall" tone="muted">
              Nothing yet. Keep the band close to the phone.
            </Text>
          ) : null}

          {state.found.map((device) => (
            <ListRow
              key={device.id}
              title={device.name}
              subtitle={subtitle(device)}
              onPress={() => onConnect(device)}
            />
          ))}

          {searching ? null : <Button label="Search again" variant="plain" onPress={onScan} />}
        </Stack>
      </Card>
    </Stack>
  );
}

/** Чем устройство подписано в списке: адрес, сила сигнала или готовая связь. */
function subtitle(device: FoundBand): string {
  if (device.connected) return 'already connected to this phone';
  return device.mac ?? `signal ${device.rssi} dBm`;
}
