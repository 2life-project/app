import {
  Button,
  Card,
  EmptyPanel,
  ListRow,
  Screen,
  ScreenHeader,
  Stack,
  Tag,
  Text,
} from '@/shared/ui';

import { PAIRING } from '../model/device';
import { useBand } from '../model/use-band';

/**
 * Привязка браслета. Список — всё, что рядом отвечает по Bluetooth и называет
 * себя: пока признак нашего браслета в эфире не известен, фильтр спрятал бы
 * ровно то, что ищут. Ближайшее сверху — браслет на руке всегда сильнее
 * соседского телевизора.
 */
export function PairScreen() {
  const band = useBand();

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title={PAIRING.title} subtitle={PAIRING.subtitle} />

        {!band.ready && !band.unknown ? (
          <EmptyPanel icon="bluetooth" title={PAIRING.off.title} text={PAIRING.off.text} />
        ) : null}

        {band.error ? (
          <Card variant="sunken">
            <Text tone="danger">{PAIRING.errors[band.error] ?? PAIRING.errors.scan}</Text>
          </Card>
        ) : null}

        {band.found.length > 0 ? (
          <Card>
            <Stack gap="sm">
              <Stack direction="row" justify="space-between" align="center">
                <Text variant="subtitle">{PAIRING.found}</Text>
                {band.scanning ? <Tag label="SEARCHING" tone="accent" dot /> : null}
              </Stack>
              {band.found.map((device) => (
                <ListRow
                  key={device.id}
                  title={device.name}
                  subtitle={`${device.rssi} dBm`}
                  onPress={() => void band.pair(device)}
                />
              ))}
            </Stack>
          </Card>
        ) : (
          <EmptyPanel
            icon="watch"
            title={band.scanning ? PAIRING.searching.title : PAIRING.idle.title}
            text={band.scanning ? PAIRING.searching.text : PAIRING.idle.text}
          />
        )}

        <Button
          label={band.scanning ? PAIRING.stop : PAIRING.start}
          disabled={!band.ready}
          onPress={() => (band.scanning ? band.stop() : void band.scan())}
        />

        <Text variant="bodySmall" tone="muted">
          {PAIRING.note}
        </Text>
      </Stack>
    </Screen>
  );
}
