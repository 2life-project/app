import type { PairedBand } from '@/shared/domain';
import { Banner, Button, Card, ListRow, Stack, Text } from '@/shared/ui';

import type { FoundBand } from '../api';
import type { BandState } from '../model/band-state';

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
        title="Bluetooth выключен"
        subtitle="Включите его в настройках системы и повторите поиск."
        action={{ label: 'Искать', onPress: onScan }}
      />
    );
  }

  if (state.problem === 'no-permission') {
    return (
      <Banner
        tone="warning"
        title="Нет доступа к поиску"
        subtitle="Разрешите приложению доступ к Bluetooth, чтобы найти браслет."
        action={{ label: 'Искать', onPress: onScan }}
      />
    );
  }

  // Радио не ответило за отведённое время. Это не отказ в правах и не
  // выключенный Bluetooth — стек ещё поднимается, и повтор обычно срабатывает.
  if (state.problem === 'radio-silent') {
    return (
      <Banner
        tone="warning"
        title="Bluetooth ещё не готов"
        subtitle="Система пока не ответила. Повторите поиск через мгновение."
        action={{ label: 'Искать', onPress: onScan }}
      />
    );
  }

  if (state.stage === 'connecting') {
    return (
      <Card variant="sunken">
        <Stack gap="xs">
          <Text variant="title">Connecting to {state.device?.name ?? 'band'}…</Text>
          <Text variant="bodySmall" tone="muted">
            Браслет держит одно соединение. Закройте приложение производителя, если оно его заняло.
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
                ? 'Вне зоны или занят другим телефоном. Подключится, как только окажется рядом.'
                : 'Привязан к этому телефону. Подключение произойдёт само.'}
            </Text>
          </Stack>
          <Button label="Подключить" onPress={() => onConnect({ ...paired, rssi: 0 })} />
          <Button label="Забыть браслет" variant="plain" onPress={onForget} />
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
            <Text variant="title">Браслет не подключён</Text>
            <Text variant="bodySmall" tone="muted">
              Wear the band and start the search. It advertises itself in bursts, so it may take up
              to half a minute.
            </Text>
          </Stack>
          <Button label="Искать браслет" onPress={onScan} />
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
          title="Не удалось подключиться"
          subtitle="Браслет может быть занят другим телефоном."
          action={{ label: 'Повторить', onPress: onScan }}
        />
      ) : null}

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="title">{searching ? 'Ищем…' : 'Найдено рядом'}</Text>

          {state.found.length === 0 ? (
            <Text variant="bodySmall" tone="muted">
              Пока пусто. Держите браслет рядом с телефоном.
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

          {searching ? null : <Button label="Искать снова" variant="plain" onPress={onScan} />}
        </Stack>
      </Card>
    </Stack>
  );
}

/** Чем устройство подписано в списке: адрес, сила сигнала или готовая связь. */
function subtitle(device: FoundBand): string {
  if (device.connected) return 'уже подключён к этому телефону';
  return device.mac ?? `сигнал ${device.rssi} dBm`;
}
