import { ActivityIndicator } from 'react-native';

import type { PairedBand } from '@/shared/domain';
import { theme } from '@/shared/theme';
import { Banner, Button, Card, EmptyPanel, ListRow, Stack, Text } from '@/shared/ui';

import type { FoundBand } from '../api';
import type { BandState } from '../model/band-state';
import { signalText } from '../model/device-view';

import { ConnectSteps } from './connect-steps';
import { ForgetBand } from './forget-band';

/**
 * Подключение браслета.
 *
 * Устройство рекламирует себя с паузами, поэтому поиск не ограничен по времени
 * и не показывает «ничего не найдено» через пять секунд: чаще всего это значит,
 * что искали слишком мало, а не что браслета рядом нет.
 *
 * Каждый отказ назван своей причиной. «Не получилось» одинаково выглядит и при
 * выключенном Bluetooth, и при отозванном доступе, и при не поднявшемся радио —
 * а чинятся они тремя разными действиями.
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
  const problem = state.problem;

  if (problem === 'bluetooth-off' || problem === 'no-permission' || problem === 'radio-silent') {
    const text = TROUBLE[problem];
    return (
      <Banner
        tone="warning"
        checked={false}
        title={text.title}
        subtitle={text.subtitle}
        action={{ label: 'Search again', onPress: onScan }}
      />
    );
  }

  if (state.stage === 'connecting' || state.step !== undefined) {
    return (
      <Card>
        <Stack gap="lg">
          <Stack gap="xs">
            <Text variant="title">Connecting to {state.device?.name ?? 'the band'}</Text>
            <Text variant="bodySmall" tone="muted">
              Takes up to half a minute. Keep the band on your wrist.
            </Text>
          </Stack>
          <ConnectSteps current={state.step ?? 'opening'} />
        </Stack>
      </Card>
    );
  }

  // Привязанный браслет искать заново не нужно: телефон помнит его
  // идентификатор и подключается по нему напрямую.
  if (paired && state.stage !== 'scanning') {
    return (
      <Card>
        <Stack gap="md">
          <Stack direction="row" gap="sm" align="center">
            {state.retrying ? <ActivityIndicator color={theme.color.accent.solid} /> : null}
            <Text variant="title">{paired.name}</Text>
          </Stack>
          <Text variant="bodySmall" tone="muted">
            {/* Переподключение человек не начинал — и не должен решать, что
                приложение зависло. Об этом говорим отдельно от первого
                подключения и от отказа. */}
            {state.retrying
              ? 'Lost the connection — trying again on its own. Keep the band nearby.'
              : problem === 'connect-failed'
                ? 'Out of range, or another phone is holding it. It comes back on its own once it is near.'
                : 'Paired with this phone. It connects on its own.'}
          </Text>
          <Button label="Connect now" onPress={() => onConnect({ ...paired, rssi: 0 })} />
          <ForgetBand onForget={onForget} />
        </Stack>
      </Card>
    );
  }

  if (state.stage === 'idle' && state.found.length === 0) {
    return (
      <Stack gap="md">
        <EmptyPanel
          icon="watch"
          title="No band connected"
          text="Wear the band and start the search. It advertises itself in bursts, so it can take up to half a minute to appear."
        />
        <Button label="Find my band" onPress={onScan} />
      </Stack>
    );
  }

  const searching = state.stage === 'scanning';

  return (
    <Stack gap="md">
      {problem === 'connect-failed' ? (
        <Banner
          tone="danger"
          checked={false}
          title="Could not connect"
          subtitle="The band keeps one connection at a time — another phone or the maker’s app may hold it."
          action={{ label: 'Retry', onPress: onScan }}
        />
      ) : null}

      <Card>
        <Stack gap="sm">
          <Stack direction="row" gap="sm" align="center">
            {searching ? <ActivityIndicator color={theme.color.accent.solid} /> : null}
            <Text variant="title">{searching ? 'Searching…' : 'Found nearby'}</Text>
          </Stack>

          {state.found.length === 0 ? (
            <Text variant="bodySmall" tone="muted">
              Nothing yet. Keep the band close to the phone — it goes quiet between bursts.
            </Text>
          ) : null}

          {state.found.map((device) => (
            <ListRow
              key={device.id}
              title={device.name}
              subtitle={
                device.connected ? 'already connected to this phone' : signalText(device.rssi)
              }
              onPress={() => onConnect(device)}
            />
          ))}

          {searching ? null : <Button label="Search again" variant="plain" onPress={onScan} />}
        </Stack>
      </Card>
    </Stack>
  );
}

/** Три отказа поиска — три разных действия, а не одно «попробуйте ещё раз». */
const TROUBLE = {
  'bluetooth-off': {
    title: 'Bluetooth is off',
    subtitle: 'Turn it on in system settings, then search again.',
  },
  'no-permission': {
    title: 'No Bluetooth access',
    subtitle: 'Allow the app to use Bluetooth so it can find the band.',
  },
  'radio-silent': {
    title: 'Bluetooth is still starting',
    subtitle: 'The system has not answered yet. Try again in a moment.',
  },
} as const;
